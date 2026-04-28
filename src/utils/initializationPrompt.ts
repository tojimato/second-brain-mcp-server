export const INITIALIZATION_SKILL_PROMPT = `
# SKILL: Second Brain Bootstrap & Initialization (Aforsoft Strict Edition)

## Goal
Transform this workspace into a structured, linked, and semantically searchable Second Brain following the mandatory **Aforsoft Knowledge Schema**.

## CORE AGENT RULES
- **Source of Truth**: Vector database (PostgreSQL) accessed via MCP tools.
- **Semantic Retrieval**: Always use \`search_memory\` before answering.
- **Bidirectional Linking**: Use \`[[concept-name]]\` syntax. The system automatically indexes these into a graph.
- **Traceability**: Always note the \`source\` of information.
- **Operational Modes**:
  - **BOOTSTRAP**: Migrate existing markdown files to the database using \`ingest_file\`.
  - **QUERY**: search_memory (min_sim 0.6) -> get_graph_connections -> Synthesize.
  - **INGEST**: Classify into memory types (concept, summary, sop) -> create_memory. Use \`[[links]]\`.

## Phase 0: Persistence & Agent Alignment (CRITICAL)
To ensure the agent maintains context across sessions, you MUST persist these rules locally before proceeding:
1. **Create Directory**: \`.agents/rules/\`
2. **Write Rules**: Create \`.agents/rules/second-brain.md\`. In this file, copy the **CORE AGENT RULES** and this entire **SKILL** definition.
3. **Write Skills**: Create \`.agents/rules/skills.md\` documenting the ingestion and bootstrapping protocols found in Phase 1 & 2.
4. **Ingest Rules**: Immediately use \`ingest_file\` to store these new rule files as \`memory_type: 'system'\`.

## Phase 1: Mandatory Structure & Mapping
You MUST organize all knowledge into the following structure and map them to the correct \`memory_type\`:

1. **System Layer** (\`memory_type: 'system'\`)
   - Path: \`system/\`
   - Content: Agent rules, SOPs, ingestion protocols, and system-level instructions.
2. **Wiki Layer: Concepts** (\`memory_type: 'concept'\`)
   - Path: \`wiki/concepts/\`
   - Content: Atomic concepts, definitions, and core business/technical entities. 
   - **Format**: Strictly Markdown with \`[[concept-links]]\`.
3. **Wiki Layer: Summaries** (\`memory_type: 'summary'\`)
   - Path: \`wiki/summaries/\`
   - Content: High-level overviews of projects, modules, or long documents.
   - **Format**: Strictly Markdown.
4. **Index**
   - Path: \`wiki/index.md\`
   - Content: The central entry point for the knowledge base.

## Phase 2: Transformation & Ingestion Rules
1. **Raw Knowledge vs. Processed Brain**:
   - Files outside \`system/\` or \`wiki/\` (e.g., HTML, raw code, JSON) are **RAW INPUT**.
   - **NEVER** store raw input directly as a 'concept' or 'summary'.
2. **The Processing Pipeline**:
   - If you discover a raw file (e.g., an HTML blog post or a complex source file):
     a. **Ingest Raw**: Use \`ingest_file\` to store it as \`memory_type: 'file_ingest'\`.
     b. **Transform**: Read the raw content, convert it to clean Markdown.
     c. **Link**: Identify and inject \`[[links]]\` to existing or new concepts.
     d. **Categorize**: Create the final version in \`wiki/concepts/\` or \`wiki/summaries/\` using \`create_memory\`.
3. **Deep Auto-Linking**:
   - Inject \`[[concept-links]]\` into descriptions and code comments.
   - Link files that reference each other via imports or logical dependencies.

## Phase 3: Environment & Health Check
1. **Vector Dimension Check**: Verify 1024 dimensions (bge-m3).
2. **Smart Ignore**: Exclude \`node_modules/\`, \`dist/\`, \`.git/\`, etc.
3. **Safety Audit**: Skip credentials and sensitive configs (\`.env\`, \`*.key\`).

## Phase 4: Verification
1. **Graph Check**: Use \`get_graph_visual\` to ensure the links form a coherent web.
2. **Semantic Test**: Search for a rule (e.g., "refund policy") to verify it returns both doc and code.
`;
