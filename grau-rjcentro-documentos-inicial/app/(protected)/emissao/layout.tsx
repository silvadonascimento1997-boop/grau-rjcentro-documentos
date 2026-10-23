import type { ReactNode } from "react";
import { exigirUsuario } from "@/lib/auth";

export default async function Permissoes({ children }: { children: ReactNode }) {
  await exigirUsuario(["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA"]);
  return children;
}
