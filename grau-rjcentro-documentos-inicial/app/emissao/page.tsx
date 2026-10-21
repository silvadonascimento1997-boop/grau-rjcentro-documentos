"use client";

import { useState } from "react";
import { FilePlus2, UserSearch, ClipboardCheck, PenLine, Eye, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DemoAlert } from "@/components/DemoAlert";
import { TIPOS_DOCUMENTO } from "@/lib/constants";

export default function Emissao() {
  const [tipo, setTipo] = useState<string>(TIPOS_DOCUMENTO[0].id);
  const [assinaturas, setAssinaturas] = useState<string[]>(["Secretário Escolar"]);
  const assinantes = ["Secretário Escolar", "Diretor Escolar", "Coordenação Pedagógica", "Responsável pelo Estágio"];
  const toggle = (nome: string) => setAssinaturas(atuais => atuais.includes(nome) ? atuais.filter(a=>a!==nome) : [...atuais, nome]);
  return <>
    <PageHeader eyebrow="DOCUMENTOS ESCOLARES" title="Emitir documento" description="Fluxo de emissão: escolher, localizar o aluno, conferir, assinar e registrar."/>
    <DemoAlert>Somente o protótipo visual está disponível. A numeração CEE, geração de PDF e emissão oficial exigem o banco de dados e os controles de assinatura.</DemoAlert>
    <section className="surface form-section"><div className="section-name"><FilePlus2 size={21}/><h2>1. Tipo de documento</h2></div><label className="field-label" htmlFor="tipo">Modelo aprovado</label><select id="tipo" className="form-input" value={tipo} onChange={event=>setTipo(event.target.value)}>{TIPOS_DOCUMENTO.map(t=><option value={t.id} key={t.id}>{t.nome}</option>)}</select><p className="field-hint">Código CEE do tipo: {TIPOS_DOCUMENTO.find(t=>t.id===tipo)?.cee}. A sequência regulamentar será atribuída pelo servidor após a confirmação.</p></section>
    <section className="surface form-section"><div className="section-name"><UserSearch size={21}/><h2>2. Selecionar aluno</h2></div><label className="field-label" htmlFor="busca">Nome, CPF ou matrícula</label><input id="busca" disabled className="form-input" placeholder="Pesquisa habilitada após o cadastro no Supabase"/><p className="field-hint">Serão recuperados apenas os dados de alunos autorizados no sistema.</p></section>
    <section className="surface form-section"><div className="section-name"><ClipboardCheck size={21}/><h2>3. Conferência</h2></div><p className="secondary-text">Campos personalizados de curso, período, carga horária e informações do documento serão incluídos nesta etapa funcional. A Coordenação poderá ajustar os dados somente na emissão, preservando o cadastro e o histórico.</p></section>
    <section className="surface form-section"><div className="section-name"><PenLine size={21}/><h2>4. Assinaturas visíveis</h2></div><p className="secondary-text">Escolha os blocos que aparecerão no rodapé. As assinaturas digitais legalmente necessárias serão exigidas separadamente, sem possibilidade de dispensa por este controle.</p><div className="checks">{assinantes.map(nome=><label className="check-line" key={nome}><input type="checkbox" checked={assinaturas.includes(nome)} onChange={()=>toggle(nome)}/>{nome}</label>)}</div><div className={`signature-preview ${assinaturas.length===1?"signature-single":""}`}>{assinaturas.map(nome=><div key={nome} className="signature"><span className="signature-line"/><strong>{nome}</strong><small>Bloco visual de assinatura</small></div>)}{assinaturas.length===0&&<span className="secondary-text">Nenhum bloco visual selecionado.</span>}</div></section>
    <section className="surface form-section"><div className="section-name"><Eye size={21}/><h2>5. Pré-visualização e emissão</h2></div><p className="secondary-text">A prévia não receberá número definitivo. Após a conferência, o registro oficial será criado de forma transacional e encaminhado para assinatura digital.</p><button className="btn btn-disabled" disabled type="button"><LockKeyhole size={18}/> Emissão indisponível nesta etapa</button></section>
  </>;
}
