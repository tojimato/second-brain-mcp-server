# Second Brain MCP Server

A Model Context Protocol (MCP) server that provides a persistent, semantically searchable memory (Second Brain) for your projects. It generates embeddings using Ollama and stores them in PostgreSQL with `pgvector` support.

## Features

- **Semantic Search:** Search stored knowledge based on meaning, not just keywords.
- **Graph-Enriched Results:** Search results automatically include linked concepts (connections), enabling autonomous context discovery.
- **Bidirectional Linking:** Automatic extraction of `[[concept]]` references to build a knowledge graph.
- **Intelligent Chunking:** Automatically splits large files into manageable chunks to optimize context window and token usage.
- **High Performance:** Uses HNSW indexing for millisecond-level vector similarity retrieval.
- **Traceability:** Tracks the origin of every memory (source file, URL, etc.).

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (For database)
- [Ollama](https://ollama.ai/) (For embedding generation)

## Installation

### Option 1: Via npx (Recommended for Users)
You can initialize the necessary Docker and environment files directly:
```bash
npx -y @aforsoft/second-brain-mcp-server setup
```
This will create `docker-compose.yml` and `.env` files in your current directory.

### Option 2: From Source (For Developers)
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd second-brain-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Database:**
   
   To start only the database (pgvector):
   ```bash
   docker-compose up -d
   ```

   **Alternative:** To start both the Database and Ollama (with automatic model pull):
   ```bash
   docker-compose -f docker-compose.full.yml up -d
   ```
   > [!NOTE]
   > When using `docker-compose.full.yml`, the `ollama` service will automatically pull the `bge-m3` model. This may take a few minutes depending on your internet speed.

4. **Prepare Ollama Model (Manual):**
   If not using the full docker setup, pull the embedding model manually:
   ```bash
   ollama pull bge-m3
   ```

## Configuration (.env)

Copy `.env.example` to `.env` and adjust the settings:

```env
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=second_brain
DB_HOST=localhost
DB_PORT=5433
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_HOST=http://localhost:11434
```

## Usage

### Build and Start

Build the project and start the server:

```bash
npm run build
npm start
```

To run logical tests:
```bash
npm run test
npm run test:graph
npm run test:perf
```

### MCP Tools

1.  **`initialize_workspace`**: Returns the bootstrap instructions to transform any workspace into a Second Brain.
2.  **`create_memory`**: Stores knowledge. Large content is automatically chunked.
3.  **`search_memory`**: Semantic search with **Graph-Enriched Results** (includes linked connections in the output).
4.  **`ingest_file`**: Reads a local file and ingests it into the brain.
5.  **`get_recent_context`**: Fetches recent records with linked connections.
6.  **`delete_memory`**: Delete specific memories by ID or all memories from a specific source.
7.  **`get_graph_connections`**: Finds "backlinks" for a specific concept using the bidirectional links table.
8.  **`get_graph_visual`**: Generates a Mermaid graph visualization of memories and their relationships.

### Claude Desktop Integration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "second-brain": {
      "command": "npx",
      "args": ["-y", "@aforsoft/second-brain-mcp-server"],
      "env": {
        "DB_USER": "postgres",
        "DB_PASSWORD": "password",
        "DB_NAME": "second_brain",
        "DB_HOST": "localhost",
        "DB_PORT": "5433",
        "OLLAMA_EMBEDDING_MODEL": "bge-m3",
        "OLLAMA_HOST": "http://localhost:11434"
      }
    }
  }
}
```

## Agent Configuration (System Prompt)

For the best experience, configure your AI Agent with the following system prompt:

```markdown
# Persistent Second Brain Agent (MCP Edition)

You are the Persistent Second Brain Agent, operating through the MCP server `@aforsoft/second-brain-mcp-server`.

## CORE PRINCIPLES
- **Source of Truth:** The vector database (PostgreSQL) accessed via MCP tools.
- **Semantic Retrieval:** Always use `search_memory` before answering.
- **Bidirectional Linking:** Use `[[concept-name]]` syntax. The system automatically indexes these into a graph.

## OPERATIONAL MODES
1. **BOOTSTRAP MODE:** Migrate existing files to the database using `ingest_file`.
2. **QUERY MODE:** Answer using `search_memory` and `get_graph_connections`.
3. **INGEST MODE:** Save new information using `create_memory`.

## INITIALIZATION
Upon startup: "Second Brain initialized and ready via MCP (Bidirectional Graph active)."
```

## Development

Remember to rebuild after making changes:
```bash
npm run build
```
