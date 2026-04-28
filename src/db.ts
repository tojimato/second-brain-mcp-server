import { Pool } from 'pg';
import dotenv from 'dotenv';

process.env.DOTENV_QUIET = 'true';
dotenv.config();

export const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'second_brain',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
});

export async function initDb() {
    const client = await pool.connect();
    try {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                content TEXT NOT NULL,
                embedding vector(1024),
                project_name VARCHAR(255) NOT NULL,
                memory_type VARCHAR(50),
                source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS memory_links (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                source_id UUID REFERENCES memories(id) ON DELETE CASCADE,
                target_concept VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING hnsw (embedding vector_cosine_ops);
        `);
    } catch (err) {
        console.error("Failed to initialize database:", err);
        throw err;
    } finally {
        client.release();
    }
}
