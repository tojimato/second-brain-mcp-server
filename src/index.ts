import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { pool, initDb } from './db.js';
import { getEmbedding } from './embedding.js';
import * as fs from 'fs';
import * as path from 'path';

// Create the MCP Server
const server = new McpServer({
    name: "mcp-second-brain",
    version: "1.1.0"
});

// Helper Functions
function chunkText(text: string, size: number = 1500, overlap: number = 200): string[] {
    if (text.length <= size) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = start + size;
        if (end < text.length) {
            const lastSpace = text.lastIndexOf(' ', end);
            const lastNewline = text.lastIndexOf('\n', end);
            const breakpoint = Math.max(lastSpace, lastNewline);
            if (breakpoint > start + (size / 2)) {
                end = breakpoint;
            }
        } else {
            end = text.length;
        }
        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
        if (start < 0) start = 0;
        if (end >= text.length) break;
    }
    return chunks;
}

function extractLinks(text: string): string[] {
    const regex = /\[\[(.*?)\]\]/g;
    const links = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
        links.add(match[1].trim());
    }
    return Array.from(links);
}

async function saveMemory(project_name: string, content: string, memory_type: string, source?: string) {
    const embedding = await getEmbedding(content);
    const vectorString = `[${embedding.join(',')}]`;

    const result = await pool.query(
        `INSERT INTO memories (content, embedding, project_name, memory_type, source)
         VALUES ($1, $2::vector, $3, $4, $5) RETURNING id`,
        [content, vectorString, project_name, memory_type, source]
    );

    const memoryId = result.rows[0].id;
    const links = extractLinks(content);
    for (const link of links) {
        await pool.query(
            `INSERT INTO memory_links (source_id, target_concept) VALUES ($1, $2)`,
            [memoryId, link]
        );
    }
    return memoryId;
}

// Register Tools
server.registerTool("search_memory", {
    description: "Search for relevant memories using semantic search with optional similarity threshold.",
    inputSchema: {
        project_name: z.string().describe("The name of the project to search within"),
        query: z.string().describe("The search query"),
        limit: z.number().optional().default(5).describe("Max number of results to return"),
        min_similarity: z.number().optional().default(0.5).describe("Minimum similarity score (0.0 to 1.0)")
    }
}, async ({ project_name, query, limit, min_similarity }) => {
    const queryEmbedding = await getEmbedding(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;
    
    const result = await pool.query(
        `SELECT id, content, memory_type, source, created_at, 1 - (embedding <=> $1::vector) as similarity
         FROM memories
         WHERE project_name = $2 AND (1 - (embedding <=> $1::vector)) >= $4
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        [vectorString, project_name, limit, min_similarity]
    );

    return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
    };
});

server.registerTool("create_memory", {
    description: "Store durable knowledge. Large content will be automatically chunked.",
    inputSchema: {
        project_name: z.string().describe("The target project"),
        content: z.string().describe("The knowledge content to store"),
        memory_type: z.string().optional().default('general').describe("Category: 'architecture', 'decision', 'sop', 'bug_pattern', 'concept', 'summary'"),
        source: z.string().optional().describe("Optional source tag (URL, filename, etc.)")
    }
}, async ({ project_name, content, memory_type, source }) => {
    const chunks = chunkText(content);
    const ids = [];
    for (const chunk of chunks) {
        const id = await saveMemory(project_name, chunk, memory_type, source);
        ids.push(id);
    }

    return {
        content: [{ type: "text", text: `Memory created successfully. ${chunks.length} chunk(s) stored. IDs: ${ids.join(', ')}` }]
    };
});

server.registerTool("get_recent_context", {
    description: "Fetch the most recently added or updated context for a specific project.",
    inputSchema: {
        project_name: z.string().describe("The target project"),
        limit: z.number().optional().default(10).describe("Number of records")
    }
}, async ({ project_name, limit }) => {
    const result = await pool.query(
        `SELECT id, content, memory_type, source, created_at
         FROM memories
         WHERE project_name = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [project_name, limit]
    );

    return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
    };
});

server.registerTool("ingest_file", {
    description: "Read a local file and ingest its content. Large files are automatically chunked.",
    inputSchema: {
        project_name: z.string().describe("The target project"),
        file_path: z.string().describe("Absolute path to the file to ingest"),
        memory_type: z.string().optional().default('file_ingest').describe("Type of memory")
    }
}, async ({ project_name, file_path, memory_type }) => {
    const fullPath = path.resolve(file_path);
    const content = fs.readFileSync(fullPath, 'utf8');
    const source = path.basename(fullPath);

    // Sync Logic: Delete old memories from this source for this project before re-ingesting
    await pool.query(
        'DELETE FROM memories WHERE project_name = $1 AND source = $2',
        [project_name, source]
    );

    const chunks = chunkText(content);
    const ids = [];
    for (const chunk of chunks) {
        const id = await saveMemory(project_name, chunk, memory_type, source);
        ids.push(id);
    }

    return {
        content: [{ type: "text", text: `File ingested successfully. ${chunks.length} chunk(s) stored. Source: ${source}` }]
    };
});

server.registerTool("get_graph_connections", {
    description: "Find memories that explicitly link to a specific concept via the links table (backlinks).",
    inputSchema: {
        project_name: z.string().describe("The target project"),
        concept_name: z.string().describe("The concept name to find backlinks for (e.g., 'marketing-strategy')")
    }
}, async ({ project_name, concept_name }) => {
    const result = await pool.query(
        `SELECT m.id, m.content, m.memory_type, m.source, m.created_at
         FROM memories m
         JOIN memory_links l ON m.id = l.source_id
         WHERE m.project_name = $1 AND l.target_concept = $2
         ORDER BY m.created_at DESC`,
        [project_name, concept_name]
    );

    return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
    };
});

async function main() {
    await initDb();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});

