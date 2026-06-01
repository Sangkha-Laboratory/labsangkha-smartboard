import { createClient } from '@supabase/supabase-js';
import { getActiveConfig } from '../config';

const activeConfig = getActiveConfig();
const supabaseUrl = activeConfig.supabaseUrl;
const supabaseAnonKey = activeConfig.supabaseAnonKey;

if ((!supabaseUrl || supabaseUrl.includes('your-project-url')) && import.meta.env.DEV) {
  console.warn('Missing or placeholder Supabase credentials detected. Please edit src/config.ts or configure environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    db: {
      // Hardcoded to handover_sys per root SKILL.md documentation.
      // If "relation does not exist" errors occur, check if the tables are in 'public' 
      // and change this schema name accordingly.
      schema: 'handover_sys'
    }
  }
);
