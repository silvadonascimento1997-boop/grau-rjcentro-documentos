-- SISTEMA DOCUMENTAL — RJ CENTRO | Versão 0.6
-- Executar uma única vez em Supabase > SQL Editor, ANTES do deploy da v0.6.
-- Não modifica dados históricos. Cria/substitui somente a função de importação.
-- Cada chamada RPC roda em UMA transação PostgreSQL: qualquer exceção cancela
-- inclusive os alunos novos criados antes da falha de outra linha do lote.
-- Requer tabelas existentes: public.alunos, public.turmas, public.matriculas,
-- public.usuarios_sistema; requer autenticação Supabase Auth.

CREATE OR REPLACE FUNCTION public.importar_matriculas_atomico(p_linhas jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_usuario uuid := auth.uid();
  v_autorizado boolean := false;
  v_total integer;
  v_linha jsonb;
  v_posicao integer := 0;
  v_n_linha integer;
  v_nome text;
  v_nome_existente text;
  v_nome_normalizado text;
  v_nome_existente_normalizado text;
  v_cpf text;
  v_cpf_lock text;
  v_soma integer;
  v_digito integer;
  v_i integer;
  v_numero text;
  v_turma_codigo text;
  v_situacao text;
  v_turma_id uuid;
  v_aluno_id uuid;
  v_existe boolean;
  v_importadas integer := 0;
BEGIN
  -- Segurança: verificar a identidade no JWT atual, NÃO confiar em campos do Excel.
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado para importar matrículas.'
      USING ERRCODE = '42501';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_sistema AS u
    WHERE u.usuario_id = v_usuario AND u.ativo IS TRUE
      AND u.perfil IN ('ADMINISTRADOR','COORDENACAO_PEDAGOGICA')
  ) INTO v_autorizado;
  IF NOT v_autorizado THEN
    RAISE EXCEPTION 'Seu perfil não está autorizado a importar matrículas.'
      USING ERRCODE = '42501';
  END IF;

  IF p_linhas IS NULL OR pg_catalog.jsonb_typeof(p_linhas) <> 'array' THEN
    RAISE EXCEPTION 'Formato de lote inválido: envie uma lista de matrículas.';
  END IF;
  v_total := pg_catalog.jsonb_array_length(p_linhas);
  IF v_total < 1 OR v_total > 100 THEN
    RAISE EXCEPTION 'O lote deve ter entre 1 e 100 matrículas.';
  END IF;

  -- Serializa chamadas concorrentes da própria rotina por CPF.
  -- Bloqueios ordenados previnem deadlocks quando lotes possuem CPFs em comum.
  FOR v_cpf_lock IN
    SELECT DISTINCT pg_catalog.lpad(
      pg_catalog.regexp_replace(item.value->>'cpf', '[^0-9]', '', 'g'), 11, '0'
    )
    FROM pg_catalog.jsonb_array_elements(p_linhas) AS item(value)
    ORDER BY 1
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('matriculas-v06:' || v_cpf_lock, 0)
    );
  END LOOP;

  FOR v_linha IN SELECT value FROM pg_catalog.jsonb_array_elements(p_linhas) LOOP
    v_posicao := v_posicao + 1;
    IF pg_catalog.jsonb_typeof(v_linha) <> 'object' THEN
      RAISE EXCEPTION 'O registro % do lote não é um objeto válido.', v_posicao;
    END IF;
    v_n_linha := CASE WHEN v_linha->>'linha' ~ '^[0-9]{1,4}$'
      THEN (v_linha->>'linha')::integer ELSE v_posicao + 1 END;
    v_nome := pg_catalog.regexp_replace(pg_catalog.btrim(COALESCE(v_linha->>'nome_completo','')), '\s+', ' ', 'g');
    v_cpf := pg_catalog.regexp_replace(COALESCE(v_linha->>'cpf',''), '[^0-9]', '', 'g');
    v_numero := pg_catalog.upper(pg_catalog.btrim(COALESCE(v_linha->>'numero_matricula','')));
    v_turma_codigo := pg_catalog.upper(pg_catalog.btrim(COALESCE(v_linha->>'codigo_turma','')));
    v_situacao := pg_catalog.upper(pg_catalog.btrim(COALESCE(v_linha->>'situacao_academica','')));

    -- Validação no servidor: a prévia no navegador não é uma barreira de segurança.
    IF pg_catalog.length(v_nome) < 2 OR pg_catalog.length(v_nome) > 250 THEN
      RAISE EXCEPTION 'Linha %: informe um nome completo válido.', v_n_linha;
    END IF;
    IF pg_catalog.length(v_cpf) <> 11 OR v_cpf = pg_catalog.repeat(pg_catalog.substr(v_cpf,1,1),11) THEN
      RAISE EXCEPTION 'Linha %: CPF inválido.', v_n_linha;
    END IF;
    -- Verificação dos dois dígitos de CPF (evita envio adulterado por RPC).
    v_soma := 0;
    FOR v_i IN 1..9 LOOP
      v_soma := v_soma + pg_catalog.substr(v_cpf,v_i,1)::integer * (11-v_i);
    END LOOP;
    v_digito := (v_soma*10) % 11;
    IF v_digito = 10 THEN v_digito := 0; END IF;
    IF v_digito <> pg_catalog.substr(v_cpf,10,1)::integer THEN
      RAISE EXCEPTION 'Linha %: dígitos verificadores do CPF inválidos.', v_n_linha;
    END IF;
    v_soma := 0;
    FOR v_i IN 1..10 LOOP
      v_soma := v_soma + pg_catalog.substr(v_cpf,v_i,1)::integer * (12-v_i);
    END LOOP;
    v_digito := (v_soma*10) % 11;
    IF v_digito = 10 THEN v_digito := 0; END IF;
    IF v_digito <> pg_catalog.substr(v_cpf,11,1)::integer THEN
      RAISE EXCEPTION 'Linha %: dígitos verificadores do CPF inválidos.', v_n_linha;
    END IF;
    IF v_numero !~ '^[A-Z0-9._-]{3,40}$' THEN
      RAISE EXCEPTION 'Linha %: número de matrícula inválido.', v_n_linha;
    END IF;
    IF v_situacao NOT IN ('MT','CAC','LFI','LFR','CAU','NC','FO','CAN','CAI') THEN
      RAISE EXCEPTION 'Linha %: situação acadêmica inválida.', v_n_linha;
    END IF;
    IF v_turma_codigo = '' THEN
      RAISE EXCEPTION 'Linha %: informe o código da turma.', v_n_linha;
    END IF;
    SELECT t.id INTO v_turma_id
      FROM public.turmas t
      WHERE pg_catalog.upper(pg_catalog.btrim(t.codigo)) = v_turma_codigo
      LIMIT 1;
    IF v_turma_id IS NULL THEN
      RAISE EXCEPTION 'Linha %: turma não localizada.', v_n_linha;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.matriculas m
      WHERE pg_catalog.upper(pg_catalog.btrim(m.numero_matricula)) = v_numero
    ) INTO v_existe;
    IF v_existe THEN
      RAISE EXCEPTION 'Linha %: número de matrícula já cadastrado.', v_n_linha;
    END IF;

    -- A partir daqui todas as operações integram a mesma transação.
    v_aluno_id := NULL;
    v_nome_existente := NULL;
    SELECT a.id, a.nome_completo INTO v_aluno_id, v_nome_existente
      FROM public.alunos a WHERE a.cpf = v_cpf LIMIT 1 FOR UPDATE;
    IF v_aluno_id IS NULL THEN
      -- Ficha nova: só será confirmada se TODAS as matrículas do lote forem gravadas.
      -- Fichas preexistentes não são alteradas.
      INSERT INTO public.alunos (
        nome_completo, cpf, rg, orgao_expedidor, data_nascimento,
        naturalidade, nome_mae, nome_pai, email, telefone
      ) VALUES (
        v_nome, v_cpf,
        NULLIF(pg_catalog.btrim(v_linha->>'rg'),''),
        NULLIF(pg_catalog.btrim(v_linha->>'orgao_expedidor'),''),
        NULLIF(pg_catalog.btrim(v_linha->>'data_nascimento'),'')::date,
        NULLIF(pg_catalog.btrim(v_linha->>'naturalidade'),''),
        NULLIF(pg_catalog.btrim(v_linha->>'nome_mae'),''),
        NULLIF(pg_catalog.btrim(v_linha->>'nome_pai'),''),
        NULLIF(pg_catalog.lower(pg_catalog.btrim(v_linha->>'email')),''),
        NULLIF(pg_catalog.btrim(v_linha->>'telefone'),'')
      ) RETURNING id INTO v_aluno_id;
    ELSE
      -- Compara nomes, desconsiderando acentos e múltiplos espaços.
      v_nome_normalizado := pg_catalog.translate(
        pg_catalog.upper(v_nome), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'
      );
      v_nome_existente_normalizado := pg_catalog.translate(
        pg_catalog.upper(pg_catalog.regexp_replace(pg_catalog.btrim(v_nome_existente),'\s+',' ','g')),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','AAAAAEEEEIIIIOOOOOUUUUC'
      );
      IF v_nome_normalizado <> v_nome_existente_normalizado THEN
        RAISE EXCEPTION 'Linha %: nome diferente da ficha pessoal existente para esse CPF.', v_n_linha;
      END IF;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.matriculas m
      WHERE m.aluno_id = v_aluno_id AND m.turma_id = v_turma_id
    ) INTO v_existe;
    IF v_existe THEN
      RAISE EXCEPTION 'Linha %: aluno já possui vínculo com essa turma.', v_n_linha;
    END IF;
    INSERT INTO public.matriculas (
      aluno_id, turma_id, numero_matricula, situacao_academica
    ) VALUES (v_aluno_id, v_turma_id, v_numero, v_situacao);
    v_importadas := v_importadas + 1;
  END LOOP;

  RETURN pg_catalog.jsonb_build_object('importadas', v_importadas, 'atomicidade', 'lote_inteiro');
END;
$function$;

-- Controle de acesso à RPC: somente sessões autenticadas podem invocá-la;
-- adicionalmente a função confere perfil institucional ativo no banco.
REVOKE ALL ON FUNCTION public.importar_matriculas_atomico(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.importar_matriculas_atomico(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.importar_matriculas_atomico(jsonb) TO authenticated;

-- Para conferir que foi instalada, execute separadamente:
-- SELECT proname FROM pg_proc WHERE oid = 'public.importar_matriculas_atomico(jsonb)'::regprocedure;
