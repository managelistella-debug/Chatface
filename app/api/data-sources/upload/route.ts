import { NextRequest, after } from 'next/server';

export const maxDuration = 60;
import { supabaseAdmin } from '@/lib/supabase/server';
import { uploadFile } from '@/lib/supabase/storage';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { processDataSource } from '@/lib/rag/pipeline';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agent_id') as string;

    if (!file || !agentId) {
      return errorResponse('file and agent_id are required', 400);
    }

    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();

    const typeMap: Record<string, string> = { pdf: 'pdf', docx: 'docx', txt: 'txt' };
    const type = typeMap[ext || ''];
    if (!type) return errorResponse('Unsupported file type. Use PDF, DOCX, or TXT.', 400);

    const dataSourceId = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to storage
    const filePath = await uploadFile(agentId, dataSourceId, fileName, buffer, file.type);

    // Create data source record
    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        id: dataSourceId,
        agent_id: agentId,
        type,
        name: fileName,
        status: 'pending',
        file_path: filePath,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    // Process in background (don't await)
    after(async () => {
      await processDataSource(dataSourceId);
    });

    return successResponse(data, 201);
  } catch (err) {
    return errorResponse((err as Error).message);
  }
}
