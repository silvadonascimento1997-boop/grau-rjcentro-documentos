export const ESCOLA = {
  nome: "Grau Técnico",
  unidade: "Rio de Janeiro Centro",
  razaoSocial: "Rio Centro Cursos Técnicos",
  cnpj: "38.852.241/0001-31",
  inep: "33194564",
  endereco: "Av. Marechal Floriano, 150, Centro, Rio de Janeiro/RJ",
} as const;

export const TIPOS_DOCUMENTO = [
  { id: "vinculo", nome: "Declaração de Vínculo Escolar", cee: "01" },
  { id: "estagio-agendado", nome: "Declaração de Estágio Agendado", cee: "01" },
  { id: "estagio-concluido", nome: "Declaração de Conclusão de Estágio", cee: "01" },
  { id: "certidao", nome: "Certidão de Conclusão", cee: "02" },
  { id: "certificado", nome: "Certificado", cee: "03" },
] as const;

export const SITUACOES_ACADEMICAS = [
  { codigo: "MT", descricao: "Matrículado" },
  { codigo: "CAC", descricao: "Cancelamento Comercial" },
  { codigo: "LFI", descricao: "Limpeza Financeira" },
  { codigo: "LFR", descricao: "Limpeza de Frequencia" },
  { codigo: "CAU", descricao: "Cancelamento Unidade" },
  { codigo: "NC", descricao: "Nunca Compareceu" },
  { codigo: "FO", descricao: "Formado" },
  { codigo: "CAN", descricao: "Cancelamento Normal" },
  { codigo: "CAI", descricao: "Cancelamento Interno" },
] as const;

export const MODALIDADES = [
  { codigo: "EPS", descricao: "Educação Profissional Subsequente" },
  { codigo: "EPC", descricao: "Educação Profissional Concomitante" },
] as const;
