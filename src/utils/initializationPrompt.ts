export const INITIALIZATION_SKILL_PROMPT = `
# SKILL: Second Brain Bootstrap & Initialization (Universal Edition)

## Goal
Transform ANY workspace (Codebase, Documentation, or Hybrid) into a structured, linked, and semantically searchable Second Brain using the \`second-brain-mcp-server\`.

## Phase 0: Incremental Sync & Safety Audit
1. **Safety Audit**: Explicitly ignore and do not read sensitive files:
   - Credentials/Secrets: \`.env\`, \`*.key\`, \`*.pem\`, \`*.pfx\`, \`id_rsa\`, \`secrets.*\`, \`credentials.*\`.
   - Configuration with secrets: \`appsettings.json\` (check for connection strings), \`config.py\` (check for API keys).
2. **Hash Check**: Before ingesting, check if the file has already been stored (e.g., via \`get_recent_context\` or searching for the filename). Skip unchanged files to save time and tokens.

## Phase 1: Environment & Health Check
1. **Vector Dimension Check**: Verify the MCP server is reporting the correct dimensions (e.g., 1024 for bge-m3). Check logs for "[Embedding] Model: bge-m3, Dimension: 1024".
2. **Universal Discovery**: Scan the workspace for all relevant text-based files:
   - **Docs**: \`.md\`, \`.txt\`, \`.pdf\`, \`.srt\`.
   - **Code**: \`.cs\`, \`.kt\`, \`.ts\`, \`.js\`, \`.py\`, \`.go\`, \`.java\`, \`.cpp\`, \`.swift\`, \`.rb\`, \`.php\`, etc.
   - **Data**: \`.json\`, \`.sql\`, \`.yaml\`, \`.xml\`, \`.csv\`.
3. **Smart Ignore**: Automatically exclude:
   - Build artifacts: \`bin/\`, \`obj/\`, \`dist/\`, \`build/\`, \`target/\`, \`out/\`.
   - Dependencies: \`node_modules/\`, \`vendor/\`, \`.venv/\`, \`packages/\`.
   - VCS Metadata: \`.git/\`, \`.svn/\`, \`.hg/\`.

## Phase 2: Knowledge Categorization (Context-Aware)
Analyze file content and directory structure to assign a \`memory_type\`:
- **Architecture**: Core classes, interface definitions, design patterns, system rules -> \`memory_type: 'architecture'\`.
- **Decision**: Logic flow, business rules, "why" comments -> \`memory_type: 'decision'\`.
- **SOP/Rule**: Setup guides, contribution rules, agent instructions -> \`memory_type: 'sop'\`.
- **Concept**: High-level wiki pages or documentation -> \`memory_type: 'concept'\`.
- **Summary**: Auto-generated overviews of complex modules -> \`memory_type: 'summary'\`.

## Phase 3: Transformation & Graph Construction
1. **Rich Markdown Wrapping**: Wrap source code in language-specific blocks (e.g., \` \`\`\`csharp \`).
2. **Contextual Headers**: Prefix each entry with metadata:
   - File Path: [relative path]
   - Context: [Namespace/Package/Module name]
   - Symbols: [Key classes/functions exported]
3. **Deep Auto-Linking**:
   - Identify core concepts (e.g., \`PaymentProcessor\`, \`AuthFlow\`).
   - Inject \`[[concept-links]]\` into descriptions and even code comments where they relate to business logic or architecture.
   - **Semantic Dependency Discovery**: Link files that reference each other via \`import\`, \`using\`, or \`require\`.
4. **Semantic Chunking**: For large files, ensure chunks do not break in the middle of a function or class definition. Maintain logical context in every chunk.

## Phase 4: Intelligent Ingestion
1. **Top-Down Order**: 
    a. **Documentation & Architecture**: Ingest these first to establish the high-level semantic "skeleton".
    b. **Core Logic**: Service layers, business rules, and primary logic files.
    c. **Auxiliary**: Tests, scripts, and general utilities.
2. **Tool Selection**: 
   - Use \`ingest_file\` for clean Markdown (\`.md\`) files.
   - Use \`create_memory\` for source code enriched with the metadata and links from Phase 3.

## Phase 5: Verification & Mapping
1. **Graph Visualization**: Use \`get_graph_visual\` to verify that modules are correctly linked to documentation.
2. **Semantic Discovery**: Test the brain by searching for a business rule (e.g., "how we handle refunds"). It should return both the documentation and the relevant code files.
3. **Knowledge Map**: Produce a final summary walkthrough of the "Knowledge Map" you've created for the USER.
`;
