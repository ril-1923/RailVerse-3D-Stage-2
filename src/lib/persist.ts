import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SimSettings } from '@/sim/useSimulation';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  // Vite replaces these at build time; the hosted Bolt environment bakes the
  // Supabase project credentials into the bundle.
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

export async function saveSettings(settings: SimSettings) {
  const db = getClient();
  if (!db) return;
  try {
    await db.from('railverse_settings').upsert(
      { id: 1, settings, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );
  } catch {
    // non-fatal: the simulation continues without persistence
  }
}

export async function loadSettings(): Promise<Partial<SimSettings> | null> {
  const db = getClient();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from('railverse_settings')
      .select('settings')
      .eq('id', 1)
      .maybeSingle();
    if (error) return null;
    return (data?.settings as Partial<SimSettings>) ?? null;
  } catch {
    return null;
  }
}

export async function saveJourneyEvent(kind: string, text: string) {
  const db = getClient();
  if (!db) return;
  try {
    await db.from('railverse_events').insert({ kind, text });
  } catch {
    // non-fatal
  }
}
