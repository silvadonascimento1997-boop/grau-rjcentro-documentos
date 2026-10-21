"use client";
import { useState } from "react";
import { Users, FileSpreadsheet, LayoutList, FolderTree } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DemoAlert } from "@/components/DemoAlert";
import { SITUACOES_ACADEMICAS } from "@/lib/constants";

export default function Alunos(){
  const [aba,setAba]=useState("manual");
  return <><PageHeader eyebrow="GESTÃO ACADÊMICA" title="Alunos" description="Cadastro manual, importação por Excel e duas formas de consulta."/><DemoAlert>Os campos abaixo são demonstrativos e não salvam dados. Não digite informações pessoais reais nesta versão.</DemoAlert>
  <div className="tabs"><button onClick={()=>setAba("manual")} className={aba==="manual"?"tab-active":""}>Cadastro manual</button><button onClick={()=>setAba("excel")} className={aba==="excel"?"tab-active":""}>Importação Excel</button><button onClick={()=>setAba("consulta")} className={aba==="consulta"?"tab-active":""}>Consulta</button></div>
  {aba==="manual"&&<section className="surface form-section"><div className="section-name"><Users size={21}/><h2>Ficha cadastral</h2></div><div className="form-grid"><label className="field-block">Nome completo<input className="form-input" placeholder="Nome do estudante" disabled/></label><label className="field-block">CPF<input className="form-input" placeholder="000.000.000-00" disabled/></label><label className="field-block">Matrícula<input className="form-input" placeholder="Ex.: ENF260001" disabled/></label><label className="field-block">Curso e turma<input className="form-input" placeholder="Curso / turma" disabled/></label><label className="field-block">Situação acadêmica<select className="form-input" disabled>{SITUACOES_ACADEMICAS.map(s=><option key={s.codigo} value={s.codigo}>{s.codigo} — {s.descricao}</option>)}</select></label></div><p className="field-hint">Na ficha completa haverá dados pessoais, vínculos acadêmicos, cursos, turmas e histórico documental.</p></section>}
  {aba==="excel"&&<section className="surface center-state"><FileSpreadsheet size={35}/><h2>Importação .xlsx</h2><p>Prévia, validação por linha e detecção de duplicidade por CPF e matrícula. A rotina será implementada após o banco de dados e as permissões.</p><button disabled className="btn btn-disabled">Importar planilha — em breve</button></section>}
  {aba==="consulta"&&<section className="surface center-state"><LayoutList size={35}/><h2>Lista geral e visualização por curso e turma</h2><p>A consulta permitirá filtrar situação acadêmica, curso e turma, além de localizar alunos por nome, CPF ou matrícula.</p><div className="two-options"><span><LayoutList size={19}/> Lista geral</span><span><FolderTree size={19}/> Por curso e turma</span></div></section>}
  </>;
}
