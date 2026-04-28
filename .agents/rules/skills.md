# Skill: Second Brain Bootstrapping

This skill defines how to initialize a workspace into a Second Brain.

## Steps
1. **Map Structure**:
   - `system/`: Operational rules.
   - `wiki/concepts/`: Atomic definitions.
   - `wiki/summaries/`: High-level overviews.
   - `wiki/index.md`: entry point.

2. **Ingestion Loop**:
   - For each raw file:
     - `ingest_file(memory_type='file_ingest')`.
     - Summarize/Extract concepts -> `create_memory(memory_type='concept'|'summary')`.
     - Inject `[[links]]`.

3. **Validation**:
   - Verify 1024 vector dimensions.
   - Check graph connectivity via `get_graph_visual`.

[[bootstrap-process]] [[ingestion-rules]]
