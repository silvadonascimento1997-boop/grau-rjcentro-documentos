import { PenLine, LockKeyhole, UploadCloud } from "lucide-react";
import { DemoAlert } from "@/components/DemoAlert";
import { PageHeader } from "@/components/PageHeader";
import { REGISTROS_DEMO } from "@/lib/demo";
import { StatusPill } from "@/components/StatusPill";

export default function Assinaturas(){
  const pendentes=REGISTROS_DEMO.filter(r=>r.situacao==="Aguardando assinatura"||r.situacao==="Parcialmente assinado");
  return <><PageHeader eyebrow="ASSINATURA DIGITAL" title="Central de assinaturas" description="Acompanhamento da assinatura digital ICP-Brasil e importação da versão assinada externamente."/><DemoAlert>A integração com certificados e o recebimento de PDFs assinados serão implementados em fase posterior. Não envie arquivos reais nesta versão.</DemoAlert><div className="two-card-grid"><section className="surface"><div className="section-name"><PenLine size={21}/><h2>Assinatura integrada</h2></div><p className="secondary-text">Fluxo de assinatura dos responsáveis usando solução de assinatura digital compatível com ICP-Brasil.</p><button className="btn btn-disabled" disabled><LockKeyhole size={17}/> Ainda indisponível</button></section><section className="surface"><div className="section-name"><UploadCloud size={21}/><h2>Assinatura externa</h2></div><p className="secondary-text">Baixar o PDF, assiná-lo em ferramenta externa e anexar a versão final para validação e guarda segura.</p><button className="btn btn-disabled" disabled><LockKeyhole size={17}/> Ainda indisponível</button></section></div><section className="surface"><div className="surface-title"><h2>Pendências demonstrativas</h2><span className="secondary-text">{pendentes.length} documento(s)</span></div>{pendentes.map(r=><div className="record-row" key={r.id}><div className="record-code">#{r.id}</div><div className="record-main"><strong>{r.documento}</strong><span>{r.aluno}</span></div><StatusPill situacao={r.situacao}/></div>)}</section></>;
}
