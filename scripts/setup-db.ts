import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function setupDatabase() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 60)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
    if (error) {
      // Try direct query via REST
      console.log('  Note:', error.message);
    }
  }

  // Test: insert and query an agent
  console.log('\nTesting agent insert...');
  const { data, error } = await supabase
    .from('agents')
    .insert({ name: 'Test Agent' })
    .select()
    .single();

  if (error) {
    console.error('Insert failed:', error.message);
    console.log('\n⚠️  Tables may not exist yet. Please run the SQL in supabase/migrations/001_initial_schema.sql manually in the Supabase SQL Editor.');
  } else {
    console.log('✓ Test agent created:', data.id);
    // Clean up
    await supabase.from('agents').delete().eq('id', data.id);
    console.log('✓ Test agent cleaned up');
    console.log('\n✅ Database is ready!');
  }
}

setupDatabase().catch(console.error);
