import type { ReactNode } from "react";
import { exigirUsuario } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

// Este layout exige sessão válida e um perfil institucional ativo
// antes de renderizar qualquer tela administrativa.
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const usuario = await exigirUsuario();
  return <AppShell usuario={usuario}>{children}</AppShell>;
}
