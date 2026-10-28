import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente server-side para escrita (usa a Service Role Key se existir).
// Esta chave NUNCA deve ser exposta ao cliente.
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
);

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'No SUPABASE_SERVICE_ROLE_KEY found — server will use anon key for writes (may be blocked by RLS)',
  );
}
