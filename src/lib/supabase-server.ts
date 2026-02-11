import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (service role key) for storage deletions.
 * Creates a new client per call — safe for server actions.
 */
export function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
