'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type Matricula = { id: string; numero_matricula: string; nome: string };
type ApiResult = {
  id: string;
  recebido_em: string;
  status: string;
  hash_sha256: string;
  aviso: string;
};

export function GovBrUploadClient() {
  const supabase = useMemo(() => createClient(), []);
  const arquivoInput = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Matricula[]>([]);
  const [selecionada, setSelecionada] = useState<Matricula | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pesquisando, setPesquisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [concluido, setConcluido] = useState<ApiResult | null>(null);

  async function pesquisar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro('');
    setConcluido(null);
    setSelecionada(null);
    const termo = busca.trim();
    if (termo.length < 3) { setErro('Informe pelo menos 3 caracteres da matrícula.'); return; }
    setPesquisando(true);
    try {
      const { data, error } = await supabase.from('matriculas')
        .select('id,numero_matricula,alunos(nome_completo)')
        .ilike('numero_matricula', `${termo.replace(/[%_]/g, '')}%`).limit(15);
      if (error) throw new Error('Não foi possível consultar as matrículas.');
      const lista = (data ?? []).map((row) => {
        const a = row.alunos as {nome_completo:string} | {nome_completo:string}[] | null;
        return { id: row.id, numero_matricula: row.numero_matricula, nome: (Array.isArray(a) ? a[0] : a)?.nome_completo ?? 'Nome indisponível' };
      });
      setResultados(lista);
      if (!lista.length) setErro('Nenhuma matrícula encontrada.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro na pesquisa.');
      setResultados([]);
    } finally { setPesquisando(false); }
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selecionada || !arquivo) return;
    setErro(''); setConcluido(null); setEnviando(true);
    try {
      const body = new FormData();
      body.set('matricula_id', selecionada.id);
      body.set('arquivo', arquivo);
      const resposta = await fetch('/api/assinaturas/govbr/upload', {
        method: 'POST', body, credentials: 'same-origin', cache: 'no-store'
      });
      const retorno: ApiResult & { error?: string } = await resposta.json();
      if (!resposta.ok) throw new Error(retorno.error || 'Falha no recebimento.');
      setConcluido(retorno);
      setArquivo(null);
      if (arquivoInput.current) arquivoInput.current.value = '';
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o PDF.');
    } finally { setEnviando(false); }
  }

  return <section className="surface" style={{marginBottom: 18}}>
    <div className="section-name"><h2>3. Receber PDF assinado para conferência — testes</h2></div>
    <p className="secondary-text">
      O recebimento identifica a matrícula, armazena o PDF em bucket privado e registra o hash SHA-256.
      Não valida a assinatura GOV.BR, não gera código CEE e não emite documento escolar.
      Utilize somente matrículas e PDFs fictícios nesta fase.
    </p>
    <form onSubmit={pesquisar} style={{display:'flex',alignItems:'end',gap:12,flexWrap:'wrap',marginBottom:14}}>
      <div style={{flex:'1 1 250px'}}>
        <label className="field-label" htmlFor="govbr-numero">Localizar matrícula de teste</label>
        <input className="form-input" id="govbr-numero" value={busca}
          onChange={e => {setBusca(e.target.value);setSelecionada(null);setResultados([]);setConcluido(null);}}
          placeholder="Ex.: TESTE060001" maxLength={40} />
      </div>
      <button className="btn btn-light" type="submit" disabled={pesquisando || enviando}>
        {pesquisando ? 'Pesquisando...' : 'Pesquisar matrícula'}
      </button>
    </form>
    {!!resultados.length && <div style={{display:'grid',gap:7,marginBottom:16}}>
      {resultados.map(r => <button key={r.id} type="button"
        onClick={() => {setSelecionada(r);setErro('');setConcluido(null);}}
        aria-pressed={selecionada?.id===r.id}
        style={{border:`1px solid ${selecionada?.id===r.id ? '#153c66' : '#e2e9f1'}`,background:selecionada?.id===r.id?'#edf4fa':'#fff',padding:12,borderRadius:8,textAlign:'left'}}>
        <strong>{r.numero_matricula}</strong> · {r.nome}
      </button>)}
    </div>}
    {selecionada && <form onSubmit={enviar} style={{display:'grid',gap:12}}>
      <p style={{margin:0}}><strong>Matrícula escolhida:</strong> {selecionada.numero_matricula} — {selecionada.nome}</p>
      <div>
        <label className="field-label" htmlFor="govbr-arquivo">PDF fictício para conferência (máximo 10 MB)</label>
        <input ref={arquivoInput} id="govbr-arquivo" type="file" accept="application/pdf,.pdf"
          onChange={e => {setArquivo(e.target.files?.[0] ?? null);setConcluido(null);}} disabled={enviando} />
      </div>
      <button className="btn btn-primary" type="submit" disabled={enviando || !arquivo || arquivo.size > 10 * 1024 * 1024}>
        {enviando ? 'Recebendo...' : 'Receber PDF para análise (sem validade oficial)'}
      </button>
    </form>}
    {erro && <p role="alert" style={{color:'#a4393d',marginTop:12}}>{erro}</p>}
    {concluido && <div role="status" style={{background:'#eaf7ef',padding:14,borderRadius:8,marginTop:12,overflowWrap:'anywhere'}}>
      <strong>Arquivo recebido, não homologado.</strong>
      <p style={{margin:'6px 0'}}>Protocolo interno: <code>{concluido.id}</code></p>
      <p style={{margin:'6px 0'}}>Situação: <strong>{concluido.status}</strong></p>
      <p style={{margin:'6px 0'}}>SHA-256: <code>{concluido.hash_sha256}</code></p>
      <small>{concluido.aviso}</small>
    </div>}
  </section>;
}
