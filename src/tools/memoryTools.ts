import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { pool } from '../db.js';
import { getEmbedding } from '../embedding.js';
import { chunkText } from '../utils/text.js';
import { saveMemory } from '../services/memoryService.js';
import { INITIALIZATION_SKILL_PROMPT } from '../utils/initializationPrompt.js';
import * as fs from 'fs';
import * as path from 'path';

export function registerMemoryTools(server: McpServer) {
    server.registerTool("initialize_workspace", {
        description: "Returns the Second Brain Initialization Skill instructions to the agent to start bootstrapping a workspace with strict structure.",
        inputSchema: {
            project_name: z.string().describe("The name of the project to initialize"),
        }
    }, async ({ project_name }) => {
        return {
            content: [{
                type: "text",
                text: `You are now in "Second Brain Bootstrap Specialist" mode. Project: ${project_name}\n\nPlease follow these instructions to transform this workspace into a Second Brain:\n\n` + INITIALIZATION_SKILL_PROMPT
            }]
        };
    });

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
            memory_type: z.string().optional().default('concept').describe("Mandatory categories: 'system', 'concept', 'summary'"),
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

    server.registerTool("delete_memory", {
        description: "Delete specific memories or all memories from a source.",
        inputSchema: {
            project_name: z.string().describe("The target project"),
            id: z.string().optional().describe("Specific memory ID to delete"),
            source: z.string().optional().describe("Delete all memories associated with this source (e.g., filename)")
        }
    }, async ({ project_name, id, source }) => {
        if (!id && !source) {
            return {
                content: [{ type: "text", text: "Error: You must provide either an ID or a source to delete." }],
                isError: true
            };
        }

        let result;
        if (id) {
            result = await pool.query(
                'DELETE FROM memories WHERE id = $1 AND project_name = $2',
                [id, project_name]
            );
        } else {
            result = await pool.query(
                'DELETE FROM memories WHERE source = $1 AND project_name = $2',
                [source, project_name]
            );
        }

        return {
            content: [{ type: "text", text: `Deleted ${result.rowCount} record(s) from project '${project_name}'.` }]
        };
    });

    server.registerTool("ingest_file", {
        description: "Read a local file and ingest its content. Large files are automatically chunked.",
        inputSchema: {
            project_name: z.string().describe("The target project"),
            file_path: z.string().describe("Absolute path to the file to ingest"),
            memory_type: z.string().optional().default('file_ingest').describe("Type of memory. For raw data, use 'file_ingest'.")
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
}
