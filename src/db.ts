import { Pool } from 'pg';
import dotenv from 'dotenv';

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
                embedding vector(768),
                project_name VARCHAR(255) NOT NULL,
                memory_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database initialized with vector extension and memories table.");
    } catch (err) {
        console.error("Failed to initialize database:", err);
        throw err;
    } finally {
        client.release();
    }
}
