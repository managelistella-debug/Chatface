CREATE OR REPLACE FUNCTION match_documents(
  query_embedding text,
  match_agent_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  data_source_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.data_source_id,
    1 - (dc.embedding <=> query_embedding::vector) AS similarity
  FROM document_chunks dc
  WHERE dc.agent_id = match_agent_id
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding::vector) > match_threshold
  ORDER BY dc.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;
