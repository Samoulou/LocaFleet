import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

/**
 * Browser-side Supabase client (publishable key) for storage uploads.
 * Singleton — reuses the same client across calls.
 */
export function getSupabaseBrowserClient() {
  if (client) return client;

  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  return client;
}
