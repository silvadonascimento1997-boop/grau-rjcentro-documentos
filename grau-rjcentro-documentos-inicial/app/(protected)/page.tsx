import Link from "next/link";
import { BookOpenCheck, CheckCircle2, Clock3, FilePlus2, FileX2, PenLine, Users, ArrowUpRight, ListFilter, ShieldCheck } from "lucide-react";
import { REGISTROS_DEMO } from "@/lib/demo";
import { StatusPill } from "@/components/StatusPill";
import { DemoAlert } from "@/components/DemoAlert";
import { PageHeader } from "@/components/PageHeader";

const finalizados = REGISTROS_DEMO.filter(r => r.situacao === "Finalizado").length;
const cancelados = REGISTROS_DEMO.filter(r => r.situacao === "Cancelado").length;
const pendentes = REGISTROS_DEMO.filter(r => r.situacao.includes("assinado") || r.situacao.includes("assinatura")).length;

export default function Dashboard() {
  const cards = [
    { title: "Registros de exemplo", value: REGISTROS_DEMO.length, Icon: BookOpenCheck, link: "/livro" },
    { title: "Finalizados", value: finalizados, Icon: CheckCircle2, link: "/livro?status=finalizado" },
    { title: "Aguardando assinatura", value: pendentes, Icon: Clock3, link: "/assinaturas" },
    { title: "Cancelados", value: cancelados, Icon: FileX2, link: "/livro?status=cancelado" },
  ];
  return <>
    <PageHeader eyebrow="PAINEL ADMINISTRATIVO" title="Visão geral" description="Acompanhe emissões, pendências e registros da unidade Rio de Janeiro Centro." action={<Link className="btn btn-primary" href="/emissao"><FilePlus2 size={18}/> Nova emissão</Link>}/>
    <DemoAlert>Os indicadores abaixo usam exclusivamente dados fictícios. Nenhum documento oficial foi emitido.</DemoAlert>
    <div className="kpi-grid">
      {cards.map(({ title, value, Icon, link }) => <Link href={link} className="kpi-card" key={title}><div className="kpi-top"><span className="icon-box"><Icon size={21}/></span><ArrowUpRight size={17}/></div><strong className="kpi-value">{value}</strong><span className="kpi-title">{title}</span></Link>)}
    </div>
    <div className="dashboard-columns">
      <section className="surface"><div className="surface-title"><h2>Emissões recentes</h2><Link href="/livro" className="quiet-link">Abrir livro <ArrowUpRight size={16}/></Link></div><div className="records-list">{REGISTROS_DEMO.slice(0,5).map(r=><div className="record-row" key={r.id}><div className="record-code">#{r.id}</div><div className="record-main"><strong>{r.documento}</strong><span>{r.aluno} · {r.data}</span></div><StatusPill situacao={r.situacao}/></div>)}</div></section>
      <div className="right-column">
        <section className="surface"><div className="surface-title"><h2>Assinaturas</h2><PenLine size={20}/></div><p className="secondary-text">Há <strong>{pendentes}</strong> documentos demonstrativos com assinatura pendente.</p><Link href="/assinaturas" className="btn btn-light full-width">Ver central de assinaturas <ArrowUpRight size={16}/></Link></section>
        <section className="surface"><div className="surface-title"><h2>Acesso rápido</h2><ListFilter size={20}/></div><div className="quick-links"><Link href="/alunos"><Users size={19}/> Cadastro de alunos <ArrowUpRight size={15}/></Link><Link href="/livro"><BookOpenCheck size={19}/> Livro Eletrônico <ArrowUpRight size={15}/></Link><Link href="/validacao"><ShieldCheck size={19}/> Verificação de autenticidade <ArrowUpRight size={15}/></Link></div></section>
      </div>
    </div>
  </>;
}
