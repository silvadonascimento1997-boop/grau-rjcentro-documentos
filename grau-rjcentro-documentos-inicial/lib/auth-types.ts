export type Perfil = "ADMINISTRADOR" | "COORDENACAO_PEDAGOGICA" | "INSPECAO_ESCOLAR";

export interface UsuarioAutorizado {
  id: string;
  email: string;
  nome: string;
  perfil: Perfil;
}
