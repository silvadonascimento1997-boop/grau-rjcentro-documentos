import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-image"><Image src="/logo-grau-tecnico.png" width={152} height={74} priority alt="Logomarca Grau Técnico" /></div>
      {!compact && <div className="brand-caption">RIO DE JANEIRO CENTRO</div>}
    </div>
  );
}
