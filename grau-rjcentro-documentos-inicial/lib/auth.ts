import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import type { Perfil, UsuarioAutorizado } from "@/lib/auth-types";

/**
 * A validação acontece no SERVIDOR. Estar logado não basta:
 * o usuário precisa ter um registro ativo em usuarios_sistema.
 */
export async function exigirUsuario(perfisPermitidos?: Perfil[]): Promise<UsuarioAutorizado> {
  const supabase = await createClient();
  // getUser consulta o Supabase Auth e valida a sessão; não confiar em getSession().
  const { data: { user }, error: erroAuth } = await supabase.auth.getUser();
  if (erroAuth || !user) redirect("/login");

  const { data: cadastro, error: erroPerfil } = await supabase
    .from("usuarios_sistema")
    .select("nome, perfil, ativo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (erroPerfil || !cadastro?.ativo ||
      !["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"].includes(cadastro.perfil)) {
    redirect("/sem-permissao");
  }
  const perfil = cadastro.perfil as Perfil;
  if (perfisPermitidos && !perfisPermitidos.includes(perfil)) {
    redirect("/");
  }
  return { id: user.id, email: user.email ?? "", nome: cadastro.nome, perfil };
}
