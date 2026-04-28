import dotenv from 'dotenv';
dotenv.config();

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initDb } from './db';
import { registerMemoryTools } from './tools/memoryTools';
import { registerGraphTools } from './tools/graphTools';

/**
 * MCP Server for Second Brain
 * Provides semantic search, memory storage, and knowledge graph visualization.
 */

// Create the MCP Server
const server = new McpServer({
    name: "mcp-second-brain",
    version: "1.1.0"
});

// Register Tools
registerMemoryTools(server);
registerGraphTools(server);

async function main() {
    console.error("Starting Second Brain MCP Server...");
    await initDb();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Server connected to Stdio transport.");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
