import { initDb, pool } from './db';
import { getEmbedding } from './embedding';

async function test() {
    try {
        console.log("Initializing DB...");
        await initDb();

        const projectName = "TestProject";
        const content = "This is a test memory about architectural decisions.";
        
        console.log("Generating embedding for:", content);
        const embedding = await getEmbedding(content);
        console.log("Embedding generated. Length:", embedding.length);

        const vectorString = `[${embedding.join(',')}]`;

        console.log("Saving to DB...");
        const insertResult = await pool.query(
            `INSERT INTO memories (content, embedding, project_name, memory_type)
             VALUES ($1, $2::vector, $3, $4) RETURNING id`,
            [content, vectorString, projectName, 'test']
        );
        console.log("Saved. ID:", insertResult.rows[0].id);

        console.log("Searching for similar memories...");
        const searchResult = await pool.query(
            `SELECT content, 1 - (embedding <=> $1::vector) as similarity
             FROM memories
             WHERE project_name = $2
             ORDER BY embedding <=> $1::vector
             LIMIT 1`,
            [vectorString, projectName]
        );
        console.log("Search result:", searchResult.rows[0]);

        console.log("Test PASSED!");
    } catch (err) {
        console.error("Test FAILED:", err);
    } finally {
        await pool.end();
    }
}

test();
