'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FileSpreadsheet, Users, Search, RefreshCw, Save, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { createClient } from '@/lib/supabase/client';
import { SITUACOES_ACADEMICAS } from '@/lib/constants';
import {
  type Aluno, type AlunoForm, ALUNO_VAZIO, CAMPOS_ALUNO, ROTULOS,
  cpfExibicao, cpfValido, normalizarCpf, normalizarData, prepararAluno, validarAluno
} from '@/lib/alunos';

type Turma = { id:string; codigo:string; curso:string };
type Matricula = { id:string; aluno_id:string; numero_matricula:string; situacao_academica:string; turma_id:string };
type LinhaImportacao = { linha:number; dados:AlunoForm; situacao:string; gravado:boolean };

const COLUNAS: Record<string, keyof AlunoForm> = {
  nome_completo:'nome_completo', nome:'nome_completo', aluno:'nome_completo',
  cpf:'cpf', rg:'rg', orgao_expedidor:'orgao_expedidor',
  data_nascimento:'data_nascimento', nascimento:'data_nascimento',
  naturalidade:'naturalidade', nome_mae:'nome_mae', mae:'nome_mae',
  nome_pai:'nome_pai', pai:'nome_pai', email:'email', telefone:'telefone'
};
function identificarCabecalho(s: unknown) {
  return String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function msgErro(erro: unknown): string { return erro instanceof Error ? erro.message : String(erro); }

export default function PaginaAlunos() {
  const supabase = useMemo(() => createClient(), []);
  const [aba,setAba] = useState<'consulta'|'manual'|'excel'>('consulta');
  const [lista,setLista] = useState<Aluno[]>([]);
  const [matriculas,setMatriculas] = useState<Matricula[]>([]);
  const [turmas,setTurmas] = useState<Turma[]>([]);
  const [busca,setBusca] = useState('');
  const [carregando,setCarregando] = useState(false);
  const [salvando,setSalvando] = useState(false);
  const [erro,setErro] = useState('');
  const [sucesso,setSucesso] = useState('');
  const [form,setForm] = useState<AlunoForm>({...ALUNO_VAZIO});
  const [editando,setEditando] = useState<string|null>(null);
  const [numeroMatricula,setNumeroMatricula] = useState('');
  const [turmaSelecionada,setTurmaSelecionada] = useState('');
  const [situacao,setSituacao] = useState('MT');
  const [importacao,setImportacao] = useState<LinhaImportacao[]>([]);
  const [importando,setImportando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    const [a,t] = await Promise.all([
      supabase.from('alunos').select('*').order('nome_completo').limit(300),
      supabase.from('turmas').select('id,codigo,cursos(nome)').eq('ativo',true).order('codigo').limit(300)
    ]);
    if(a.error) setErro(`Falha ao consultar alunos: ${a.error.message}`);
    else setLista((a.data ?? []) as Aluno[]);
    if(t.error) setErro(prev=>prev || `Falha ao consultar turmas: ${t.error!.message}`);
    else setTurmas((t.data ?? []).map((item:any)=>({
      id:item.id, codigo:item.codigo, curso:Array.isArray(item.cursos) ? (item.cursos[0]?.nome ?? '') : (item.cursos?.nome ?? '')
    })));
    const m = await supabase.from('matriculas').select('id,aluno_id,numero_matricula,situacao_academica,turma_id').limit(1000);
    if(m.error) setErro(prev=>prev || `Falha ao consultar matrículas: ${m.error!.message}`);
    else setMatriculas((m.data ?? []) as Matricula[]);
    setCarregando(false);
  },[supabase]);
  useEffect(()=>{ void carregar(); },[carregar]);

  const listaFiltrada = useMemo(()=>{
    const filtro=busca.toLocaleLowerCase('pt-BR').trim();
    if(!filtro) return lista;
    const digitos=busca.replace(/\D/g,'');
    return lista.filter(a=> a.nome_completo.toLocaleLowerCase('pt-BR').includes(filtro) ||
      (digitos.length >= 3 && (a.cpf ?? '').includes(digitos)) ||
      matriculas.some(m=>m.aluno_id===a.id && m.numero_matricula.toLowerCase().includes(filtro)));
  },[busca,lista,matriculas]);

  function limparFormulario(){
    setForm({...ALUNO_VAZIO});setEditando(null);setNumeroMatricula('');setTurmaSelecionada('');setSituacao('MT');setErro('');setSucesso('');
  }
  function editar(a:Aluno){
    const {...campos}=a;
    const dados = Object.fromEntries(CAMPOS_ALUNO.map(c=>[c,campos[c] ?? ''])) as AlunoForm;
    setForm(dados); setEditando(a.id);setNumeroMatricula('');setTurmaSelecionada('');setAba('manual');setErro('');setSucesso('');
  }
  async function salvar(ev:FormEvent<HTMLFormElement>){
    ev.preventDefault();setErro('');setSucesso('');
    const dados=prepararAluno(form);const erroValidacao=validarAluno(dados);
    if(erroValidacao){setErro(erroValidacao);return;}
    if(Boolean(numeroMatricula.trim())!==Boolean(turmaSelecionada)) {
      setErro('Para criar uma matrícula, informe o número e selecione uma turma.');return;
    }
    if(numeroMatricula && !/^[A-Za-z0-9._-]{3,40}$/.test(numeroMatricula.trim())) {
      setErro('Número de matrícula inválido. Use entre 3 e 40 caracteres, sem espaços.');return;
    }
    setSalvando(true);
    try{
      const cpf = normalizarCpf(dados.cpf);
      const existe=await supabase.from('alunos').select('id').eq('cpf',cpf).maybeSingle();
      if(existe.error) throw new Error(existe.error.message);
      if(existe.data && existe.data.id !== editando){setErro('CPF já cadastrado. Utilize a pesquisa para localizar a ficha existente.');return;}
      if(numeroMatricula){
        const confere=await supabase.from('matriculas').select('id').eq('numero_matricula',numeroMatricula.trim()).maybeSingle();
        if(confere.error) throw new Error(confere.error.message);
        if(confere.data) throw new Error('Esse número de matrícula já está cadastrado.');
      }
      if(editando){
        const r=await supabase.from('alunos').update(dados).eq('id',editando).select('id').single();
        if(r.error) throw new Error(r.error.message);
        if(numeroMatricula && turmaSelecionada){
          const vinculo=await supabase.from('matriculas').insert({aluno_id:editando,turma_id:turmaSelecionada,numero_matricula:numeroMatricula.trim(),situacao_academica:situacao});
          if(vinculo.error) throw new Error(`Ficha atualizada, mas matrícula não vinculada: ${vinculo.error.message}`);
          setNumeroMatricula('');setTurmaSelecionada('');
        }
        setSucesso('Ficha cadastral atualizada.');
      } else {
        const r=await supabase.from('alunos').insert(dados).select('id').single();
        if(r.error) throw new Error(r.error.message);
        if(numeroMatricula && turmaSelecionada){
          const vinculo=await supabase.from('matriculas').insert({
            aluno_id:r.data.id, turma_id:turmaSelecionada,numero_matricula:numeroMatricula.trim(),situacao_academica:situacao
          });
          if(vinculo.error) {
            setEditando(r.data.id);
            throw new Error(`Aluno salvo, mas a matrícula não foi incluída: ${vinculo.error.message}. Não recadastre o CPF.`);
          }
        }
        setSucesso('Aluno cadastrado com sucesso.');setForm({...ALUNO_VAZIO});setNumeroMatricula('');setTurmaSelecionada('');
      }
      await carregar();
    }catch(e){setErro(msgErro(e));}
    finally{setSalvando(false);}
  }

  async function lerExcel(file?:File){
    setErro('');setSucesso('');setImportacao([]);
    if(!file) return;
    if(!/\.xlsx$/i.test(file.name)){setErro('Selecione uma planilha Excel .xlsx (não .xls).');return;}
    if(file.size > 3 * 1024 * 1024){setErro('Arquivo acima de 3 MB. Divida a importação em arquivos menores.');return;}
    try {
      const {readSheet}=await import('read-excel-file/browser');
      const linhas=await readSheet(file);
      if(linhas.length<2){setErro('A planilha deve conter cabeçalho e ao menos um aluno.');return;}
      if(linhas.length>101){setErro('Limite de 100 alunos por importação. Divida a planilha em lotes.');return;}
      const cabecalhos=linhas[0].map(identificarCabecalho);
      if(cabecalhos.some(h=>['matricula','numero_matricula','turma','situacao_academica'].includes(h))){
        setErro('Esta importação recebe apenas dados pessoais. Remova colunas de matrícula e turma; vínculos podem ser criados na ficha do aluno.');return;
      }
      const colunas=cabecalhos.map(h=>COLUNAS[h] || null);
      if(new Set(colunas.filter(Boolean)).size !== colunas.filter(Boolean).length){
        setErro('Há colunas duplicadas na planilha. Utilize o modelo de importação.');return;
      }
      if(!colunas.includes('nome_completo') || !colunas.includes('cpf')) {
        setErro('Colunas obrigatórias ausentes: nome_completo e cpf. Use o modelo disponibilizado.');return;
      }
      const cpfsLote=new Set<string>();
      const provisorias: LinhaImportacao[] = [];
      for(let i=1;i<linhas.length;i++){
        const celulas=linhas[i];if(celulas.every(v=>v===null||String(v).trim()==='')) continue;
        const dados={...ALUNO_VAZIO};
        colunas.forEach((col,j)=>{
          if(!col) return;
          const valor=celulas[j];
          if(col==='cpf') dados.cpf=normalizarCpf(valor);
          else if(col==='data_nascimento') dados.data_nascimento=normalizarData(valor);
          else dados[col]=String(valor??'').trim();
        });
        const validacao=validarAluno(dados);
        const cpf=normalizarCpf(dados.cpf);
        const erroLote = !validacao && cpfsLote.has(cpf) ? 'CPF repetido na planilha' : '';
        cpfsLote.add(cpf);
        provisorias.push({linha:i+1,dados,situacao:validacao||erroLote||'A verificar',gravado:false});
      }
      const cpfsValidos=provisorias.filter(p=>p.situacao==='A verificar').map(p=>normalizarCpf(p.dados.cpf));
      let existentes=new Set<string>();
      if(cpfsValidos.length){
        const res=await supabase.from('alunos').select('cpf').in('cpf',cpfsValidos);
        if(res.error) throw new Error(res.error.message);
        existentes=new Set((res.data??[]).map(a=>String(a.cpf).trim()));
      }
      setImportacao(provisorias.map(p=>({...p,situacao:p.situacao==='A verificar' ? (existentes.has(normalizarCpf(p.dados.cpf))?'CPF já cadastrado':'Pronto para importar') : p.situacao})));
    }catch(e){setErro(`Erro ao ler planilha: ${msgErro(e)}`);}
  }

  async function importar(){
    setImportando(true);setErro('');setSucesso('');
    const resultado=[...importacao];
    let inseridos=0;
    for(let i=0;i<resultado.length;i++){
      if(resultado[i].situacao!=='Pronto para importar') continue;
      const dados=prepararAluno(resultado[i].dados);
      const r=await supabase.from('alunos').insert(dados).select('id').single();
      if(r.error){
        resultado[i]={...resultado[i],situacao:r.error.code==='23505'?'CPF já cadastrado':`Erro: ${r.error.message}`,gravado:false};
      } else {resultado[i]={...resultado[i],situacao:'Importado',gravado:true};inseridos++;}
      setImportacao([...resultado]);
    }
    await carregar();
    setSucesso(`${inseridos} aluno(s) importado(s). Linhas com erro não foram gravadas.`);
    setImportando(false);
  }

  return <>
    <PageHeader eyebrow="GESTÃO ACADÊMICA · DADOS REAIS" title="Alunos"
      description="Cadastre, consulte e importe alunos. Acesso restrito à Coordenação Pedagógica e Administração." />
    <div className="tabs" role="tablist" aria-label="Gerenciamento de alunos">
      <button type="button" className={aba==='consulta'?'tab-active':''} onClick={()=>setAba('consulta')}>Consulta</button>
      <button type="button" className={aba==='manual'?'tab-active':''} onClick={()=>{limparFormulario();setAba('manual');}}>Cadastro manual</button>
      <button type="button" className={aba==='excel'?'tab-active':''} onClick={()=>{setErro('');setSucesso('');setAba('excel');}}>Importação Excel</button>
    </div>
    {erro && <p role="alert" className="cad-alert cad-error"><AlertCircle size={17}/>{erro}</p>}
    {sucesso && <p role="status" className="cad-alert cad-success"><CheckCircle2 size={17}/>{sucesso}</p>}
    {aba==='consulta' && <section className="surface">
      <div className="surface-title"><h2><Users size={17} style={{verticalAlign:'middle'}}/> Relação de alunos</h2>
        <button type="button" className="btn btn-light" onClick={()=>void carregar()} disabled={carregando}><RefreshCw size={16}/> Atualizar</button></div>
      <div className="filters"><label className="search-field"><Search size={19}/><input aria-label="Pesquisar alunos" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar por nome, CPF ou matrícula"/></label></div>
      <p className="field-hint">{listaFiltrada.length} registro(s) exibido(s). Consulta limitada aos primeiros 300 alunos; filtros aplicados aos resultados carregados.</p>
      <div className="table-wrap"><table className="records-table"><thead><tr><th>Aluno</th><th>CPF</th><th>Matrícula / turma</th><th>Situação</th><th>Ação</th></tr></thead>
        <tbody>{listaFiltrada.map(a=>{
          const vinculos=matriculas.filter(m=>m.aluno_id===a.id);
          return <tr key={a.id}><td><strong>{a.nome_completo}</strong><small>{a.email || 'Sem e-mail'}</small></td><td className="mono">{cpfExibicao(a.cpf)}</td>
            <td>{vinculos.length? vinculos.map(m=><div key={m.id}>{m.numero_matricula} · {turmas.find(t=>t.id===m.turma_id)?.codigo||'Turma indisponível'}</div>):'Sem matrícula cadastrada'}</td>
            <td>{vinculos.length?vinculos.map(m=><div key={m.id}>{m.situacao_academica?.trim()}</div>):'—'}</td>
            <td><button type="button" className="btn btn-light" onClick={()=>editar(a)}>Editar ficha</button></td></tr>;
        })}</tbody></table></div>
      {!carregando && !listaFiltrada.length && <p className="field-hint">Nenhum aluno encontrado.</p>}
    </section>}
    {aba==='manual' && <form className="surface form-section" onSubmit={e=>void salvar(e)}>
      <div className="section-name"><Users size={20}/><h2>{editando?'Editar ficha do aluno':'Nova ficha cadastral'}</h2></div>
      <p className="secondary-text">CPF identifica o aluno. Matrículas são vínculos separados. Não há exclusão de cadastros nesta etapa.</p>
      <div className="form-grid">
      {CAMPOS_ALUNO.map(c=><label key={c} className="field-block">{ROTULOS[c]}{c==='cpf'||c==='nome_completo'?' *':''}
        <input className="form-input" value={form[c]??''} onChange={e=>setForm(p=>({...p,[c]:e.target.value}))}
          type={c==='data_nascimento'?'date':c==='email'?'email':'text'} required={c==='cpf'||c==='nome_completo'}
          placeholder={c==='cpf'?'000.000.000-00':undefined} maxLength={c==='cpf'?14:150} />
      </label>)}
      </div>
      {<div className="cad-separator"><h2>{editando?'Vincular nova matrícula (opcional)':'Matrícula inicial (opcional)'}</h2>
        <p className="field-hint">É necessário que a turma já esteja cadastrada em Cursos e Turmas. Sem turma, salve apenas a ficha pessoal.</p>
        <div className="form-grid">
          <label className="field-block">Número de matrícula<input className="form-input" value={numeroMatricula} onChange={e=>setNumeroMatricula(e.target.value)} placeholder="Ex.: 26010001"/></label>
          <label className="field-block">Turma<select className="form-input" value={turmaSelecionada} onChange={e=>setTurmaSelecionada(e.target.value)}><option value="">Selecionar turma</option>
            {turmas.map(t=><option key={t.id} value={t.id}>{t.codigo} — {t.curso}</option>)}</select></label>
          <label className="field-block">Situação acadêmica<select className="form-input" value={situacao} onChange={e=>setSituacao(e.target.value)}>{SITUACOES_ACADEMICAS.map(s=><option value={s.codigo} key={s.codigo}>{s.codigo} — {s.descricao}</option>)}</select></label>
        </div></div>}
      <div className="cad-actions"><button type="submit" disabled={salvando} className="btn btn-primary"><Save size={17}/>{salvando?'Salvando...':editando?'Salvar alterações':'Cadastrar aluno'}</button>
        <button className="btn btn-light" type="button" onClick={limparFormulario}>Limpar formulário</button></div>
    </form>}
    {aba==='excel' && <section className="surface form-section">
      <div className="section-name"><FileSpreadsheet size={20}/><h2>Importar planilha .xlsx</h2></div>
      <p className="secondary-text">O sistema lê primeiro a planilha, valida os campos e exibe uma prévia. Só serão inseridos alunos válidos, mediante confirmação. Matrículas serão importadas em etapa posterior.</p>
      <a className="btn btn-light" download href="/modelo-importacao-alunos.xlsx"><Download size={17}/> Baixar modelo Excel</a>
      <label className="field-block cad-file">Selecionar arquivo .xlsx (até 3 MB e 100 alunos)<input className="form-input" type="file" accept=".xlsx" onChange={e=>void lerExcel(e.target.files?.[0])}/></label>
      <p className="field-hint">Para CPFs com zero à esquerda, utilize a coluna CPF como texto. O importador também recompõe zeros perdidos por formatação numérica, mas valide a prévia.</p>
      {importacao.length>0 && <><div className="surface-title"><h2>Prévia da importação</h2><span>{importacao.filter(r=>r.situacao==='Pronto para importar').length} apto(s)</span></div>
        <div className="table-wrap"><table className="records-table"><thead><tr><th>Linha Excel</th><th>Aluno</th><th>CPF</th><th>Resultado</th></tr></thead><tbody>
          {importacao.map(p=><tr key={p.linha}><td>{p.linha}</td><td>{p.dados.nome_completo}</td><td className="mono">{cpfExibicao(normalizarCpf(p.dados.cpf))}</td><td>{p.situacao}</td></tr>)}
        </tbody></table></div>
        <div className="cad-actions"><button type="button" className="btn btn-primary" disabled={importando||!importacao.some(p=>p.situacao==='Pronto para importar')} onClick={()=>void importar()}>{importando?'Importando...':'Confirmar importação dos aptos'}</button></div>
      </>}
    </section>}
  </>;
}
