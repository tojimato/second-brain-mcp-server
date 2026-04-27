import { initDb, pool } from './db';

async function testVisual() {
    try {
        console.log("Initializing DB...");
        await initDb();

        const projectName = "VisualTest";
        
        // Cleanup old test data
        await pool.query('DELETE FROM memories WHERE project_name = $1', [projectName]);

        // 1. Create a concept definition
        console.log("Creating Test Memories...");
        const result1 = await pool.query(
            `INSERT INTO memories (content, project_name, memory_type) VALUES ($1, $2, $3) RETURNING id`,
            ["[[Project-Phoenix]] is our main initiative.", projectName, 'concept']
        );
        const mem1Id = result1.rows[0].id;
        
        await pool.query(
            `INSERT INTO memory_links (source_id, target_concept) VALUES ($1, $2)`,
            [mem1Id, 'Project-Phoenix']
        );

        // 2. Create a linked note
        const result2 = await pool.query(
            `INSERT INTO memories (content, project_name, memory_type) VALUES ($1, $2, $3) RETURNING id`,
            ["We need to discuss [[Project-Phoenix]] budget.", projectName, 'note']
        );
        const mem2Id = result2.rows[0].id;

        await pool.query(
            `INSERT INTO memory_links (source_id, target_concept) VALUES ($1, $2)`,
            [mem2Id, 'Project-Phoenix']
        );

        // 3. Create another link
        await pool.query(
            `INSERT INTO memory_links (source_id, target_concept) VALUES ($1, $2)`,
            [mem2Id, 'Budget-Review']
        );

        // 4. Test the visual tool logic (manual execution of what's in index.ts)
        console.log("Generating Mermaid...");
        
        const memoriesResult = await pool.query(
            `SELECT id, content, memory_type FROM memories WHERE project_name = $1`,
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

        let mermaid = "graph TD\n";
        memories.forEach(m => {
            const truncatedContent = m.content.substring(0, 50).replace(/[\n\r]/g, " ").replace(/"/g, "'").trim();
            const label = `[${m.memory_type}] ${truncatedContent}${m.content.length > 50 ? '...' : ''}`;
            const safeId = `mem_${m.id.replace(/-/g, "_")}`;
            mermaid += `  ${safeId}["${label}"]\n`;
        });

        const concepts = new Set<string>();
        links.forEach(l => {
            const sourceId = `mem_${l.source_id.replace(/-/g, "_")}`;
            const conceptId = `concept_${l.target_concept.replace(/[^a-zA-Z0-9]/g, "_")}`;
            mermaid += `  ${sourceId} --> ${conceptId}\n`;
            concepts.add(l.target_concept);
        });

        concepts.forEach(c => {
            const conceptId = `concept_${c.replace(/[^a-zA-Z0-9]/g, "_")}`;
            mermaid += `  ${conceptId}(("${c}"))\n`;
        });

        mermaid += "\n  classDef concept fill:#f9f,stroke:#333,stroke-width:2px;\n";
        if (concepts.size > 0) {
            mermaid += "  class " + Array.from(concepts).map(c => `concept_${c.replace(/[^a-zA-Z0-9]/g, "_")}`).join(",") + " concept;\n";
        }

        console.log("\n--- MERMAID OUTPUT ---\n");
        console.log(mermaid);
        console.log("\n----------------------\n");

        if (mermaid.includes("Project_Phoenix") && mermaid.includes("Budget_Review")) {
            console.log("TEST PASSED: Mermaid contains expected concepts.");
        } else {
            console.log("TEST FAILED: Mermaid missing concepts.");
        }

    } catch (err) {
        console.error("Test error:", err);
    } finally {
        await pool.end();
    }
}

testVisual();
