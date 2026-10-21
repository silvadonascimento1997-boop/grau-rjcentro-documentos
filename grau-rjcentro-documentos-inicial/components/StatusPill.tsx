import type { SituacaoDocumento } from "@/lib/demo";

export function StatusPill({ situacao }: { situacao: SituacaoDocumento }) {
  const kind = situacao === "Finalizado" ? "ok" : situacao === "Cancelado" ? "error" : "pending";
  return <span className={`pill pill-${kind}`}>{situacao}</span>;
}
