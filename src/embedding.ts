import { Ollama } from 'ollama';
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// You can change the model via environment variable. 'bge-m3' is highly recommended for semantic search.
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'bge-m3';

const ollama = new Ollama({ host: OLLAMA_HOST });

export async function getEmbedding(text: string): Promise<number[]> {
    try {
        const response = await ollama.embeddings({
            model: EMBEDDING_MODEL,
            prompt: text,
        });
        return response.embedding;
    } catch (err) {
        console.error("Failed to generate embedding with Ollama:", err);
        throw err;
    }
}
