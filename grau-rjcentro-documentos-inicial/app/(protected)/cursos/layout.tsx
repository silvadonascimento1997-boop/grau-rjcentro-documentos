import type { ReactNode } from "react";
import { exigirUsuario } from "@/lib/auth";

// Consulta: Inspeção Escolar; gestão: Administração e Coordenação Pedagógica.
export default async function Permissoes({ children }: { children: ReactNode }) {
  await exigirUsuario(["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"]);
  return children;
}
