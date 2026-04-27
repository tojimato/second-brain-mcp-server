import { initDb, pool } from './db';
import { getEmbedding } from './embedding';

async function testGraph() {
    try {
        console.log("Initializing DB...");
        await initDb();

        const projectName = "GraphTest";
        
        // 1. Create a concept
        console.log("Creating Target Concept...");
        const targetContent = "[[marketing-strategy]] is about reaching customers.";
        const result1 = await pool.query(
            `INSERT INTO memories (content, project_name, memory_type) VALUES ($1, $2, $3) RETURNING id`,
            [targetContent, projectName, 'concept']
        );
        const targetId = result1.rows[0].id;

        // 2. Create another memory that links to it
        console.log("Creating Linked Memory...");
        const linkedContent = "We should update our [[marketing-strategy]] next week.";
        // Simulating the saveMemory logic manually for the test
        const result2 = await pool.query(
            `INSERT INTO memories (content, project_name, memory_type) VALUES ($1, $2, $3) RETURNING id`,
            [linkedContent, projectName, 'note']
        );
        const sourceId = result2.rows[0].id;
        
        await pool.query(
            `INSERT INTO memory_links (source_id, target_concept) VALUES ($1, $2)`,
            [sourceId, 'marketing-strategy']
        );

        // 3. Test the query
        console.log("Testing get_graph_connections (backlinks)...");
        const result = await pool.query(
            `SELECT m.content
             FROM memories m
             JOIN memory_links l ON m.id = l.source_id
             WHERE m.project_name = $1 AND l.target_concept = $2`,
            [projectName, 'marketing-strategy']
        );

        console.log("Backlinks found:", result.rows.length);
        if (result.rows.length > 0) {
            console.log("First backlink content:", result.rows[0].content);
            console.log("TEST PASSED!");
        } else {
            console.log("TEST FAILED: No backlinks found.");
        }

    } catch (err) {
        console.error("Test error:", err);
    } finally {
        await pool.end();
    }
}

testGraph();
