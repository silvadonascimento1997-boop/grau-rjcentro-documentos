// Apenas dados fictícios de interface. Nunca utilizar para emissão oficial.
export type SituacaoDocumento = "Finalizado" | "Cancelado" | "Aguardando assinatura" | "Parcialmente assinado";
export type RegistroDemo = {
  id: string;
  aluno: string;
  documento: string;
  data: string;
  codigo: string;
  situacao: SituacaoDocumento;
};

export const REGISTROS_DEMO: RegistroDemo[] = [
  { id: "00008", aluno: "Aluno demonstrativo 08", documento: "Certidão de Conclusão", data: "21/10/2026", codigo: "02.EPS.01.33194564.00008.26.01.26", situacao: "Aguardando assinatura" },
  { id: "00007", aluno: "Aluno demonstrativo 07", documento: "Certificado", data: "21/10/2026", codigo: "03.EPS.01.33194564.00007.26.01.26", situacao: "Finalizado" },
  { id: "00006", aluno: "Aluno demonstrativo 06", documento: "Declaração de Vínculo Escolar", data: "21/10/2026", codigo: "01.EPS.01.33194564.00006.26.01.26", situacao: "Cancelado" },
  { id: "00005", aluno: "Aluno demonstrativo 05", documento: "Declaração de Conclusão de Estágio", data: "20/10/2026", codigo: "01.EPS.01.33194564.00005.26.01.26", situacao: "Parcialmente assinado" },
  { id: "00004", aluno: "Aluno demonstrativo 04", documento: "Declaração de Estágio Agendado", data: "20/10/2026", codigo: "01.EPS.01.33194564.00004.26.01.26", situacao: "Finalizado" },
  { id: "00003", aluno: "Aluno demonstrativo 03", documento: "Certificado", data: "20/10/2026", codigo: "03.EPS.01.33194564.00003.26.01.26", situacao: "Finalizado" },
  { id: "00002", aluno: "Aluno demonstrativo 02", documento: "Certidão de Conclusão", data: "17/10/2026", codigo: "02.EPS.01.33194564.00002.26.01.26", situacao: "Finalizado" },
  { id: "00001", aluno: "Aluno demonstrativo 01", documento: "Declaração de Vínculo Escolar", data: "11/10/2026", codigo: "01.EPS.01.33194564.00001.26.01.26", situacao: "Aguardando assinatura" },
];
