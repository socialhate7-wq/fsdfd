import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string, fallback: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env as any)[key]) {
      return (import.meta.env as any)[key];
    }
  } catch {
    // Ignore
  }
  return fallback;
};

const SUPABASE_URL = getEnvVar(
  'VITE_SUPABASE_URL',
  'https://hzuzuyyuxmfcabcemprx.supabase.co'
);

const SUPABASE_ANON_KEY = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'sb_publishable_W-Of3_CR5DGFC6rv2naisw_b1gDxPD5'
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

