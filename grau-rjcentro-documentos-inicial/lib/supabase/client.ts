"use client";

import { createBrowserClient } from "@supabase/ssr";

// Usado somente no navegador; nunca incluir chave secreta aqui.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
