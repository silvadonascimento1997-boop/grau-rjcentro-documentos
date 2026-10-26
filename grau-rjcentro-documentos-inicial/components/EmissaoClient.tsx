'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ClipboardCheck, FilePlus2, FileText, LockKeyhole, PenLine, RefreshCw, Search, UserSearch } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { createClient } from '@/lib/supabase/client';
import { ESCOLA } from '@/lib/constants';

type Curso = { id: string; nome: string; modalidade: string; carga_horaria_total: number | null };
type Turma = { id: string; codigo: string; turno: string; data_inicio: string | null; previsao_termino: string | null; dias_aula: string | null; horarios_aula: string | null; cursos: Curso | Curso[] | null };
type Aluno = { id: string; nome_completo: string; cpf: string | null; rg: string | null; orgao_expedidor: string | null };
type MatriculaDB = { id: string; numero_matricula: string; situacao_academica: string; modulo_atual: string | null; data_inicio: string | null; previsao_conclusao: string | null; alunos: Aluno | Aluno[] | null; turmas: Turma | Turma[] | null };
type Vinculo = { id: string; numero: string; situacao: string; aluno: Aluno; turma: Omit<Turma, 'cursos'>; curso: Curso; modulo: string; dataInicio: string; previsaoFim: string };
type Dados = { modulo: string; cargaHoraria: string; inicio: string; termino: string; turno: string; diasAula: string; horarios: string; observacoes: string };
type Rascunho = { id: string; matricula_id: string; dados_documento: unknown; assinaturas_visuais: unknown; criado_em: string };
const ASSINANTES = ['Diretor Escolar', 'Secretário Escolar', 'Coordenação Pedagógica'];
const VAZIO: Dados = { modulo: '', cargaHoraria: '', inicio: '', termino: '', turno: '', diasAula: '', horarios: '', observacoes: '' };
function objeto<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
function normalizar(r: MatriculaDB): Vinculo | null {
  const aluno = objeto(r.alunos); const turma = objeto(r.turmas); const curso = objeto(turma?.cursos);
  if (!aluno || !turma || !curso) return null;
  const { cursos: _, ...turmaSemCurso } = turma;
  return { id:r.id, numero:r.numero_matricula, situacao:r.situacao_academica.trim(), aluno, turma:turmaSemCurso, curso, modulo:r.modulo_atual??'', dataInicio:r.data_inicio??turma.data_inicio??'', previsaoFim:r.previsao_conclusao??turma.previsao_termino??'' };
}
function iniciais(v: Vinculo): Dados {
  return { modulo:v.modulo, cargaHoraria:v.curso.carga_horaria_total === null ? '' : String(v.curso.carga_horaria_total), inicio:v.dataInicio, termino:v.previsaoFim, turno:v.turma.turno, diasAula:v.turma.dias_aula??'', horarios:v.turma.horarios_aula??'', observacoes:'' };
}
function dataBR(v: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'não informada'; const [a,m,d]=v.split('-');return `${d}/${m}/${a}`; }
function cpfBR(v: string | null) { const digits=(v??'').replace(/\D/g,''); return digits.length===11?digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):digits||'não informado'; }
function turnoBR(t:string){return ({MANHA:'manhã',TARDE:'tarde',NOITE:'noite',INTEGRAL:'integral'} as Record<string,string>)[t]??t.toLowerCase();}
function erroTexto(e: unknown) { return e instanceof Error ? e.message : String(e); }
function dataValida(v:string) { return !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime()) && new Date(`${v}T12:00:00`).toISOString().slice(0,10)===v); }
function dadosValidos(d:Dados) { return /^\d{1,5}$/.test(d.cargaHoraria) && Number(d.cargaHoraria)>0 && Number(d.cargaHoraria)<=99999 && dataValida(d.inicio) && dataValida(d.termino) && (!d.inicio || !d.termino || d.termino>=d.inicio) && d.turno.trim().length>0; }

export function EmissaoClient() {
  const supabase=useMemo(()=>createClient(),[]);
  const [busca,setBusca]=useState('');
  const [resultados,setResultados]=useState<Vinculo[]>([]);
  const [selecionado,setSelecionado]=useState<Vinculo|null>(null);
  const [dados,setDados]=useState<Dados>({...VAZIO});
  const [assinaturas,setAssinaturas]=useState<string[]>(['Diretor Escolar','Secretário Escolar']);
  const [rascunhoId,setRascunhoId]=useState<string|null>(null);
  const [rascunhos,setRascunhos]=useState<Rascunho[]>([]);
  const [carregando,setCarregando]=useState(false);
  const [salvando,setSalvando]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const [conferido,setConferido]=useState(false);
  const [mostrarPrevia,setMostrarPrevia]=useState(false);

  async function pesquisar(ev:FormEvent<HTMLFormElement>) {
    ev.preventDefault();setErro('');setSucesso('');setResultados([]);setSelecionado(null);setRascunhoId(null);setMostrarPrevia(false);setConferido(false);
    const termo=busca.trim(); if(termo.length<3 || termo.length>100){setErro('Informe pelo menos 3 caracteres (limite de 100).');return;}
    setCarregando(true);
    try {
      const colunas='id,numero_matricula,situacao_academica,modulo_atual,data_inicio,previsao_conclusao,alunos(id,nome_completo,cpf,rg,orgao_expedidor),turmas(id,codigo,turno,data_inicio,previsao_termino,dias_aula,horarios_aula,cursos(id,nome,modalidade,carga_horaria_total))';
      const digits=termo.replace(/\D/g,'');
      // Consultas independentes evitam filtros cruzados ambíguos entre relacionamentos.
      // Não há listagem geral: buscamos somente depois da ação expressa do usuário.
      const alunoIds=new Set<string>();
      const queryAlunos = /^\d{11}$/.test(digits) && digits.length===termo.replace(/[.\-\s]/g,'').length
        ? supabase.from('alunos').select('id').eq('cpf',digits).limit(25)
        : supabase.from('alunos').select('id').ilike('nome_completo',`%${termo.replace(/[%_]/g,'')}%`).limit(25);
      const [a,m] = await Promise.all([
        queryAlunos,
        supabase.from('matriculas').select(colunas).ilike('numero_matricula',`%${termo.replace(/[%_]/g,'')}%`).limit(25)
      ]);
      if(a.error) throw a.error;
      if(m.error) throw m.error;
      (a.data??[]).forEach(r=>alunoIds.add(r.id));
      let completos=[...(m.data??[])];
      if(alunoIds.size){
        const porAluno=await supabase.from('matriculas').select(colunas).in('aluno_id',[...alunoIds]).limit(50);
        if(porAluno.error) throw porAluno.error;
        completos=[...completos,...(porAluno.data??[])];
      }
      const unicos=new Map<string,Vinculo>();
      for(const row of completos){ const v=normalizar(row as unknown as MatriculaDB); if(v)unicos.set(v.id,v); }
      setResultados([...unicos.values()].sort((a,b)=>a.aluno.nome_completo.localeCompare(b.aluno.nome_completo)).slice(0,50));
      if(unicos.size===0)setErro('Nenhuma matrícula localizada. Confira nome, CPF ou matrícula.');
    }catch(e){setErro('Não foi possível pesquisar as matrículas: '+erroTexto(e));}
    finally {setCarregando(false);}
  }
  function escolher(v:Vinculo){setSelecionado(v);setDados(iniciais(v));setRascunhoId(null);setMostrarPrevia(false);setConferido(false);setErro('');setSucesso('');}
  function atualizar(chave:keyof Dados,valor:string){setDados(d=>({...d,[chave]:valor}));setConferido(false);setMostrarPrevia(false);setSucesso('');}
  function alternarAssinatura(nome:string){setAssinaturas(a=>a.includes(nome)?a.filter(x=>x!==nome):[...a,nome]);setConferido(false);setMostrarPrevia(false);setSucesso('');}
  const valido=!!selecionado && selecionado.situacao==='MT' && dadosValidos(dados) && assinaturas.includes('Diretor Escolar') && assinaturas.includes('Secretário Escolar');
  function conferir() {setErro('');setSucesso('');if(!valido){setErro('Confira a situação acadêmica, a carga horária, as datas e as assinaturas obrigatórias.');return;}setMostrarPrevia(true);setConferido(true);}

  async function carregarRascunhos(){
    setErro('');setSucesso('');
    setCarregando(true);
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error('Sessão expirada. Entre novamente.');
      const r=await supabase.from('rascunhos_documentos').select('id,matricula_id,dados_documento,assinaturas_visuais,criado_em').eq('tipo_documento','DECLARACAO_VINCULO').eq('criado_por',user.id).order('criado_em',{ascending:false}).limit(30);
      if(r.error)throw r.error;
      setRascunhos((r.data??[]) as Rascunho[]);
      if(!r.data?.length)setSucesso('Ainda não existem rascunhos de Declaração de Vínculo associados ao seu usuário.');
    }catch(e){setErro('Não foi possível recuperar os rascunhos: '+erroTexto(e));}
    finally{setCarregando(false);}
  }
  async function abrirRascunho(r:Rascunho){
    setErro('');setSucesso('');setCarregando(true);
    try{
      const result=await supabase.from('matriculas').select('id,numero_matricula,situacao_academica,modulo_atual,data_inicio,previsao_conclusao,alunos(id,nome_completo,cpf,rg,orgao_expedidor),turmas(id,codigo,turno,data_inicio,previsao_termino,dias_aula,horarios_aula,cursos(id,nome,modalidade,carga_horaria_total))').eq('id',r.matricula_id).single();
      if(result.error)throw result.error;
      const v=normalizar(result.data as unknown as MatriculaDB);if(!v)throw new Error('Dados acadêmicos incompletos.');
      const saved=r.dados_documento as {campos?:Partial<Dados>};
      const base=iniciais(v);const campos=saved?.campos??{};
      const merged=Object.fromEntries((Object.keys(base) as (keyof Dados)[]).map(k=>[k,typeof campos[k]==='string'?String(campos[k]).slice(0,k==='observacoes'?600:120):base[k]])) as Dados;
      setSelecionado(v);setDados(merged);
      setAssinaturas(Array.isArray(r.assinaturas_visuais) ? r.assinaturas_visuais.filter((s):s is string=>typeof s==='string' && ASSINANTES.includes(s)):['Diretor Escolar','Secretário Escolar']);
      setRascunhoId(r.id);setMostrarPrevia(false);setConferido(false);setResultados([]);setSucesso('Rascunho recuperado. Confira os dados atuais antes de salvar novamente.');
    }catch(e){setErro('Falha ao abrir rascunho: '+erroTexto(e));}
    finally{setCarregando(false);}
  }

  async function salvarRascunho(){
    if(!valido || !selecionado || !conferido){setErro('Selecione uma matrícula ativa, confira os dados e abra a prévia antes de salvar.');return;}
    setSalvando(true);setErro('');setSucesso('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error('Sessão expirada. Entre novamente.');
      // O rascunho NÃO reserva número CEE, NÃO registra emissão, NÃO gera PDF oficial.
      // No futuro, o backend da emissão precisará rever estes valores contra o banco.
      const payload={tipo:'DECLARACAO_VINCULO',versao:7,campos:dados,conferido_em:new Date().toISOString(),aluno_nome_previa:selecionado.aluno.nome_completo,matricula_previa:selecionado.numero};
      if(rascunhoId){
        const result=await supabase.from('rascunhos_documentos').update({dados_documento:payload,assinaturas_visuais:assinaturas}).eq('id',rascunhoId).eq('criado_por',user.id).select('id').single();
        if(result.error)throw result.error;
      }else{
        const result=await supabase.from('rascunhos_documentos').insert({matricula_id:selecionado.id,tipo_documento:'DECLARACAO_VINCULO',dados_documento:payload,assinaturas_visuais:assinaturas,criado_por:user.id}).select('id').single();
        if(result.error)throw result.error;
        setRascunhoId(result.data.id);
      }
      setSucesso('Rascunho salvo no Supabase. Nenhum número CEE foi reservado e nenhum documento oficial foi emitido.');
    }catch(e){setErro('Falha ao salvar rascunho: '+erroTexto(e));}
    finally{setSalvando(false);}
  }

  return <>
    <PageHeader eyebrow="DOCUMENTOS ESCOLARES · ETAPA 0.7" title="Emitir documento" description="Pesquise uma matrícula real, confira os dados, visualize e salve um rascunho antes da emissão oficial." />
    <div className="em-aviso"><LockKeyhole size={19}/><div><strong>Emissão oficial ainda indisponível nesta etapa.</strong><div>A pesquisa e os rascunhos utilizam o Supabase. A prévia não tem validade documental; não há código CEE, PDF final, assinatura digital ou lançamento no Livro Eletrônico.</div></div></div>

    {erro&&<div className="em-erro" role="alert">{erro}</div>}
    {sucesso&&<div className="em-sucesso" role="status">{sucesso}</div>}

    <section className="surface form-section"><div className="section-name"><FilePlus2 size={21}/><h2>1. Tipo de documento</h2></div>
      <label htmlFor="documento" className="field-label">Modelo de documento</label><select className="form-input" id="documento" value="DECLARACAO_VINCULO" disabled><option value="DECLARACAO_VINCULO">Declaração de Vínculo Escolar — tipo 01</option></select>
      <p className="field-hint">Os demais modelos serão habilitados em etapas posteriores. O rascunho não recebe número sequencial.</p></section>

    <section className="surface form-section"><div className="section-name"><UserSearch size={21}/><h2>2. Selecionar aluno e matrícula</h2></div>
      <form className="em-form-busca" onSubmit={pesquisar}><div className="em-flex-grow"><label className="field-label" htmlFor="busca">Nome completo, CPF ou número de matrícula</label><input className="form-input" id="busca" autoComplete="off" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Informe pelo menos 3 caracteres" maxLength={100}/></div><button className="btn btn-primary" type="submit" disabled={carregando}><Search size={17}/> {carregando?'Consultando...':'Pesquisar'}</button></form>
      {resultados.length>0&&<div className="em-resultados" aria-label="Matrículas encontradas"><p className="secondary-text">{resultados.length} matrícula(s) localizada(s). Selecione o vínculo correto:</p>
        {resultados.map(v=><button className={`em-resultado ${selecionado?.id===v.id?'em-resultado-ativo':''}`} type="button" key={v.id} onClick={()=>escolher(v)}><span><strong>{v.aluno.nome_completo}</strong><small>CPF: {cpfBR(v.aluno.cpf)} · Matrícula: {v.numero}</small><small>{v.curso.nome} · {v.turma.codigo}</small></span><span className={v.situacao==='MT'?'em-tag-ok':'em-tag-alerta'}>{v.situacao==='MT'?'MT — Matriculado':v.situacao+' — conferir'}</span></button>)}
      </div>}
      {selecionado&&<div className="em-selecao"><strong>Matrícula selecionada: {selecionado.numero}</strong><div>{selecionado.aluno.nome_completo} · {selecionado.curso.nome} · {selecionado.turma.codigo}</div>{selecionado.situacao!=='MT'&&<p className="em-alerta-texto">A situação acadêmica é {selecionado.situacao}. Não é permitido criar uma declaração afirmando vínculo ativo sem conferência e regularização institucional.</p>}</div>}
      <div className="em-rascunhos"><button type="button" className="btn btn-light" disabled={carregando} onClick={()=>void carregarRascunhos()}><RefreshCw size={16}/> Meus rascunhos</button>
      {rascunhos.length>0&&<div className="em-lista-rascunhos">{rascunhos.map(r=><button key={r.id} onClick={()=>void abrirRascunho(r)} disabled={carregando} type="button">{String((r.dados_documento as {aluno_nome_previa?:string})?.aluno_nome_previa??'Declaração de Vínculo')} — {new Date(r.criado_em).toLocaleDateString('pt-BR')}</button>)}</div>}</div>
    </section>

    <section className="surface form-section"><div className="section-name"><ClipboardCheck size={21}/><h2>3. Conferência acadêmica</h2></div>
      {!selecionado?<p className="secondary-text">Selecione uma matrícula para preencher os dados de acordo com o cadastro institucional.</p>:<><p className="secondary-text">Os campos são carregados do banco e podem ser ajustados apenas para esta prévia. Alterações não modificam os cadastros oficiais.</p>
        <div className="em-grid">
          <label>Curso<input className="form-input" disabled value={selecionado.curso.nome}/></label>
          <label>Turma<input className="form-input" disabled value={selecionado.turma.codigo}/></label>
          <label>Módulo atual<input className="form-input" maxLength={120} value={dados.modulo} onChange={e=>atualizar('modulo',e.target.value)} placeholder="Quando aplicável"/></label>
          <label>Carga horária do curso (h) *<input className="form-input" inputMode="numeric" maxLength={5} value={dados.cargaHoraria} onChange={e=>atualizar('cargaHoraria',e.target.value.replace(/\D/g,''))}/></label>
          <label>Data de início<input className="form-input" type="date" value={dados.inicio} onChange={e=>atualizar('inicio',e.target.value)}/></label>
          <label>Previsão de término<input className="form-input" type="date" value={dados.termino} onChange={e=>atualizar('termino',e.target.value)}/></label>
          <label>Turno *<select className="form-input" value={dados.turno} onChange={e=>atualizar('turno',e.target.value)}><option value="">Selecione</option>{['MANHA','TARDE','NOITE','INTEGRAL'].map(x=><option key={x} value={x}>{turnoBR(x)}</option>)}</select></label>
          <label>Dias de aula<input className="form-input" maxLength={120} value={dados.diasAula} onChange={e=>atualizar('diasAula',e.target.value)}/></label>
          <label>Horários de aula<input className="form-input" maxLength={120} value={dados.horarios} onChange={e=>atualizar('horarios',e.target.value)}/></label>
          <label className="em-span-2">Observações internas (não entram na declaração)<textarea className="form-input" maxLength={600} rows={3} value={dados.observacoes} onChange={e=>atualizar('observacoes',e.target.value)}/></label>
        </div></>}
    </section>

    <section className="surface form-section"><div className="section-name"><PenLine size={21}/><h2>4. Assinaturas previstas</h2></div>
      <p className="secondary-text">Para documentação eletrônica que comprova escolaridade, o fluxo final exigirá assinaturas digitais válidas do Diretor ou Diretor Substituto e do Secretário Escolar. As opções abaixo representam apenas a posição visual dos signatários.</p>
      <div className="checks">{ASSINANTES.map(nome=><label className="check-line" key={nome}><input type="checkbox" checked={assinaturas.includes(nome)} onChange={()=>alternarAssinatura(nome)} disabled={nome==='Diretor Escolar'||nome==='Secretário Escolar'}/>{nome}{(nome==='Diretor Escolar'||nome==='Secretário Escolar')?' (obrigatório)':''}</label>)}</div>
    </section>

    <section className="surface form-section"><div className="section-name"><FileText size={21}/><h2>5. Pré-visualização e rascunho</h2></div>
      <p className="secondary-text">A pré-visualização é meramente administrativa, não constitui declaração oficial e não gera número CEE.</p>
      <div className="em-acoes"><button className="btn btn-primary" type="button" onClick={conferir} disabled={!valido}><ClipboardCheck size={17}/> Conferir e pré-visualizar</button>
        <button className="btn btn-light" type="button" onClick={()=>void salvarRascunho()} disabled={!valido||!conferido||salvando}><FileText size={17}/>{salvando?'Salvando...':rascunhoId?'Atualizar rascunho':'Salvar rascunho'}</button>
        <button className="btn btn-disabled" disabled type="button"><LockKeyhole size={17}/> Emitir documento oficial (indisponível)</button></div>
      {selecionado&&!valido&&<p className="em-alerta-texto">Para habilitar a prévia, é necessário vínculo MT, carga horária válida e presença dos dois blocos obrigatórios de assinatura.</p>}
      {mostrarPrevia&&selecionado&&<article className="em-documento" aria-label="Pré-visualização sem validade documental"><div className="em-marca">PRÉVIA · SEM VALIDADE DOCUMENTAL</div>
        <div className="em-papel"><header><strong>{ESCOLA.nome.toUpperCase()} — {ESCOLA.unidade.toUpperCase()}</strong><div>{ESCOLA.razaoSocial} · CNPJ {ESCOLA.cnpj}</div><div>{ESCOLA.endereco}</div><div>INEP {ESCOLA.inep}</div></header><h2>DECLARAÇÃO DE VÍNCULO ESCOLAR</h2>
          <p>Declaramos, para os fins pertinentes e mediante conferência das informações acadêmicas, que <strong>{selecionado.aluno.nome_completo}</strong>, CPF <strong>{cpfBR(selecionado.aluno.cpf)}</strong>{selecionado.aluno.rg?`, RG ${selecionado.aluno.rg}`:''}, possui matrícula de número <strong>{selecionado.numero}</strong> no curso <strong>{selecionado.curso.nome}</strong>, turma <strong>{selecionado.turma.codigo}</strong>, turno <strong>{turnoBR(dados.turno)}</strong>{dados.diasAula?`, com aulas em ${dados.diasAula}`:''}{dados.horarios?`, no horário ${dados.horarios}`:''}.</p>
          <p>O curso possui carga horária cadastrada para esta declaração de <strong>{dados.cargaHoraria} horas</strong>{dados.modulo?`, com indicação de módulo atual: ${dados.modulo}`:''}. Início: <strong>{dataBR(dados.inicio)}</strong>. Término previsto: <strong>{dataBR(dados.termino)}</strong>.</p>
          <div className="em-rodape">Rio de Janeiro, {new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}.</div>
          <div className="em-assinaturas">{assinaturas.map(nome => nome === 'Secretário Escolar' ? (
            <div key={nome} className="em-assinatura-secretario">
              <span>_________________________________</span>
              <strong>Charles Silva de Oliveira</strong>
              <span className="em-assinatura-cargo">Secretário Escolar</span>
              <span className="em-assinatura-ato">COOIEM-VI.CAD06.004677.2026</span>
              <span className="em-assinatura-publicacao">Publicado no DOERJ em 03/06/2026, pág. 30</span>
              <small>Assinatura eletrônica ainda não realizada</small>
            </div>
          ) : (
            <div key={nome}>
              <span>_________________________________</span>
              <strong>{nome}</strong>
              <small>Assinatura eletrônica ainda não realizada</small>
            </div>
          ))}</div>
          <footer>PRÉVIA ADMINISTRATIVA — NÃO POSSUI NÚMERO CEE, ASSINATURA DIGITAL OU REGISTRO NO LIVRO ELETRÔNICO.</footer>
        </div>
      </article>}
    </section>
  </>;
}
