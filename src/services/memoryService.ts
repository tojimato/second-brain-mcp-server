import { pool } from '../db.js';
import { getEmbedding } from '../embedding.js';
import { extractLinks } from '../utils/text.js';

/**
 * Saves a single memory chunk and its links to the database.
 */
export async function saveMemory(project_name: string, content: string, memory_type: string, source?: string) {
    const embedding = await getEmbedding(content);
    const vectorString = `[${embedding.join(',')}]`;

    const result = await pool.query(
        `INSERT INTO memories (content, embedding, project_name, memory_type, source)
         VALUES ($1, $2::vector, $3, $4, $5) RETURNING id`,
        [content, vectorString, project_name, memory_type, source]
    );

    const memoryId = result.rows[0].id;
    const links = extractLinks(content);
    for (const link of links) {
        await pool.query(
            `INSERT INTO memory_links (source_id, target_concept) VALUES ($1, $2)`,
            [memoryId, link]
        );
    }
    return memoryId;
}
