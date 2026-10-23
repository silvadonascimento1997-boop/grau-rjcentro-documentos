"use client";
import { useState } from "react";
import { Search, Download, BookOpenCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DemoAlert } from "@/components/DemoAlert";
import { PageHeader } from "@/components/PageHeader";
import { REGISTROS_DEMO } from "@/lib/demo";
import { StatusPill } from "@/components/StatusPill";

function LivroConteudo(){
  const params=useSearchParams();
  const inicial = params.get("status") || "todos";
  const [filtro,setFiltro]=useState(inicial);
  const [busca,setBusca]=useState("");
  const registros=REGISTROS_DEMO.filter(r=>(filtro==="todos"||filtro==="finalizado"&&r.situacao==="Finalizado"||filtro==="cancelado"&&r.situacao==="Cancelado"||filtro==="pendente"&&r.situacao!=="Finalizado"&&r.situacao!=="Cancelado")&&`${r.codigo} ${r.documento} ${r.aluno}`.toLowerCase().includes(busca.toLowerCase()));
  return <>
    <PageHeader eyebrow="ESCRITURAÇÃO" title="Livro Eletrônico" description="Consulta cronológica dos registros de emissão e sua situação." action={<button disabled className="btn btn-disabled"><Download size={18}/> Exportar (em breve)</button>}/>
    <DemoAlert>Exemplos fictícios. Não representam um Livro Eletrônico oficial, não há armazenamento ou trilha de auditoria ativa.</DemoAlert>
    <section className="surface"><div className="filters"><label className="search-field"><Search size={18}/><input aria-label="Pesquisar registros" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar código ou tipo..."/></label><select aria-label="Filtrar situação" className="form-input filter-select" value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="todos">Todos</option><option value="finalizado">Finalizados</option><option value="pendente">Pendentes</option><option value="cancelado">Cancelados</option></select></div><div className="surface-title"><h2>Registros demonstrativos</h2><span className="secondary-text">{registros.length} registro(s)</span></div><div className="table-wrap"><table className="records-table"><thead><tr><th>Número</th><th>Documento</th><th>Data</th><th>Situação</th></tr></thead><tbody>{registros.map(r=><tr key={r.id}><td className="mono">{r.id}</td><td><strong>{r.documento}</strong><small>{r.codigo}<span> • {r.aluno}</span></small></td><td>{r.data}</td><td><StatusPill situacao={r.situacao}/></td></tr>)}</tbody></table>{registros.length===0&&<div className="center-state"><BookOpenCheck size={24}/><p>Nenhum resultado para esta pesquisa.</p></div>}</div></section>
  </>;
}

export default function Livro(){return <Suspense fallback={<div className="surface">Carregando consulta...</div>}><LivroConteudo/></Suspense>}
