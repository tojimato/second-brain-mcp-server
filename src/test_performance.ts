import { initDb, pool } from './db';
import { getEmbedding } from './embedding';

async function testPerformance() {
    try {
        console.log("Initializing DB and Index...");
        await initDb();

        const projectName = "PerfTest";
        const query = "What is our scaling strategy?";
        
        console.log("Measuring Embedding Time...");
        const startEmbed = Date.now();
        const embedding = await getEmbedding(query);
        console.log(`Embedding took: ${Date.now() - startEmbed}ms`);

        const vectorString = `[${embedding.join(',')}]`;

        console.log("Measuring Search Time (HNSW Index)...");
        const startSearch = Date.now();
        const result = await pool.query(
            `SELECT id, 1 - (embedding <=> $1::vector) as similarity
             FROM memories
             WHERE project_name = $2
             ORDER BY embedding <=> $1::vector
             LIMIT 5`,
            [vectorString, projectName]
        );
        console.log(`Search took: ${Date.now() - startSearch}ms`);
        console.log(`Results found: ${result.rows.length}`);

        console.log("PERFORMANCE TEST COMPLETE.");
    } catch (err) {
        console.error("Test error:", err);
    } finally {
        await pool.end();
    }
}

testPerformance();
