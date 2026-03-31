import { NextRequest, after } from 'next/server';

export const maxDuration = 60;
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { processDataSource } from '@/lib/rag/pipeline';
import { chunkText } from '@/lib/rag/chunking';
import { v4 as uuidv4 } from 'uuid';

// File extensions we'll index
const INDEXABLE_EXTENSIONS = new Set([
  'md', 'mdx', 'txt', 'rst',
  'js', 'jsx', 'ts', 'tsx',
  'py', 'rb', 'go', 'java', 'php', 'cs', 'cpp', 'c', 'h',
  'html', 'htm', 'css',
  'json', 'yaml', 'yml', 'toml',
  'xml', 'csv',
]);

const MAX_FILES = 60;
const MAX_FILE_SIZE_BYTES = 100_000; // 100 KB per file
const MAX_TOTAL_CHARS = 600_000;

interface GitHubTreeItem {
  path: string;
  type: string; // 'blob' | 'tree'
  size?: number;
  sha: string;
}

function parseGitHubUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(repoUrl.trim());
    if (url.hostname !== 'github.com') return null;
    const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

async function githubFetch(url: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { agent_id, repo_url, token, branch, folder_path } = await request.json() as {
      agent_id: string;
      repo_url: string;
      token?: string;
      branch?: string;
      folder_path?: string;
    };

    if (!agent_id || !repo_url) {
      return errorResponse('agent_id and repo_url are required', 400);
    }

    const parsed = parseGitHubUrl(repo_url);
    if (!parsed) {
      return errorResponse('Invalid GitHub repository URL. Expected: https://github.com/owner/repo', 400);
    }

    const { owner, repo } = parsed;

    // Resolve branch/SHA to use
    let treeSha = branch || 'HEAD';

    // Fetch the file tree recursively
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
    const treeData = await githubFetch(treeUrl, token) as { tree: GitHubTreeItem[]; truncated?: boolean };

    // Filter to indexable blobs
    let files = (treeData.tree || []).filter((item) => {
      if (item.type !== 'blob') return false;
      if (item.size && item.size > MAX_FILE_SIZE_BYTES) return false;
      const ext = item.path.split('.').pop()?.toLowerCase() || '';
      if (!INDEXABLE_EXTENSIONS.has(ext)) return false;
      if (folder_path && !item.path.startsWith(folder_path.replace(/^\//, ''))) return false;
      return true;
    });

    if (files.length === 0) {
      return errorResponse('No indexable files found in this repository. Try a different folder or branch.', 400);
    }

    // Sort: docs/markdown first, then code files; limit to MAX_FILES
    files.sort((a, b) => {
      const extA = a.path.split('.').pop()?.toLowerCase() || '';
      const extB = b.path.split('.').pop()?.toLowerCase() || '';
      const docExts = new Set(['md', 'mdx', 'txt', 'rst']);
      const aDoc = docExts.has(extA) ? 0 : 1;
      const bDoc = docExts.has(extB) ? 0 : 1;
      return aDoc - bDoc;
    });

    files = files.slice(0, MAX_FILES);

    // Fetch each file's content
    const contentParts: string[] = [];
    let totalChars = 0;

    for (const file of files) {
      if (totalChars >= MAX_TOTAL_CHARS) break;

      try {
        const fileData = await githubFetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}${branch ? `?ref=${branch}` : ''}`,
          token,
        ) as { content?: string; encoding?: string };

        if (fileData.encoding === 'base64' && fileData.content) {
          const decoded = Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf-8');
          const snippet = decoded.slice(0, MAX_TOTAL_CHARS - totalChars);
          contentParts.push(`### File: ${file.path}\n\n${snippet}\n`);
          totalChars += snippet.length;
        }
      } catch {
        // Skip files that fail to fetch
      }
    }

    if (contentParts.length === 0) {
      return errorResponse('Could not read any file content from this repository.', 400);
    }

    const combinedContent = contentParts.join('\n---\n\n');
    const sourceName = `${owner}/${repo}${folder_path ? `/${folder_path.replace(/^\//, '')}` : ''}`;

    // Create data source record
    const dataSourceId = uuidv4();

    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        id: dataSourceId,
        agent_id,
        type: 'text',
        name: sourceName,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    // Store raw text as initial chunks for the pipeline
    const chunks = chunkText(combinedContent);
    const chunkRows = chunks.map((chunk) => ({
      agent_id,
      data_source_id: dataSourceId,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      metadata: { source: 'github', repo: `${owner}/${repo}`, file_count: contentParts.length },
    }));

    await supabaseAdmin.from('document_chunks').insert(chunkRows);

    // Process in background (embed chunks)
    after(async () => {
      await processDataSource(dataSourceId);
    });

    return successResponse(
      { ...data, file_count: contentParts.length, truncated: treeData.truncated },
      201,
    );
  } catch (err) {
    return errorResponse((err as Error).message);
  }
}
