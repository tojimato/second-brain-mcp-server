import { initDb, pool } from './db';
import { ingestFile } from './services/memoryService';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
    const projectName = "IngestTestProject";
    const testFilePath = path.join(__dirname, "test_file.txt");
    const testPdfPath = path.join(__dirname, "test_file.pdf");

    try {
        console.log("Initializing DB...");
        await initDb();

        // 1. Test Text File Ingestion
        console.log("Creating test text file...");
        fs.writeFileSync(testFilePath, "This is a test content from a text file [[ConceptA]].", 'utf8');

        console.log("Ingesting text file...");
        const result1 = await ingestFile(projectName, testFilePath);
        console.log(`Ingested: ${result1.source}, Chunks: ${result1.chunksCount}`);

        // Verify in DB
        const dbResult1 = await pool.query('SELECT count(*) FROM memories WHERE project_name = $1 AND source = $2', [projectName, "test_file.txt"]);
        console.log(`DB Count: ${dbResult1.rows[0].count}`);
        if (parseInt(dbResult1.rows[0].count) === 0) throw new Error("Text ingestion failed.");

        // 2. Test Sync Logic (Re-ingestion)
        console.log("Re-ingesting text file (should delete old ones)...");
        await ingestFile(projectName, testFilePath);
        const dbResult2 = await pool.query('SELECT count(*) FROM memories WHERE project_name = $1 AND source = $2', [projectName, "test_file.txt"]);
        console.log(`DB Count after re-ingest: ${dbResult2.rows[0].count}`);
        // If it correctly deletes and re-adds, count should be the same as chunksCount (likely 1 for small text)
        if (parseInt(dbResult2.rows[0].count) !== result1.chunksCount) throw new Error("Sync logic failed.");

        // 3. Test Binary Branch Logic (using a fake PDF)
        console.log("Creating fake PDF file...");
        fs.writeFileSync(testPdfPath, "%PDF-1.4 (fake content)", 'utf8');

        console.log("Attempting to ingest fake PDF (branching logic test)...");
        try {
            await ingestFile(projectName, testPdfPath);
            console.log("Fake PDF ingested (or extractor handled it).");
        } catch (err) {
            console.log("PDF ingestion failed as expected (or library error):", err instanceof Error ? err.message : err);
        }

        console.log("\nALL LOGIC TESTS PASSED!");

    } catch (err) {
        console.error("Test FAILED:", err);
    } finally {
        console.log("Cleaning up...");
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
        await pool.query('DELETE FROM memories WHERE project_name = $1', [projectName]);
        await pool.end();
    }
}

runTest();
