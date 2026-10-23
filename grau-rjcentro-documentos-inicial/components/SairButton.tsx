"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SairButton({ classe = "logout-button" }: { classe?: string }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  async function sair() {
    setSaindo(true);
    try {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally { setSaindo(false); }
  }
  return <button type="button" className={classe} onClick={sair} disabled={saindo}>
    <LogOut size={17} aria-hidden="true" /> {saindo ? "Saindo..." : "Sair"}
  </button>;
}
