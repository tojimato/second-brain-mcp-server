import { pool } from '../db';
import { getEmbedding } from '../embedding';
import { extractLinks, chunkTextRecursive, cleanHtml, detectFormat } from '../utils/text';
import * as fs from 'fs';
import * as path from 'path';
import { getTextExtractor } from 'office-text-extractor';

const extractor = getTextExtractor();

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

/**
 * Ingests a file (text or binary) into the memory system.
 */
export async function ingestFile(project_name: string, file_path: string, memory_type: string = 'file_ingest') {
    const fullPath = path.resolve(file_path);
    const ext = path.extname(fullPath).toLowerCase();
    const source = path.basename(fullPath);

    let content: string;
    const format = detectFormat(source);
    
    // Define supported formats for office-text-extractor
    const binaryFormats = ['.pdf', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp', '.rtf', '.epub', '.csv'];
    
    if (binaryFormats.includes(ext)) {
        content = await extractor.extractText({ input: fullPath, type: 'file' });
    } else {
        content = fs.readFileSync(fullPath, 'utf8');
        
        // Format-specific preprocessing
        if (format === 'html') {
            content = cleanHtml(content);
        }
    }

    if (!content || content.trim().length === 0) {
        throw new Error(`No text content could be extracted from ${source}.`);
    }

    // Sync Logic: Delete old memories from this source for this project before re-ingesting
    await pool.query(
        'DELETE FROM memories WHERE project_name = $1 AND source = $2',
        [project_name, source]
    );

    // Use recursive splitting with format awareness
    const chunks = chunkTextRecursive(content, 1500, 200, format);
    
    const ids = [];
    for (const chunk of chunks) {
        const id = await saveMemory(project_name, chunk, memory_type, source);
        ids.push(id);
    }

    return { source, chunksCount: chunks.length, ids };
}

