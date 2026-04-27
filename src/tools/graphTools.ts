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
            `SELECT id, source, memory_type FROM memories WHERE project_name = $1`,
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

        // Helper to clean labels (remove extensions and sanitize)
        const cleanLabel = (text: string) => {
            return text
                .replace(/\.(md|json|txt|pdf)$/i, '')
                .replace(/[\n\r]/g, " ")
                .replace(/"/g, "'")
                .trim();
        };

        // 1. Group memories by source and type to consolidate chunks
        const groups: Record<string, { source: string, type: string, originalIds: string[] }> = {};
        memories.forEach(m => {
            const source = m.source || 'Unknown_Source';
            const type = m.memory_type || 'general';
            const key = `${source}|${type}`;
            if (!groups[key]) {
                groups[key] = { source, type, originalIds: [] };
            }
            groups[key].originalIds.push(m.id);
        });

        // 2. Create mapping from original UUID to a consolidated node ID
        // AND mapping from concept name to node ID (for merging)
        const idMap = new Map<string, string>();
        const conceptToNodeMap = new Map<string, string>();
        const consolidatedNodes: any[] = [];

        Object.values(groups).forEach((g, idx) => {
            const label = cleanLabel(g.source);
            const safeSource = label.replace(/[^a-zA-Z0-9]/g, "_");
            const nodeId = `f${idx + 1}_${safeSource}`;

            consolidatedNodes.push({ nodeId, source: label, type: g.type });
            g.originalIds.forEach(id => idMap.set(id, nodeId));

            // Map the concept name (slugified and original) to this node
            conceptToNodeMap.set(label.toLowerCase(), nodeId);
            conceptToNodeMap.set(g.source.toLowerCase(), nodeId);
        });

        let mermaid = "graph LR\n";

        // 3. Group by type using subgraphs
        const byType: Record<string, any[]> = {};
        consolidatedNodes.forEach(n => {
            if (!byType[n.type]) byType[n.type] = [];
            byType[n.type].push(n);
        });

        for (const [type, nodes] of Object.entries(byType)) {
            mermaid += `\n  subgraph ${type.toUpperCase()}\n`;
            nodes.forEach(n => {
                const fullLabel = `"${n.source}"`;

                // Different shapes based on type
                let shape = `[${fullLabel}]`; // default
                if (type === 'summary') shape = `{{${fullLabel}}}`;
                if (type === 'sop') shape = `[[${fullLabel}]]`;
                if (type === 'concept') shape = `([${fullLabel}])`;

                mermaid += `    ${n.nodeId}${shape}\n`;
            });
            mermaid += `  end\n`;
        }

        // 4. Connections (Consolidated unique edges - Only between existing file nodes)
        const drawnEdges = new Set<string>();
        links.forEach(l => {
            const mNodeId = idMap.get(l.source_id);
            const target = l.target_concept.toLowerCase();

            // Only draw link if the target concept matches an existing file node
            const tNodeId = conceptToNodeMap.get(target);

            if (mNodeId && tNodeId && mNodeId !== tNodeId) {
                const edgeKey = `${mNodeId}-->${tNodeId}`;
                if (!drawnEdges.has(edgeKey)) {
                    mermaid += `  ${mNodeId} --> ${tNodeId}\n`;
                    drawnEdges.add(edgeKey);
                }
            }
        });

        // 5. Styling
        mermaid += "\n  classDef summary fill:#d4f7d4,stroke:#333,stroke-width:1px;\n";
        mermaid += "  classDef sop fill:#d4e6f7,stroke:#333,stroke-width:1px;\n";
        mermaid += "  classDef concept fill:#fff3cd,stroke:#333,stroke-width:1px;\n";

        if (byType['summary']) mermaid += `  class ${byType['summary'].map(n => n.nodeId).join(',')} summary;\n`;
        if (byType['sop']) mermaid += `  class ${byType['sop'].map(n => n.nodeId).join(',')} sop;\n`;
        if (byType['concept']) mermaid += `  class ${byType['concept'].map(n => n.nodeId).join(',')} concept;\n`;

        return {
            content: [{ type: "text", text: mermaid }]
        };
    });





}
