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

// Centralized session cleaner helper
const clearLocalAuth = () => {
  console.warn('Silently clearing stale user session due to Auth / Refresh Token Error in Supabase Client');
  localStorage.removeItem('sangkha_handover_local_user');
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth.token'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('sangkha_view_isAdminPortal');
  localStorage.removeItem('sangkha_view_isUserPortal');
  
  try {
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  } catch {
    // ignore
  }
};

// Intercept getSession calls to prevent unhandled refresh token errors in components
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
supabase.auth.getSession = async () => {
  try {
    const res = await originalGetSession();
    if (res?.error) {
      const errMsg = res.error.message || '';
      const isTokenErr = 
        errMsg.toLowerCase().includes('refresh token') || 
        errMsg.toLowerCase().includes('refresh_token') || 
        errMsg.toLowerCase().includes('invalid_grant') ||
        errMsg.toLowerCase().includes('token not found') ||
        errMsg.toLowerCase().includes('grant_not_found');

      if (isTokenErr) {
        clearLocalAuth();
      }
    }
    return res;
  } catch (err: any) {
    const errMsg = err?.message || '';
    const isTokenErr = 
      errMsg.toLowerCase().includes('refresh token') || 
      errMsg.toLowerCase().includes('refresh_token') || 
      errMsg.toLowerCase().includes('invalid_grant') ||
      errMsg.toLowerCase().includes('token not found') ||
      errMsg.toLowerCase().includes('grant_not_found');

    if (isTokenErr) {
      clearLocalAuth();
    }
    throw err;
  }
};

