import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { pool } from '../db.js';

export function registerGraphTools(server: McpServer) {
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

    server.registerTool("get_graph_visual", {
        description: "Generate a Mermaid graph visualization of the project's memories and their relationships.",
        inputSchema: {
            project_name: z.string().describe("The name of the project to visualize")
        }
    }, async ({ project_name }) => {
        // 1. Fetch memories
        const memoriesResult = await pool.query(
            `SELECT id, content, memory_type FROM memories WHERE project_name = $1`,
            [project_name]
        );

        // 2. Fetch links
        const linksResult = await pool.query(
            `SELECT l.source_id, l.target_concept 
             FROM memory_links l
             JOIN memories m ON l.source_id = m.id
             WHERE m.project_name = $1`,
            [project_name]
        );

        const memories = memoriesResult.rows;
        const links = linksResult.rows;

        if (memories.length === 0) {
            return {
                content: [{ type: "text", text: "No memories found for this project." }]
            };
        }

        let mermaid = "graph TD\n";

        // Add nodes for memories
        memories.forEach(m => {
            const truncatedContent = m.content.substring(0, 50)
                .replace(/[\n\r]/g, " ")
                .replace(/"/g, "'")
                .trim();
            const label = `[${m.memory_type}] ${truncatedContent}${m.content.length > 50 ? '...' : ''}`;
            const safeId = `mem_${m.id.replace(/-/g, "_")}`;
            mermaid += `  ${safeId}["${label}"]\n`;
        });

        // Add edges and concept nodes
        const concepts = new Set<string>();
        links.forEach(l => {
            const sourceId = `mem_${l.source_id.replace(/-/g, "_")}`;
            const conceptId = `concept_${l.target_concept.replace(/[^a-zA-Z0-9]/g, "_")}`;
            mermaid += `  ${sourceId} --> ${conceptId}\n`;
            concepts.add(l.target_concept);
        });

        // Add style/labels for concepts
        concepts.forEach(c => {
            const conceptId = `concept_${c.replace(/[^a-zA-Z0-9]/g, "_")}`;
            mermaid += `  ${conceptId}(("${c}"))\n`;
        });

        // Add some basic styling
        mermaid += "\n  classDef concept fill:#f9f,stroke:#333,stroke-width:2px;\n";
        if (concepts.size > 0) {
            mermaid += "  class " + Array.from(concepts).map(c => `concept_${c.replace(/[^a-zA-Z0-9]/g, "_")}`).join(",") + " concept;\n";
        }

        return {
            content: [{ type: "text", text: mermaid }]
        };
    });
}
