"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, BookOpenCheck, CheckCircle2, GraduationCap, Plus, RefreshCw, Search, Save, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { MODALIDADES } from "@/lib/constants";

type Curso = {
  id: string; nome: string; eixo_tecnologico: string | null; modalidade: string;
  forma_oferta: string; carga_horaria_total: number | null;
  carga_horaria_estagio: number | null; ativo: boolean;
};
type Turma = {
  id: string; curso_id: string; codigo: string; turno: string;
  data_inicio: string | null; previsao_termino: string | null;
  dias_aula: string | null; horarios_aula: string | null; ativo: boolean;
};
type CursoForm = {
  nome: string; eixo_tecnologico: string; modalidade: "EPS" | "EPC";
  carga_horaria_total: string; carga_horaria_estagio: string; ativo: boolean;
};
type TurmaForm = {
  curso_id: string; codigo: string; turno: "MANHA" | "TARDE" | "NOITE" | "INTEGRAL";
  data_inicio: string; previsao_termino: string; dias_aula: string;
  horarios_aula: string; ativo: boolean;
};
const CURSO_VAZIO: CursoForm = { nome: "", eixo_tecnologico: "", modalidade: "EPS", carga_horaria_total: "", carga_horaria_estagio: "", ativo: true };
const TURMA_VAZIA: TurmaForm = { curso_id: "", codigo: "", turno: "MANHA", data_inicio: "", previsao_termino: "", dias_aula: "", horarios_aula: "", ativo: true };
const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const TURNOS = [{ v: "MANHA", t: "Manhã" }, { v: "TARDE", t: "Tarde" }, { v: "NOITE", t: "Noite" }, { v: "INTEGRAL", t: "Integral" }] as const;
function numero(v: string, rotulo: string, minimo: number): number | null {
  if (!v.trim()) return null;
  if (!/^\d+$/.test(v.trim())) throw new Error(`${rotulo}: informe um número inteiro.`);
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < minimo) throw new Error(`${rotulo}: valor inválido.`);
  return n;
}
function msgErro(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return "Esse curso ou código de turma já existe. Verifique os registros cadastrados.";
  }
  if (typeof error === "object" && error !== null && "message" in error) return String(error.message);
  return error instanceof Error ? error.message : String(error);
}
function dataBr(d: string | null) { if (!d) return "—"; const [a, m, dia] = d.slice(0, 10).split("-"); return `${dia}/${m}/${a}`; }

export function CursosTurmasClient({ podeEditar }: { podeEditar: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [aba, setAba] = useState<"cursos" | "turmas">("cursos");
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [busca, setBusca] = useState("");
  const [apenasAtivos, setApenasAtivos] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [cursoForm, setCursoForm] = useState<CursoForm>({ ...CURSO_VAZIO });
  const [turmaForm, setTurmaForm] = useState<TurmaForm>({ ...TURMA_VAZIA });
  const [edicao, setEdicao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro("");
    try {
      const [respCursos, respTurmas] = await Promise.all([
        supabase.from("cursos").select("id,nome,eixo_tecnologico,modalidade,forma_oferta,carga_horaria_total,carga_horaria_estagio,ativo").order("nome").limit(300),
        supabase.from("turmas").select("id,curso_id,codigo,turno,data_inicio,previsao_termino,dias_aula,horarios_aula,ativo").order("codigo").limit(500)
      ]);
      if (respCursos.error) throw respCursos.error;
      if (respTurmas.error) throw respTurmas.error;
      setCursos((respCursos.data ?? []) as Curso[]);
      setTurmas((respTurmas.data ?? []) as Turma[]);
    } catch (e) { setErro(`Falha ao consultar cursos e turmas: ${msgErro(e)}`); }
    finally { setCarregando(false); }
  }, [supabase]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    if (formAberto) {
      requestAnimationFrame(() => document.getElementById("form-cursos-turmas")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [formAberto, edicao, aba]);

  const cursosPorId = useMemo(() => new Map(cursos.map(c => [c.id, c])), [cursos]);
  const cursosFiltrados = useMemo(() => cursos.filter(c =>
    (!apenasAtivos || c.ativo) &&
    `${c.nome} ${c.eixo_tecnologico || ""} ${c.modalidade}`.toLowerCase().includes(busca.trim().toLowerCase())
  ), [cursos, apenasAtivos, busca]);
  const turmasFiltradas = useMemo(() => turmas.filter(t =>
    (!apenasAtivos || t.ativo) &&
    `${t.codigo} ${t.turno} ${cursosPorId.get(t.curso_id)?.nome || ""}`.toLowerCase().includes(busca.trim().toLowerCase())
  ), [turmas, cursosPorId, apenasAtivos, busca]);

  function mudarAba(nova: "cursos" | "turmas") {
    setAba(nova); setBusca(""); setErro(""); setSucesso(""); setFormAberto(false); setEdicao(null);
  }
  function novo() {
    setEdicao(null); setErro(""); setSucesso(""); setCursoForm({ ...CURSO_VAZIO });
    setTurmaForm({ ...TURMA_VAZIA, curso_id: cursos.find(c => c.ativo)?.id ?? "" });
    setFormAberto(true);
  }
  function editarCurso(c: Curso) {
    setEdicao(c.id); setAba("cursos"); setFormAberto(true); setErro(""); setSucesso("");
    setCursoForm({
      nome: c.nome, eixo_tecnologico: c.eixo_tecnologico ?? "", modalidade: c.modalidade as "EPS" | "EPC",
      carga_horaria_total: c.carga_horaria_total === null ? "" : String(c.carga_horaria_total),
      carga_horaria_estagio: c.carga_horaria_estagio === null ? "" : String(c.carga_horaria_estagio), ativo: c.ativo
    });
  }
  function editarTurma(t: Turma) {
    setEdicao(t.id); setAba("turmas"); setFormAberto(true); setErro(""); setSucesso("");
    setTurmaForm({
      curso_id: t.curso_id, codigo: t.codigo, turno: t.turno as TurmaForm["turno"],
      data_inicio: t.data_inicio ?? "", previsao_termino: t.previsao_termino ?? "",
      dias_aula: t.dias_aula ?? "", horarios_aula: t.horarios_aula ?? "", ativo: t.ativo
    });
  }
  async function salvarCurso(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!podeEditar) return;
    setErro(""); setSucesso("");
    const nome = cursoForm.nome.trim().replace(/\s+/g, " ");
    if (nome.length < 3 || nome.length > 180) { setErro("Informe o nome oficial do curso (3 a 180 caracteres)."); return; }
    let total: number | null; let estagio: number | null;
    try { total = numero(cursoForm.carga_horaria_total, "Carga horária total", 1); estagio = numero(cursoForm.carga_horaria_estagio, "Carga horária de estágio", 0); }
    catch (err) { setErro(msgErro(err)); return; }
    if (total !== null && estagio !== null && estagio > total) { setErro("O estágio não pode exceder a carga horária total."); return; }
    setSalvando(true);
    try {
      const dados = {
        nome, eixo_tecnologico: cursoForm.eixo_tecnologico.trim() || null,
        modalidade: cursoForm.modalidade, carga_horaria_total: total,
        carga_horaria_estagio: estagio, ativo: cursoForm.ativo
        // forma_oferta permanece com o default '01' do banco, conforme SQL institucional.
      };
      const resposta = edicao
        ? await supabase.from("cursos").update(dados).eq("id", edicao).select("id").single()
        : await supabase.from("cursos").insert(dados).select("id").single();
      if (resposta.error) throw resposta.error;
      setFormAberto(false); setEdicao(null); await carregar();
      setSucesso(edicao ? "Curso atualizado com sucesso." : "Curso cadastrado com sucesso.");
    } catch (err) { setErro(msgErro(err)); }
    finally { setSalvando(false); }
  }
  async function salvarTurma(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!podeEditar) return;
    setErro(""); setSucesso("");
    const codigo = turmaForm.codigo.trim().toUpperCase();
    if (!turmaForm.curso_id || !cursosPorId.has(turmaForm.curso_id)) { setErro("Selecione um curso válido."); return; }
    if (!/^[A-Z0-9._/-]{2,40}$/.test(codigo)) { setErro("Código da turma inválido. Use 2 a 40 caracteres, sem espaços."); return; }
    if (turmaForm.data_inicio && turmaForm.previsao_termino && turmaForm.previsao_termino < turmaForm.data_inicio) {
      setErro("A previsão de término não pode ser anterior ao início."); return;
    }
    setSalvando(true);
    try {
      const dados = {
        curso_id: turmaForm.curso_id, codigo, turno: turmaForm.turno,
        data_inicio: turmaForm.data_inicio || null, previsao_termino: turmaForm.previsao_termino || null,
        dias_aula: turmaForm.dias_aula.trim() || null, horarios_aula: turmaForm.horarios_aula.trim() || null,
        ativo: turmaForm.ativo
      };
      const resposta = edicao
        ? await supabase.from("turmas").update(dados).eq("id", edicao).select("id").single()
        : await supabase.from("turmas").insert(dados).select("id").single();
      if (resposta.error) throw resposta.error;
      setFormAberto(false); setEdicao(null); await carregar();
      setSucesso(edicao ? "Turma atualizada com sucesso." : "Turma cadastrada com sucesso.");
    } catch (err) { setErro(msgErro(err)); }
    finally { setSalvando(false); }
  }
  function cursoAlterar<K extends keyof CursoForm>(campo: K, valor: CursoForm[K]) { setCursoForm(v => ({ ...v, [campo]: valor })); }
  function turmaAlterar<K extends keyof TurmaForm>(campo: K, valor: TurmaForm[K]) { setTurmaForm(v => ({ ...v, [campo]: valor })); }

  return <>
    <PageHeader eyebrow="ESTRUTURA ACADÊMICA · DADOS REAIS" title="Cursos e turmas" description="Cadastre os cursos oficiais e vincule as turmas às matrículas dos alunos." />
    {!podeEditar && <div className="demo-alert"><BookOpenCheck size={17}/><span>Modo consulta — Inspeção Escolar. Alterações não são permitidas para este perfil.</span></div>}
    <div className="tabs"><button type="button" className={aba === "cursos" ? "tab-active" : ""} onClick={() => mudarAba("cursos")}>Cursos ({cursos.length})</button><button type="button" className={aba === "turmas" ? "tab-active" : ""} onClick={() => mudarAba("turmas")}>Turmas ({turmas.length})</button></div>
    {erro && <div role="alert" className="cad-alert cad-error"><AlertCircle size={17}/>{erro}</div>}
    {sucesso && <div role="status" className="cad-alert cad-success"><CheckCircle2 size={17}/>{sucesso}</div>}
    <section className="surface form-section">
      <div className="surface-title"><h2>{aba === "cursos" ? "Relação de cursos" : "Relação de turmas"}</h2><div className="cad-actions" style={{marginTop:0}}><button type="button" className="btn btn-light" disabled={carregando} onClick={() => void carregar()}><RefreshCw size={16}/>{carregando ? "Carregando..." : "Atualizar"}</button>{podeEditar && <button type="button" className="btn btn-primary" onClick={novo}><Plus size={16}/>{aba === "cursos" ? "Novo curso" : "Nova turma"}</button>}</div></div>
      <div className="filters"><div className="search-field"><Search size={17}/><input aria-label="Pesquisar cursos ou turmas" placeholder={aba === "cursos" ? "Buscar pelo nome ou eixo tecnológico" : "Buscar por código, curso ou turno"} value={busca} onChange={e => setBusca(e.target.value)}/></div><label className="cad-checkbox"><input type="checkbox" checked={apenasAtivos} onChange={e => setApenasAtivos(e.target.checked)}/> Apenas ativos</label></div>
      <div className="table-wrap"><table className="records-table"><thead>{aba === "cursos" ? <tr><th>Curso</th><th>Modalidade</th><th>Carga horária</th><th>Situação</th>{podeEditar && <th>Ação</th>}</tr> : <tr><th>Código / Curso</th><th>Turno</th><th>Período</th><th>Dias / horários</th><th>Situação</th>{podeEditar && <th>Ação</th>}</tr>}</thead><tbody>
      {aba === "cursos" ? cursosFiltrados.map(c => <tr key={c.id}><td><strong>{c.nome}</strong><small>{c.eixo_tecnologico || "Eixo não informado"}</small></td><td>{MODALIDADES.find(m => m.codigo === c.modalidade)?.descricao ?? c.modalidade}</td><td>{c.carga_horaria_total ?? "—"} h<small>Estágio: {c.carga_horaria_estagio ?? "—"} h</small></td><td><span className={`pill ${c.ativo ? "pill-ok" : "pill-pending"}`}>{c.ativo ? "Ativo" : "Inativo"}</span></td>{podeEditar && <td><button type="button" className="btn btn-light" onClick={() => editarCurso(c)}>Editar</button></td>}</tr>) : turmasFiltradas.map(t => <tr key={t.id}><td><strong>{t.codigo}</strong><small>{cursosPorId.get(t.curso_id)?.nome || "Curso não encontrado"}</small></td><td>{TURNOS.find(x => x.v === t.turno)?.t || t.turno}</td><td>{dataBr(t.data_inicio)}<small>Previsão: {dataBr(t.previsao_termino)}</small></td><td>{t.dias_aula || "—"}<small>{t.horarios_aula || "—"}</small></td><td><span className={`pill ${t.ativo ? "pill-ok" : "pill-pending"}`}>{t.ativo ? "Ativa" : "Inativa"}</span></td>{podeEditar && <td><button type="button" className="btn btn-light" onClick={() => editarTurma(t)}>Editar</button></td>}</tr>)}
      {(aba === "cursos" ? cursosFiltrados.length === 0 : turmasFiltradas.length === 0) && <tr><td colSpan={6}>Nenhum registro encontrado. {aba === "turmas" && cursos.length === 0 ? "Cadastre um curso antes de criar turmas." : ""}</td></tr>}
      </tbody></table></div><p className="field-hint">Consulta limitada aos primeiros 300 cursos e 500 turmas. Não existe exclusão direta nesta etapa.</p>
    </section>
    {podeEditar && formAberto && <section className="surface form-section" id="form-cursos-turmas"><div className="surface-title"><h2>{edicao ? "Editar" : "Cadastrar"} {aba === "cursos" ? "curso" : "turma"}</h2><button type="button" className="btn btn-light" onClick={() => { setFormAberto(false); setErro(""); }}><X size={16}/>Cancelar</button></div>
      {aba === "cursos" ? <form onSubmit={e => void salvarCurso(e)}><div className="form-grid">
        <label className="field-block">Nome oficial *<input className="form-input" required maxLength={180} value={cursoForm.nome} onChange={e => cursoAlterar("nome", e.target.value)} placeholder="Ex.: Técnico em Enfermagem" /></label>
        <label className="field-block">Eixo tecnológico<input className="form-input" maxLength={180} value={cursoForm.eixo_tecnologico} onChange={e => cursoAlterar("eixo_tecnologico", e.target.value)} placeholder="Ex.: Ambiente e Saúde" /></label>
        <label className="field-block">Modalidade *<select className="form-input" value={cursoForm.modalidade} onChange={e => cursoAlterar("modalidade", e.target.value as CursoForm["modalidade"])}>{MODALIDADES.map(m => <option value={m.codigo} key={m.codigo}>{m.codigo} — {m.descricao}</option>)}</select></label>
        <label className="field-block">Carga horária total (horas)<input className="form-input" type="number" min="1" step="1" value={cursoForm.carga_horaria_total} onChange={e => cursoAlterar("carga_horaria_total", e.target.value)} /></label>
        <label className="field-block">Carga horária de estágio (horas)<input className="form-input" type="number" min="0" step="1" value={cursoForm.carga_horaria_estagio} onChange={e => cursoAlterar("carga_horaria_estagio", e.target.value)} /></label>
        <label className="field-block">Situação<select className="form-input" value={cursoForm.ativo ? "ativo" : "inativo"} onChange={e => cursoAlterar("ativo", e.target.value === "ativo")}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
      </div><p className="field-hint">A forma de oferta é preenchida automaticamente pelo banco conforme a configuração institucional vigente (01).</p><div className="cad-actions"><button className="btn btn-primary" type="submit" disabled={salvando}><Save size={16}/>{salvando ? "Salvando..." : "Salvar curso"}</button></div></form>
      : <form onSubmit={e => void salvarTurma(e)}><div className="form-grid">
        <label className="field-block">Curso vinculado *<select className="form-input" required value={turmaForm.curso_id} onChange={e => turmaAlterar("curso_id", e.target.value)}><option value="">Selecionar curso</option>{cursos.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.modalidade}{c.ativo ? "" : " (inativo)"}</option>)}</select></label>
        <label className="field-block">Código da turma *<input className="form-input" required maxLength={40} value={turmaForm.codigo} onChange={e => turmaAlterar("codigo", e.target.value)} placeholder="Ex.: ENF17-M" /></label>
        <label className="field-block">Turno *<select className="form-input" value={turmaForm.turno} onChange={e => turmaAlterar("turno", e.target.value as TurmaForm["turno"])}>{TURNOS.map(t => <option key={t.v} value={t.v}>{t.t}</option>)}</select></label>
        <label className="field-block">Data de início<input className="form-input" type="date" value={turmaForm.data_inicio} onChange={e => turmaAlterar("data_inicio", e.target.value)} /></label>
        <label className="field-block">Previsão de término<input className="form-input" type="date" value={turmaForm.previsao_termino} onChange={e => turmaAlterar("previsao_termino", e.target.value)} /></label>
        <label className="field-block">Horários de aula<input className="form-input" value={turmaForm.horarios_aula} onChange={e => turmaAlterar("horarios_aula", e.target.value)} placeholder="Ex.: 07h às 11h" /></label>
        <fieldset className="cad-week"><legend>Dias de aula</legend><div className="cad-week-grid">{DIAS.map(d => <label key={d}><input type="checkbox" checked={turmaForm.dias_aula.split(",").map(x=>x.trim()).includes(d)} onChange={e => { const atual=turmaForm.dias_aula.split(",").map(x=>x.trim()).filter(Boolean); turmaAlterar("dias_aula", e.target.checked ? [...atual,d].join(", ") : atual.filter(x=>x!==d).join(", ")); }}/>{d}</label>)}</div></fieldset>
        <label className="field-block">Situação<select className="form-input" value={turmaForm.ativo ? "ativo" : "inativo"} onChange={e => turmaAlterar("ativo", e.target.value === "ativo")}><option value="ativo">Ativa</option><option value="inativo">Inativa</option></select></label>
      </div><div className="cad-actions"><button className="btn btn-primary" type="submit" disabled={salvando || cursos.length === 0}><Save size={16}/>{salvando ? "Salvando..." : "Salvar turma"}</button></div></form>}
    </section>}
    {podeEditar && !formAberto && aba === "turmas" && cursos.length === 0 && <div className="demo-alert"><GraduationCap size={17}/><span>Cadastre pelo menos um curso para habilitar a criação de turmas.</span></div>}
  </>;
}
