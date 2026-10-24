'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { createClient } from '@/lib/supabase/client';
import { SITUACOES_ACADEMICAS } from '@/lib/constants';
import { type AlunoForm, ALUNO_VAZIO, cpfExibicao, cpfValido, normalizarCpf, normalizarData, prepararAluno, validarAluno } from '@/lib/alunos';

type Matricula = { id:string;aluno_id:string;turma_id:string;numero_matricula:string;situacao_academica:string;criado_em:string;nome:string;cpf:string;codigo_turma:string };
type Turma = {id:string;codigo:string;curso:string;ativo:boolean};
type Pessoa = {id:string;nome_completo:string;cpf:string};
type Resultado = 'APTO'|'REVISAR'|'IMPORTADO'|'ERRO';
type Linha = {linha:number;dados:AlunoForm;numero:string;codigoTurma:string;situacao:string;estado:Resultado;motivo:string};
const STATUS = new Set<string>(SITUACOES_ACADEMICAS.map(s=>s.codigo));
const CAMPOS: Record<string,keyof AlunoForm> = {
  nome_completo:'nome_completo',nome:'nome_completo',aluno:'nome_completo',cpf:'cpf',
  rg:'rg',orgao_expedidor:'orgao_expedidor',data_nascimento:'data_nascimento',nascimento:'data_nascimento',
  naturalidade:'naturalidade',nome_mae:'nome_mae',mae:'nome_mae',nome_pai:'nome_pai',pai:'nome_pai',email:'email',telefone:'telefone'
};
function cabecalho(v:unknown){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
function texto(v:unknown){return String(v??'').trim();}
function nomeChave(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();}
function erroTexto(v:unknown){return v instanceof Error?v.message:String(v);}
function numeroValido(v:string){return /^[A-Za-z0-9._-]{3,40}$/.test(v);}
const LIMITE_ARQUIVO=3*1024*1024;

export function MatriculasClient(){
  const supabase=useMemo(()=>createClient(),[]);
  const [aba,setAba]=useState<'consulta'|'manual'|'excel'>('consulta');
  const [turmas,setTurmas]=useState<Turma[]>([]);
  const [lista,setLista]=useState<Matricula[]>([]);
  const [busca,setBusca]=useState('');
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const [carregando,setCarregando]=useState(false);
  const [salvando,setSalvando]=useState(false);
  const [cpfManual,setCpfManual]=useState('');
  const [alunoManual,setAlunoManual]=useState<Pessoa|null>(null);
  const [numeroManual,setNumeroManual]=useState('');
  const [turmaManual,setTurmaManual]=useState('');
  const [situacaoManual,setSituacaoManual]=useState('MT');
  const [situacoesEdicao,setSituacoesEdicao]=useState<Record<string,string>>({});
  const [linhas,setLinhas]=useState<Linha[]>([]);
  const [importando,setImportando]=useState(false);

  const carregar=useCallback(async()=>{
    setCarregando(true);setErro('');
    try{
      const [t,m]=await Promise.all([
        supabase.from('turmas').select('id,codigo,ativo,cursos(nome)').order('codigo').limit(1000),
        supabase.from('matriculas').select('id,aluno_id,turma_id,numero_matricula,situacao_academica,criado_em,alunos(nome_completo,cpf),turmas(codigo)').order('criado_em',{ascending:false}).limit(500)
      ]);
      if(t.error) throw new Error(t.error.message);
      if(m.error) throw new Error(m.error.message);
      setTurmas((t.data??[]).map((r:any)=>({id:r.id,codigo:r.codigo,ativo:r.ativo,curso:Array.isArray(r.cursos)?r.cursos[0]?.nome??'':r.cursos?.nome??''})));
      const rows:Matricula[]=(m.data??[]).map((r:any)=>({
        id:r.id,aluno_id:r.aluno_id,turma_id:r.turma_id,numero_matricula:r.numero_matricula,
        situacao_academica:String(r.situacao_academica).trim(),criado_em:r.criado_em,
        nome:Array.isArray(r.alunos)?r.alunos[0]?.nome_completo??'':r.alunos?.nome_completo??'',
        cpf:Array.isArray(r.alunos)?r.alunos[0]?.cpf??'':r.alunos?.cpf??'',
        codigo_turma:Array.isArray(r.turmas)?r.turmas[0]?.codigo??'':r.turmas?.codigo??''
      }));
      setLista(rows);
      setSituacoesEdicao(Object.fromEntries(rows.map(r=>[r.id,r.situacao_academica])));
    }catch(e){setErro('Falha ao consultar os vínculos: '+erroTexto(e));}
    finally{setCarregando(false);}
  },[supabase]);
  useEffect(()=>{void carregar();},[carregar]);
  const filtradas=useMemo(()=>{
    const term=busca.trim().toLocaleLowerCase('pt-BR');const digits=busca.replace(/\D/g,'');
    return lista.filter(r=>!term || r.numero_matricula.toLowerCase().includes(term) || r.nome.toLocaleLowerCase('pt-BR').includes(term)
      || r.codigo_turma.toLowerCase().includes(term) || (digits.length>=3 && r.cpf.includes(digits)));
  },[lista,busca]);

  async function localizarAluno(){
    setErro('');setSucesso('');setAlunoManual(null);
    const cpf=normalizarCpf(cpfManual);
    if(!cpfValido(cpf)){setErro('Informe um CPF válido.');return;}
    const r=await supabase.from('alunos').select('id,nome_completo,cpf').eq('cpf',cpf).maybeSingle();
    if(r.error){setErro(r.error.message);return;}
    if(!r.data){setErro('CPF não localizado. Cadastre a ficha em Alunos ou utilize a importação Excel.');return;}
    setAlunoManual(r.data as Pessoa);
  }

  async function matricular(ev:FormEvent<HTMLFormElement>){
    ev.preventDefault();setErro('');setSucesso('');
    if(!alunoManual||!numeroValido(numeroManual.trim())||!turmaManual||!STATUS.has(situacaoManual)){
      setErro('Localize o aluno, informe matrícula válida, turma e situação acadêmica.');return;
    }
    setSalvando(true);
    try{
      const numero=numeroManual.trim().toUpperCase();
      const [numeroExistente,mesmaTurma]=await Promise.all([
        supabase.from('matriculas').select('id').eq('numero_matricula',numero).maybeSingle(),
        supabase.from('matriculas').select('id').eq('aluno_id',alunoManual.id).eq('turma_id',turmaManual).limit(1)
      ]);
      if(numeroExistente.error||mesmaTurma.error) throw new Error(numeroExistente.error?.message||mesmaTurma.error?.message);
      if(numeroExistente.data) throw new Error('Número de matrícula já utilizado.');
      if(mesmaTurma.data?.length) throw new Error('Este aluno já possui vínculo com a turma. Revise o histórico antes de criar outra matrícula.');
      const r=await supabase.from('matriculas').insert({aluno_id:alunoManual.id,turma_id:turmaManual,numero_matricula:numero,situacao_academica:situacaoManual});
      if(r.error) throw new Error(r.error.message);
      setSucesso('Matrícula cadastrada.');setNumeroManual('');setTurmaManual('');
      await carregar();
    }catch(e){setErro(erroTexto(e));}
    finally{setSalvando(false);}
  }

  async function alterarSituacao(m:Matricula){
    setErro('');setSucesso('');
    const nova=situacoesEdicao[m.id];
    if(!nova||!STATUS.has(nova)){setErro('Situação acadêmica inválida.');return;}
    if(nova===m.situacao_academica){setSucesso('Não houve alteração.');return;}
    if(!window.confirm(`Alterar a situação da matrícula ${m.numero_matricula} de ${m.situacao_academica} para ${nova}?`)) return;
    setSalvando(true);
    try{
      const r=await supabase.from('matriculas').update({situacao_academica:nova}).eq('id',m.id).eq('situacao_academica',m.situacao_academica).select('id');
      if(r.error) throw new Error(r.error.message);
      if(!r.data?.length) throw new Error('A matrícula foi modificada por outro usuário. Atualize os dados antes de tentar novamente.');
      setSucesso('Situação atualizada. A alteração deve estar registrada no histórico por gatilho do banco.');
      await carregar();
    }catch(e){setErro(erroTexto(e));}
    finally{setSalvando(false);}
  }

  async function revisar(propostas:Linha[]):Promise<Linha[]>{
    const cpfs=Array.from(new Set(propostas.filter(p=>cpfValido(p.dados.cpf??'')).map(p=>normalizarCpf(p.dados.cpf))));
    const numeros=Array.from(new Set(propostas.map(p=>p.numero).filter(Boolean)));
    const [a,m]=await Promise.all([
      cpfs.length?supabase.from('alunos').select('id,cpf,nome_completo').in('cpf',cpfs):Promise.resolve({data:[],error:null}),
      numeros.length?supabase.from('matriculas').select('numero_matricula').in('numero_matricula',numeros):Promise.resolve({data:[],error:null})
    ]);
    if(a.error||m.error) throw new Error(a.error?.message||m.error?.message);
    const encontrados=new Map((a.data??[]).map((r:any)=>[r.cpf,r as Pessoa]));
    const matriculasExistentes=new Set((m.data??[]).map((r:any)=>String(r.numero_matricula).toUpperCase()));
    const ids=(a.data??[]).map((r:any)=>r.id);
    const vinculados=new Set<string>();
    if(ids.length){
      const v=await supabase.from('matriculas').select('aluno_id,turma_id').in('aluno_id',ids).limit(10000);
      if(v.error) throw new Error(v.error.message);
      (v.data??[]).forEach((r:any)=>vinculados.add(`${r.aluno_id}|${r.turma_id}`));
      if((v.data??[]).length===10000) throw new Error('Há muitos vínculos existentes para validar com segurança. Divida o lote.');
    }
    const porCodigo=new Map(turmas.map(t=>[t.codigo.toUpperCase(),t]));
    const loteNumero=new Set<string>();const lotePar=new Set<string>();const nomesCpf=new Map<string,string>();
    return propostas.map(l=>{
      if(l.estado==='IMPORTADO')return l;
      let motivo='';const cpf=normalizarCpf(l.dados.cpf);const aluno=encontrados.get(cpf);
      const turma=porCodigo.get(l.codigoTurma.toUpperCase());const par=`${cpf}|${turma?.id??l.codigoTurma}`;
      if(!cpfValido(cpf)) motivo='CPF inválido';
      else if(!l.dados.nome_completo?.trim()) motivo='Nome completo obrigatório';
      else if(!numeroValido(l.numero)) motivo='Matrícula inválida (3 a 40 caracteres, sem espaços)';
      else if(!turma) motivo='Código de turma não encontrado';
      else if(!STATUS.has(l.situacao)) motivo='Situação acadêmica desconhecida';
      else if(matriculasExistentes.has(l.numero)) motivo='Número de matrícula já cadastrado';
      else if(loteNumero.has(l.numero)) motivo='Número de matrícula repetido no arquivo';
      else if(lotePar.has(par)) motivo='Mesmo CPF e mesma turma repetidos no arquivo';
      else if(aluno&&nomeChave(aluno.nome_completo)!==nomeChave(l.dados.nome_completo??'')) motivo='Nome divergente da ficha existente: revisar';
      else if(!aluno && nomesCpf.has(cpf) && nomesCpf.get(cpf)!==nomeChave(l.dados.nome_completo??'')) motivo='Mesmo CPF com nomes divergentes no arquivo';
      else if(aluno && turma && vinculados.has(`${aluno.id}|${turma.id}`)) motivo='Aluno já possui vínculo com esta turma';
      else if(!aluno){const validacao=validarAluno(l.dados);if(validacao)motivo=validacao;}
      loteNumero.add(l.numero);lotePar.add(par);nomesCpf.set(cpf,nomeChave(l.dados.nome_completo??''));
      return {...l,estado:motivo?'REVISAR':'APTO',motivo:motivo|| (turma&&!turma.ativo?'Turma inativa: confirmar se é registro histórico':'Pronto para importar')};
    });
  }

  async function lerExcel(ev:ChangeEvent<HTMLInputElement>){
    setErro('');setSucesso('');setLinhas([]);
    const file=ev.target.files?.[0];
    if(!file)return;
    if(!/\.xlsx$/i.test(file.name)){setErro('Envie apenas arquivos .xlsx.');return;}
    if(file.size>LIMITE_ARQUIVO){setErro('Arquivo maior que 3 MB. Divida os registros em lotes.');return;}
    try{
      const {readSheet}=await import('read-excel-file/browser');
      const dados=await readSheet(file);
      if(dados.length<2){setErro('A planilha deve conter cabeçalho e ao menos uma matrícula.');return;}
      if(dados.length>101){setErro('Limite de 100 linhas por arquivo.');return;}
      const cabecalhos=dados[0].map(cabecalho);
      const obrigatorias=['nome_completo','cpf','numero_matricula','codigo_turma','situacao_academica'];
      if(obrigatorias.some(c=>!cabecalhos.includes(c))){setErro('Faltam colunas obrigatórias: '+obrigatorias.filter(c=>!cabecalhos.includes(c)).join(', '));return;}
      if(new Set(cabecalhos.filter(Boolean)).size!==cabecalhos.filter(Boolean).length){setErro('Há cabeçalhos duplicados.');return;}
      const pos=(c:string)=>cabecalhos.indexOf(c);
      const propostas:Linha[]=[];
      for(let i=1;i<dados.length;i++){
        const row=dados[i];if(row.every(x=>x===null||texto(x)===''))continue;
        const aluno={...ALUNO_VAZIO};
        for(let j=0;j<cabecalhos.length;j++){
          const k=CAMPOS[cabecalhos[j]];if(!k)continue;
          if(k==='cpf')aluno.cpf=normalizarCpf(row[j]);
          else if(k==='data_nascimento')aluno.data_nascimento=normalizarData(row[j]);
          else aluno[k]=texto(row[j]);
        }
        propostas.push({linha:i+1,dados:aluno,numero:texto(row[pos('numero_matricula')]).toUpperCase(),
          codigoTurma:texto(row[pos('codigo_turma')]).toUpperCase(),situacao:texto(row[pos('situacao_academica')]).toUpperCase(),estado:'REVISAR',motivo:'A verificar'});
      }
      if(!propostas.length){setErro('Nenhum registro preenchido.');return;}
      setLinhas(await revisar(propostas));
    }catch(e){setErro('Falha na prévia do Excel: '+erroTexto(e));}
  }

  async function importar(){
    setErro('');setSucesso('');
    const aprovadas=linhas.filter(l=>l.estado==='APTO');
    if(!aprovadas.length){setErro('Nenhuma matrícula apta. Corrija a planilha.');return;}
    setImportando(true);
    try{
      // A prévia é orientativa: a função no banco repete as verificações com
      // bloqueios e registra todo o lote em uma única transação PostgreSQL.
      const conferidas=await revisar(linhas);
      if(conferidas.some((l,i)=>l.estado!==linhas[i].estado||l.motivo!==linhas[i].motivo)){
        setLinhas(conferidas);
        setErro('A prévia mudou desde a última verificação. Revise as linhas e confirme novamente.');
        return;
      }
      const payload=conferidas.filter(l=>l.estado==='APTO').map(l=>({
        linha:l.linha,
        ...prepararAluno(l.dados),
        numero_matricula:l.numero,
        codigo_turma:l.codigoTurma,
        situacao_academica:l.situacao
      }));
      if(!payload.length){setErro('Nenhuma matrícula apta após revalidar os dados.');return;}
      const resultado=await supabase.rpc('importar_matriculas_atomico',{p_linhas:payload});
      if(resultado.error){
        const mensagem=resultado.error.message||'Erro não identificado';
        if(resultado.error.code==='PGRST202'||resultado.error.code==='42883'){
          throw new Error('A rotina de importação v0.6 ainda não está instalada no Supabase. Execute primeiro o SQL entregue no pacote. Nenhum registro deste lote foi gravado.');
        }
        throw new Error(`${mensagem}. A transação foi cancelada: nenhum registro deste lote foi gravado.`);
      }
      const importadas=Number(resultado.data?.importadas);
      if(!Number.isInteger(importadas)||importadas!==payload.length){
        // Falha de comunicação ou resposta inesperada: não assumir que houve rollback.
        throw new Error('O servidor retornou uma confirmação inesperada. Verifique a consulta de matrículas antes de repetir o arquivo.');
      }
      const linhasConfirmadas=new Set(payload.map(l=>l.linha));
      setLinhas(conferidas.map(l=>linhasConfirmadas.has(l.linha)
        ? {...l,estado:'IMPORTADO' as const,motivo:'Gravada na transação confirmada'} : l));
      setSucesso(`${importadas} matrícula(s) importada(s) na mesma transação. Nenhuma ficha pessoal ficou sem vínculo por falha desse lote.`);
      await carregar();
    }catch(e){setErro('Importação não concluída: '+erroTexto(e));}
    finally{setImportando(false);}
  }

  return <>
    <PageHeader eyebrow="GESTÃO ACADÊMICA · DADOS REAIS" title="Matrículas" description="Consulte vínculos acadêmicos, vincule alunos cadastrados e importe matrículas em Excel." />
    <div className="mat-tabs" role="tablist" aria-label="Gerenciamento de matrículas">
      <button type="button" role="tab" aria-selected={aba==='consulta'} onClick={()=>setAba('consulta')}>Consulta e situação</button>
      <button type="button" role="tab" aria-selected={aba==='manual'} onClick={()=>setAba('manual')}>Nova matrícula</button>
      <button type="button" role="tab" aria-selected={aba==='excel'} onClick={()=>setAba('excel')}>Importação Excel</button>
    </div>
    {erro && <p className="mat-alert mat-error" role="alert">{erro}</p>}
    {sucesso && <p className="mat-alert mat-success" role="status">{sucesso}</p>}
    {aba==='consulta'&&<section className="mat-card">
      <h2>Relação de matrículas</h2>
      <div className="mat-actions"><button type="button" className="mat-button mat-button-secondary" onClick={()=>void carregar()} disabled={carregando}>Atualizar registros</button></div>
      <p className="mat-stat">Consulta das últimas 500 matrículas. A pesquisa abaixo atua sobre esses registros carregados.</p>
      <input className="mat-search" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar por matrícula, aluno, CPF ou turma" aria-label="Pesquisar matrículas"/>
      <div className="mat-table-wrap"><table className="mat-table"><thead><tr><th>Aluno</th><th>Matrícula</th><th>Turma</th><th>Situação acadêmica</th><th>Ação</th></tr></thead><tbody>
        {filtradas.map(m=><tr key={m.id}><td><strong>{m.nome}</strong><small>{cpfExibicao(m.cpf)}</small></td><td>{m.numero_matricula}</td><td>{m.codigo_turma}</td>
          <td><select className="mat-mini-select" aria-label={`Situação da matrícula ${m.numero_matricula}`} value={situacoesEdicao[m.id]??m.situacao_academica} onChange={e=>setSituacoesEdicao(x=>({...x,[m.id]:e.target.value}))}>{SITUACOES_ACADEMICAS.map(s=><option key={s.codigo} value={s.codigo}>{s.codigo} — {s.descricao}</option>)}</select></td>
          <td><button type="button" className="mat-button mat-button-secondary" onClick={()=>void alterarSituacao(m)} disabled={salvando||situacoesEdicao[m.id]===m.situacao_academica}>Salvar situação</button></td></tr>)}
      </tbody></table></div>
      {!filtradas.length&&<p className="mat-note">Nenhuma matrícula encontrada entre os registros carregados.</p>}
      <p className="mat-note">Mudanças de situação acadêmica são auditadas pelos gatilhos existentes no Supabase. Antes do uso oficial, confirme as permissões e a rastreabilidade conforme os testes institucionais.</p>
    </section>}
    {aba==='manual'&&<form className="mat-card" onSubmit={e=>void matricular(e)}>
      <h2>Vincular matrícula a aluno cadastrado</h2>
      <p className="mat-subtitle">CPF identifica a pessoa; o número da matrícula identifica cada vínculo acadêmico.</p>
      <div className="mat-grid">
        <label className="mat-field"><span>CPF do aluno *</span><input value={cpfManual} onChange={e=>{setCpfManual(e.target.value);setAlunoManual(null);}} placeholder="000.000.000-00"/></label>
        <div className="mat-field"><span>Localizar aluno</span><button type="button" className="mat-button mat-button-secondary" onClick={()=>void localizarAluno()}>Buscar CPF</button></div>
        <label className="mat-field"><span>Número de matrícula *</span><input value={numeroManual} onChange={e=>setNumeroManual(e.target.value)} placeholder="Ex.: 26010001" maxLength={40}/></label>
        <label className="mat-field"><span>Turma *</span><select value={turmaManual} onChange={e=>setTurmaManual(e.target.value)}><option value="">Selecionar turma</option>{turmas.map(t=><option value={t.id} key={t.id}>{t.codigo} — {t.curso}{t.ativo?'':' (inativa)'}</option>)}</select></label>
        <label className="mat-field"><span>Situação acadêmica *</span><select value={situacaoManual} onChange={e=>setSituacaoManual(e.target.value)}>{SITUACOES_ACADEMICAS.map(s=><option key={s.codigo} value={s.codigo}>{s.codigo} — {s.descricao}</option>)}</select></label>
      </div>
      {alunoManual&&<p className="mat-alert mat-success">Aluno localizado: {alunoManual.nome_completo} — CPF {cpfExibicao(alunoManual.cpf)}</p>}
      <div className="mat-actions"><button type="submit" className="mat-button" disabled={salvando||!alunoManual}>Salvar matrícula</button></div>
      <p className="mat-note">A interface sinaliza vínculo já existente na turma. Para exceções históricas legítimas, faça conferência institucional antes de inserir outro número.</p>
    </form>}
    {aba==='excel'&&<section className="mat-card">
      <h2>Importar matrículas por Excel — transação segura</h2>
      <p className="mat-subtitle">A planilha pode conter CPF já cadastrado ou aluno novo. Fichas existentes não serão sobrescritas. Os registros aptos serão gravados juntos: qualquer falha cancela todo o lote, sem deixar ficha pessoal órfã.</p>
      <div className="mat-actions"><a className="mat-button mat-button-secondary" href="/modelo-importacao-matriculas-v05.xlsx" download>Baixar modelo Excel (compatível com v0.6)</a></div>
      <label className="mat-field" style={{marginTop:15,maxWidth:580}}><span>Arquivo .xlsx (máximo 3 MB e 100 linhas)</span><input type="file" accept=".xlsx" onChange={e=>void lerExcel(e)} disabled={importando}/></label>
      <p className="mat-note">A planilha exige: nome_completo, cpf, numero_matricula, codigo_turma e situacao_academica. Para CPF com zero inicial, formate a coluna como texto.</p>
      {!!linhas.length&&<>
        <p className="mat-stat">{linhas.filter(l=>l.estado==='APTO').length} apta(s) · {linhas.filter(l=>l.estado==='REVISAR').length} para revisão · {linhas.filter(l=>l.estado==='IMPORTADO').length} importada(s) · {linhas.filter(l=>l.estado==='ERRO').length} com erro</p>
        <div className="mat-table-wrap"><table className="mat-table"><thead><tr><th>Linha</th><th>Aluno / CPF</th><th>Matrícula / Turma</th><th>Situação</th><th>Resultado</th></tr></thead><tbody>{linhas.map(l=><tr key={l.linha}><td>{l.linha}</td><td><strong>{l.dados.nome_completo}</strong><small>{cpfExibicao(l.dados.cpf)}</small></td><td>{l.numero}<small>{l.codigoTurma}</small></td><td>{l.situacao}</td><td><span className={`mat-pill ${l.estado==='APTO'||l.estado==='IMPORTADO'?'mat-pill-ok':l.estado==='REVISAR'?'mat-pill-warn':'mat-pill-bad'}`}>{l.estado}</span><small>{l.motivo}</small></td></tr>)}</tbody></table></div>
        <div className="mat-actions"><button type="button" className="mat-button" disabled={importando||!linhas.some(l=>l.estado==='APTO')} onClick={()=>void importar()}>{importando?'Importando...':`Confirmar importação dos ${linhas.filter(l=>l.estado==='APTO').length} aptos`}</button></div>
        <p className="mat-alert mat-warn">A versão 0.6 exige a função SQL de importação atômica no Supabase. O lote apto é gravado integralmente ou cancelado integralmente. Em caso de queda de conexão, consulte as matrículas antes de enviar o arquivo novamente.</p>
      </>}
    </section>}
  </>;
}
