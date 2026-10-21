import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function DemoAlert({ children }: { children?: ReactNode }) {
  return <div className="demo-alert"><Info size={18} aria-hidden="true" /><div><strong>Versão demonstrativa — etapa GitHub.</strong><span>{children || "Sem banco de dados, acesso autenticado ou emissão oficial de documentos nesta fase."}</span></div></div>;
}
