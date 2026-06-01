import { supabase } from './supabase';
import { maskSensitiveData } from './maskUtils';

export interface LogEntry {
  id: string;
  created_at: string;
  user_id?: string | null;
  user_name?: string | null;
  log_level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  category: string;
  message: string;
  details?: string | null;
}

const LOCAL_LOGS_KEY = 'sangkha_handover_system_logs';
const MAX_LOCAL_LOGS = 200;

// Deeply sanitize objects to remove patient data (HN, names, passwords, PINs) before logging
export function sanitizeLogData(input: any): any {
  if (input === null || input === undefined) {
    return input;
  }

  // Handle Error objects
  if (input instanceof Error) {
    return {
      name: input.name,
      message: maskSensitiveData(input.message, false),
      stack: input.stack ? maskSensitiveData(input.stack, false) : undefined
    };
  }

  // Handle strings
  if (typeof input === 'string') {
    // 1. Extra sanitization for passwords or PINs if they appear in free text
    let sanitized = input;
    sanitized = sanitized.replace(/(password|passcode|pin_code|pin)\s*[:\-\s]\s*([a-zA-Z0-9]{4,})/gi, '$1: ****');
    // 2. Standard masking for patient name, HN, LN
    return maskSensitiveData(sanitized, false);
  }

  // Handle arrays
  if (Array.isArray(input)) {
    return input.map(item => sanitizeLogData(item));
  }

  // Handle objects
  if (typeof input === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(input)) {
      const keyLower = key.toLowerCase();
      // Rigorously remove sensitive raw patient values/credential values
      if (
        keyLower.includes('pin') || 
        keyLower.includes('password') || 
        keyLower.includes('passcode') ||
        keyLower.includes('hn') || 
        keyLower.includes('ln') || 
        keyLower.includes('patient') ||
        keyLower.includes('name') ||
        keyLower.includes('tel') ||
        keyLower.includes('phone')
      ) {
        if (typeof input[key] === 'string') {
          cleaned[key] = '**** [CENSORED FOR SECURITY]';
        } else {
          cleaned[key] = '****';
        }
      } else {
        cleaned[key] = sanitizeLogData(input[key]);
      }
    }
    return cleaned;
  }

  return input;
}

// Get logs stored locally
function getLocalLogs(): LogEntry[] {
  try {
    const saved = localStorage.getItem(LOCAL_LOGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load local logs:', e);
  }
  return [];
}

// Save log locally with cap size
function saveLocalLog(entry: LogEntry) {
  try {
    const current = getLocalLogs();
    const updated = [entry, ...current].slice(0, MAX_LOCAL_LOGS);
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to write local log:', e);
  }
}

/**
 * Write a new activity or system log safely.
 * Rigorously filters and masks any patient or sensitive credentials data before storing.
 */
export async function writeLog(
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL',
  category: string,
  message: string,
  details?: any,
  user?: { id?: string | null; name?: string | null }
): Promise<LogEntry> {
  const timestamp = new Date().toISOString();
  const logId = 'log-' + Math.random().toString(36).substr(2, 9);

  // Apply high-rigor masking to human-readable strings & nested debug details
  const maskedMessage = sanitizeLogData(message);
  const sanitizedDetails = details ? JSON.stringify(sanitizeLogData(details), null, 2) : null;

  const entry: LogEntry = {
    id: logId,
    created_at: timestamp,
    user_id: user?.id || null,
    user_name: user?.name || null,
    log_level: level,
    category: category,
    message: maskedMessage,
    details: sanitizedDetails
  };

  // 1. Always save in local storage as a robust instant access / fallback mechanism
  saveLocalLog(entry);

  // 2. Try to sync with Supabase `system_logs`
  try {
    const { error } = await supabase
      .from('system_logs')
      .insert([{
        created_at: timestamp,
        user_id: entry.user_id,
        user_name: entry.user_name,
        log_level: entry.log_level,
        category: entry.category,
        message: entry.message,
        details: entry.details
      }]);

    if (error) {
      // Fallback log in developer tool to see connection issue
      console.warn(`Supabase database log save omitted (Will use client side fallback): ${error.message}`);
    }
  } catch (dbErr: any) {
    // Graceful omission, standard client fallback has logged it locally
  }

  // Also print to console
  const consoleMsg = `[SYSTEM LOG - ${level}][${category}] ${maskedMessage}`;
  if (level === 'ERROR' || level === 'CRITICAL') {
    console.error(consoleMsg, sanitizedDetails || '');
  } else if (level === 'WARN') {
    console.warn(consoleMsg, sanitizedDetails || '');
  } else {
    console.log(consoleMsg, sanitizedDetails || '');
  }

  return entry;
}

/**
 * Fetch logs. Tries Supabase first, falls back to LocalStorage logs.
 */
export async function getLogs(): Promise<LogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.warn('Supabase system_logs read failed, displaying client-side logs:', error.message);
      return getLocalLogs();
    }

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id?.toString() || 'log-' + Math.random().toString(36).substr(2, 9),
        created_at: item.created_at,
        user_id: item.user_id,
        user_name: item.user_name,
        log_level: item.log_level || 'INFO',
        category: item.category || 'SYSTEM',
        message: item.message || '',
        details: item.details || null
      }));
    }
  } catch (err) {
    console.warn('Network error fetching Supabase system_logs, utilizing client fallback:', err);
  }

  return getLocalLogs();
}

/**
 * Clear logs in local storage.
 * If possible, tries to delete from Supabase, but doesn't fail if permissions are missing.
 */
export async function clearAllLogs(): Promise<boolean> {
  // Clear local storage
  try {
    localStorage.removeItem(LOCAL_LOGS_KEY);
  } catch (e) {
    console.error('Failed to clear local logs:', e);
  }

  // Clear Supabase system_logs
  try {
    const { error } = await supabase
      .from('system_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

    if (error) {
      console.warn('Did not clear Supabase logs (likely normal due to security/RLS constraints):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}
