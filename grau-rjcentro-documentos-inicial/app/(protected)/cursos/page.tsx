import { exigirUsuario } from "@/lib/auth";
import { CursosTurmasClient } from "@/components/CursosTurmasClient";

// A decisão de mostrar controles de edição parte do perfil validado no servidor.
// As autorizações reais de banco permanecem protegidas pelas políticas RLS.
export default async function CursosPage() {
  const usuario = await exigirUsuario(["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"]);
  return <CursosTurmasClient podeEditar={usuario.perfil !== "INSPECAO_ESCOLAR"} />;
}
