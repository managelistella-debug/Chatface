import { supabaseAdmin } from './server';

export async function uploadFile(
  agentId: string,
  dataSourceId: string,
  fileName: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const path = `${agentId}/${dataSourceId}/${fileName}`;
  const { error } = await supabaseAdmin.storage
    .from('agent-files')
    .upload(path, file, { contentType, upsert: true });

  if (error) throw error;
  return path;
}

export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from('agent-files')
    .remove([path]);

  if (error) throw error;
}
