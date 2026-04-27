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

        // Helper to sanitize labels
        const sanitizeLabel = (text: string) => {
            return text.substring(0, 50)
                .replace(/^#+\s*/, '') // Remove markdown headers
                .replace(/[\n\r]/g, " ")
                .replace(/"/g, "'")
                .trim();
        };

        // Create ID mapping for memories to reduce Mermaid code noise
        const idMap = new Map<string, string>();
        memories.forEach((m, idx) => {
            idMap.set(m.id, `m${idx + 1}`);
        });

        let mermaid = "graph LR\n";

        // Group by type using subgraphs
        const byType: Record<string, any[]> = {};
        memories.forEach(m => {
            const type = m.memory_type || 'general';
            if (!byType[type]) byType[type] = [];
            byType[type].push(m);
        });

        for (const [type, items] of Object.entries(byType)) {
            mermaid += `\n  subgraph ${type.toUpperCase()}\n`;
            items.forEach(m => {
                const shortId = idMap.get(m.id);
                const label = sanitizeLabel(m.content);
                const fullLabel = `"${label}${m.content.length > 50 ? '...' : ''}"`;
                
                // Different shapes based on type
                let shape = `[${fullLabel}]`; // default
                if (type === 'summary') shape = `{{${fullLabel}}}`;
                if (type === 'sop') shape = `[[${fullLabel}]]`;
                if (type === 'concept') shape = `([${fullLabel}])`;
                
                mermaid += `    ${shortId}${shape}\n`;
            });
            mermaid += `  end\n`;
        }

        // Add external concepts (from links) in their own subgraph
        const concepts = new Set<string>();
        links.forEach(l => concepts.add(l.target_concept));

        if (concepts.size > 0) {
            mermaid += `\n  subgraph EXTERNAL_CONCEPTS\n`;
            concepts.forEach(c => {
                const conceptId = `c_${c.replace(/[^a-zA-Z0-9]/g, "_")}`;
                mermaid += `    ${conceptId}(("${c}"))\n`;
            });
            mermaid += `  end\n`;
        }

        // Connections
        links.forEach(l => {
            const mId = idMap.get(l.source_id);
            const cId = `c_${l.target_concept.replace(/[^a-zA-Z0-9]/g, "_")}`;
            mermaid += `  ${mId} --> ${cId}\n`;
        });

        // Styling
        mermaid += "\n  classDef summary fill:#d4f7d4,stroke:#333,stroke-width:1px;\n";
        mermaid += "  classDef sop fill:#d4e6f7,stroke:#333,stroke-width:1px;\n";
        mermaid += "  classDef concept fill:#fff3cd,stroke:#333,stroke-width:1px;\n";
        mermaid += "  classDef extConcept fill:#f9f,stroke:#333,stroke-width:2px;\n";

        if (byType['summary']) mermaid += `  class ${byType['summary'].map(m => idMap.get(m.id)).join(',')} summary;\n`;
        if (byType['sop']) mermaid += `  class ${byType['sop'].map(m => idMap.get(m.id)).join(',')} sop;\n`;
        if (byType['concept']) mermaid += `  class ${byType['concept'].map(m => idMap.get(m.id)).join(',')} concept;\n`;
        if (concepts.size > 0) mermaid += `  class ${Array.from(concepts).map(c => `c_${c.replace(/[^a-zA-Z0-9]/g, "_")}`).join(',')} extConcept;\n`;

        return {
            content: [{ type: "text", text: mermaid }]
        };
    });
}
