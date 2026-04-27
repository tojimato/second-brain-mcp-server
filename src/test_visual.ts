import { initDb, pool } from './db';

async function testVisual() {
    try {
        console.log("Initializing DB...");
        await initDb();

        const projectName = "VisualTest";
        
        // Cleanup old test data
        await pool.query('DELETE FROM memories WHERE project_name = $1', [projectName]);

        // 1. Create a concept definition with source
        console.log("Creating Test Memories...");
        const result1 = await pool.query(
            `INSERT INTO memories (content, project_name, memory_type, source) VALUES ($1, $2, $3, $4) RETURNING id`,
            ["[[Project-Phoenix]] is our main initiative.", projectName, 'concept', 'concepts/phoenix.md']
        );
        const mem1Id = result1.rows[0].id;
        
        await pool.query(
            `INSERT INTO memory_links (source_id, target_concept) VALUES ($1, $2)`,
            [mem1Id, 'Project-Phoenix']
        );

        // 2. Create a linked note with source
        const result2 = await pool.query(
            `INSERT INTO memories (content, project_name, memory_type, source) VALUES ($1, $2, $3, $4) RETURNING id`,
            ["We need to discuss [[Project-Phoenix]] budget.", projectName, 'note', 'notes/budget.md']
        );
        const mem2Id = result2.rows[0].id;

        await pool.query(
            `INSERT INTO memory_links (source_id, target_concept) VALUES ($1, $2)`,
            [mem2Id, 'Project-Phoenix']
        );

        // 3. Create a summary with source
        await pool.query(
            `INSERT INTO memories (content, project_name, memory_type, source) VALUES ($1, $2, $3, $4)`,
            ["Everything is on track.", projectName, 'summary', 'summaries/status.md']
        );

        // 4. Test the visual tool logic (manual execution of updated logic)
        console.log("Generating Mermaid...");
        
        const memoriesResult = await pool.query(
            `SELECT id, source, memory_type, content FROM memories WHERE project_name = $1`,
            [projectName]
        );
        const linksResult = await pool.query(
            `SELECT l.source_id, l.target_concept 
             FROM memory_links l
             JOIN memories m ON l.source_id = m.id
             WHERE m.project_name = $1`,
            [projectName]
        );

        const memories = memoriesResult.rows;
        const links = linksResult.rows;

        const sanitizeLabel = (text: string) => {
            return text.replace(/[\n\r]/g, " ").replace(/"/g, "'").trim();
        };

        const idMap = new Map<string, string>();
        memories.forEach((m, idx) => {
            idMap.set(m.id, `m${idx + 1}`);
        });

        let mermaid = "graph LR\n";

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
                let label = m.source;
                if (!label) {
                    const firstLine = m.content.split('\n')[0].replace(/^#+\s*/, '').trim();
                    label = firstLine.substring(0, 30) || `Memory_${shortId}`;
                }
                const fullLabel = `"${sanitizeLabel(label)}"`;
                let shape = `[${fullLabel}]`;
                if (type === 'summary') shape = `{{${fullLabel}}}`;
                if (type === 'sop') shape = `[[${fullLabel}]]`;
                if (type === 'concept') shape = `([${fullLabel}])`;
                mermaid += `    ${shortId}${shape}\n`;
            });
            mermaid += `  end\n`;
        }

        const concepts = new Set<string>();
        links.forEach(l => concepts.add(l.target_concept));

        if (concepts.size > 0) {
            mermaid += `\n  subgraph CONCEPTS\n`;
            concepts.forEach(c => {
                const conceptId = `c_${c.replace(/[^a-zA-Z0-9]/g, "_")}`;
                mermaid += `    ${conceptId}(("${c}"))\n`;
            });
            mermaid += `  end\n`;
        }

        links.forEach(l => {
            const mId = idMap.get(l.source_id);
            const cId = `c_${l.target_concept.replace(/[^a-zA-Z0-9]/g, "_")}`;
            mermaid += `  ${mId} --> ${cId}\n`;
        });

        mermaid += "\n  classDef summary fill:#d4f7d4,stroke:#333,stroke-width:1px;\n";
        mermaid += "  classDef sop fill:#d4e6f7,stroke:#333,stroke-width:1px;\n";
        mermaid += "  classDef concept fill:#fff3cd,stroke:#333,stroke-width:1px;\n";
        mermaid += "  classDef extConcept fill:#f9f,stroke:#333,stroke-width:2px;\n";

        if (byType['summary']) mermaid += `  class ${byType['summary'].map(m => idMap.get(m.id)).join(',')} summary;\n`;
        if (byType['sop']) mermaid += `  class ${byType['sop'].map(m => idMap.get(m.id)).join(',')} sop;\n`;
        if (byType['concept']) mermaid += `  class ${byType['concept'].map(m => idMap.get(m.id)).join(',')} concept;\n`;
        if (concepts.size > 0) mermaid += `  class ${Array.from(concepts).map(c => `c_${c.replace(/[^a-zA-Z0-9]/g, "_")}`).join(',')} extConcept;\n`;

        console.log("\n--- FILENAME MERMAID OUTPUT ---\n");
        console.log(mermaid);
        console.log("\n-------------------------------\n");

    } catch (err) {
        console.error("Test error:", err);
    } finally {
        await pool.end();
    }
}

testVisual();
