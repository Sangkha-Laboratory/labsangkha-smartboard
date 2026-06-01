/**
 * Central configuration file for blood-lab-handover system.
 * Automatically detects the hosting environment based on window.location.hostname.
 * No need to re-configure environment variables repeatedly when switching across
 * Google AI Studio, GitHub Pages, or Cloudflare Pages!
 */

export interface AppEnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  liffId: string;
}

// 1. Edit this dictionary with your unified credentials once.
// When deploying to other hosting platforms, the app detects the hostname and switches configs automatically.
export const ENV_CONFIGS: Record<string, AppEnvConfig> = {
  // Google AI Studio (Dev / Preview Mode)
  aiStudio: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "https://tahmjffczgnzkesgxazd.supabase.co",
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhaG1qZmZjemduemtlc2d4YXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ4MzIsImV4cCI6MjA5MjYwMDgzMn0.p4-VAPDYBeB5CmVo70vKI-EPfUysP1Opc06cRbZHFpg",
    liffId: import.meta.env.VITE_LINE_LIFF_ID || "2009228308-D2WbO3o1" // Default AI Studio Sandbox LIFF ID
  },

  // GitHub Pages (E.g. testing target)
  gitHubPages: {
    supabaseUrl: "https://tahmjffczgnzkesgxazd.supabase.co", // Replace with your same Supabase URL
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhaG1qZmZjemduemtlc2d4YXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ4MzIsImV4cCI6MjA5MjYwMDgzMn0.p4-VAPDYBeB5CmVo70vKI-EPfUysP1Opc06cRbZHFpg",                     // Replace with your same Supabase Anon Key
    liffId: "2010256621-suCeCNrD"                         // Real LIFF ID registered for GitHub Pages
  },

  // Cloudflare Pages or Custom Production Domain
  production: {
    supabaseUrl: "https://tahmjffczgnzkesgxazd.supabase.co", // Replace with your same Supabase URL
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhaG1qZmZjemduemtlc2d4YXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ4MzIsImV4cCI6MjA5MjYwMDgzMn0.p4-VAPDYBeB5CmVo70vKI-EPfUysP1Opc06cRbZHFpg",                     // Replace with your same Supabase Anon Key
    liffId: "2010256621-suCeCNrD"                         // Real LIFF ID registered for production
  }
};

/**
 * Automatically retrieves the correct configuration based on the current context URL.
 */
export function getActiveConfig(): AppEnvConfig {
  // 1. ตรวจสอบว่ามีค่า Env Variables จากตอน Build/CI-CD (เช่น GitHub Actions, Cloudflare Build Settings) หรือไม่
  const buildSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const buildSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const buildLiffId = import.meta.env.VITE_LINE_LIFF_ID;

  if (typeof window === 'undefined') {
    return {
      supabaseUrl: buildSupabaseUrl || ENV_CONFIGS.aiStudio.supabaseUrl,
      supabaseAnonKey: buildSupabaseAnonKey || ENV_CONFIGS.aiStudio.supabaseAnonKey,
      liffId: buildLiffId || ENV_CONFIGS.aiStudio.liffId
    };
  }

  const hostname = window.location.hostname;

  // 2. ค้นหา Config ตามโดเมนที่กำลังรันอยู่ (Domain Dictionary Mapping)
  let activeDict = ENV_CONFIGS.aiStudio;
  if (hostname.endsWith('github.io')) {
    activeDict = ENV_CONFIGS.gitHubPages;
  } else if (hostname.endsWith('pages.dev') || hostname === 'labsangkha.com') { // เปลี่ยนเป็นโดเมนของคุณตามต้องการ
    activeDict = ENV_CONFIGS.production;
  }

  // 3. รวมตัวกันแบบอัจฉริยะ: ถ้าใน GitHub/Cloudflare มีการตั้งค่า Env variables ไว้ตอน build ให้ใช้ค่านั้นก่อน
  // แต่ถ้าไม่มี (เป็นค่าว่างหรือค่าตัวอย่าง) จะใช้ค่าที่กรอกไว้ใน ENV_CONFIGS ด้านบนให้อัตโนมัติ!
  const isPlaceholderUrl = (url?: string) => !url || url.includes('your-project-url') || url.includes('placeholder');
  const isPlaceholderKey = (key?: string) => !key || key.includes('your-anon-key') || key.includes('placeholder');
  const isPlaceholderLiffSpace = (id?: string) => !id || id.includes('2010123456') || id === 'your-anon-key';

  return {
    supabaseUrl: isPlaceholderUrl(buildSupabaseUrl) ? activeDict.supabaseUrl : buildSupabaseUrl,
    supabaseAnonKey: isPlaceholderKey(buildSupabaseAnonKey) ? activeDict.supabaseAnonKey : buildSupabaseAnonKey,
    liffId: isPlaceholderLiffSpace(buildLiffId) ? activeDict.liffId : buildLiffId
  };
}
