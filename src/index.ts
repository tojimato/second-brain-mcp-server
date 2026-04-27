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
    version: "1.0.0"
});

// Register Tools
server.registerTool("search_memory", {
    description: "Search for relevant memories (concepts, summaries, decisions) in a specific project using semantic search.",
    inputSchema: {
        project_name: z.string().describe("The name of the project to search within"),
        query: z.string().describe("The search query"),
        limit: z.number().optional().default(5).describe("Max number of results to return")
    }
}, async ({ project_name, query, limit }) => {
    const queryEmbedding = await getEmbedding(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;
    
    const result = await pool.query(
        `SELECT id, content, memory_type, created_at, 1 - (embedding <=> $1::vector) as similarity
         FROM memories
         WHERE project_name = $2
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        [vectorString, project_name, limit]
    );

    return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
    };
});

server.registerTool("create_memory", {
    description: "Store durable, high-signal knowledge (decisions, SOPs, bug patterns) for a project.",
    inputSchema: {
        project_name: z.string().describe("The target project"),
        content: z.string().describe("The knowledge content to store"),
        memory_type: z.string().optional().default('general').describe("Category: 'architecture', 'decision', 'sop', 'bug_pattern', 'concept', 'summary'")
    }
}, async ({ project_name, content, memory_type }) => {
    const embedding = await getEmbedding(content);
    const vectorString = `[${embedding.join(',')}]`;

    const result = await pool.query(
        `INSERT INTO memories (content, embedding, project_name, memory_type)
         VALUES ($1, $2::vector, $3, $4) RETURNING id`,
        [content, vectorString, project_name, memory_type]
    );

    return {
        content: [{ type: "text", text: `Memory created successfully. ID: ${result.rows[0].id}` }]
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
        `SELECT id, content, memory_type, created_at
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
    description: "Read a local file and ingest its content as memory for a specific project.",
    inputSchema: {
        project_name: z.string().describe("The target project"),
        file_path: z.string().describe("Absolute path to the file to ingest"),
        memory_type: z.string().optional().default('file_ingest').describe("Type of memory")
    }
}, async ({ project_name, file_path, memory_type }) => {
    const content = fs.readFileSync(path.resolve(file_path), 'utf8');
    
    const embedding = await getEmbedding(content);
    const vectorString = `[${embedding.join(',')}]`;

    const result = await pool.query(
        `INSERT INTO memories (content, embedding, project_name, memory_type)
         VALUES ($1, $2::vector, $3, $4) RETURNING id`,
        [content, vectorString, project_name, memory_type]
    );

    return {
        content: [{ type: "text", text: `File ingested successfully. ID: ${result.rows[0].id}` }]
    };
});

async function main() {
    console.error("Initializing Second Brain database...");
    await initDb();
    
    console.error("Starting MCP Server over Stdio...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Second Brain Server is running.");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});

