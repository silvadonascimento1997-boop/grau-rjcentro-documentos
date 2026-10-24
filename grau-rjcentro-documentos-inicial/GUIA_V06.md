# Grau Técnico RJ Centro — Ajuste 0.6 de importação atômica

## Diagnóstico no ZIP recebido

A versão 0.5, em `components/MatriculasClient.tsx`, fazia `INSERT` em `public.alunos` e depois, separadamente, em `public.matriculas` para cada linha do Excel. Uma falha na segunda gravação podia deixar o aluno sem matrícula; uma falha na 10ª linha não desfazia as nove anteriores. A prévia era no navegador e não substituía validação no banco.

## Correção implementada

- `supabase/sql/01_v06_importacao_matriculas_atomica.sql`: cria uma função RPC transacional `public.importar_matriculas_atomico(p_linhas jsonb)`, com autenticação pelo JWT, perfil ativo de administrador/coordenação, validações no servidor e processamento de até 100 matrículas por chamada. **Todas as matrículas aptas da confirmação são gravadas ou nenhuma é gravada.** Alunos novos do lote também são revertidos em caso de erro.
- `components/MatriculasClient.tsx`: envia todas as linhas aptas numa única chamada `supabase.rpc`, não faz mais inserções parciais no navegador; conserva a prévia, as validações e os registros existentes. Exibe o erro e permite corrigir o Excel antes de repetir.
- Não altera os gatilhos existentes de histórico acadêmico, dados de matrículas, usuários, RLS, matrizes, cursos ou turmas.
- **O modelo Excel v0.5 continua compatível**. Não é necessário refazer a planilha.

## Instalação (ordem obrigatória)

**1. Supabase, antes de publicar a interface:** no projeto correto, abra SQL Editor > New query. Copie o conteúdo integral de `supabase/sql/01_v06_importacao_matriculas_atomica.sql` e clique em Run. O arquivo cria uma função e configura permissões; não importa nem edita alunos e matrículas existentes.

**2. GitHub:** crie uma nova branch, por exemplo `importacao-atomica-v06`, derivada de `matriculas-v05`. Substitua nela os arquivos do pacote preservando as pastas. O repositório atual possui a aplicação em `grau-rjcentro-documentos-inicial/`: mantenha essa pasta como está, não mova `package.json` para a raiz do repositório.

**3. Vercel:** após o commit, abra o deployment Preview da nova branch. Verifique status **Ready**. Não promova para Production antes de testar.

**4. Teste funcional sem dados reais:** faça uma planilha com duas matrículas novas identificadas como TESTE e vinculadas a turmas fictícias previamente cadastradas. Confirme a importação em Preview e confira os dois vínculos no banco. Um teste de rollback forçado deve ser feito **somente em projeto Supabase isolado de homologação**, não no banco compartilhado. Não altere ou exclua turmas reais para simular erros.

**5. Confirme:** o banco deve exibir as duas matrículas do lote válido; as novas fichas pessoais devem ter matrícula correspondente. Se a transação retornar erro, consulte a lista antes de repetir a planilha, especialmente após perda de conexão.

## Limites e precauções

- A atomicidade cobre **a importação de matrículas da aba Importação Excel**, não a importação independente de fichas da aba Alunos nem todas as operações manuais da aplicação. Esses fluxos devem ser revistos antes da homologação geral.
- Uma única falha interrompe e desfaz todos os registros *aptos enviados no mesmo lote*. Registros marcados REVISAR na prévia não são enviados; precisam de correção e nova importação.
- A verificação de vínculo por aluno/turma foi movida para dentro da transação e a função serializa chamadas concorrentes dessa mesma rotina por CPF. Outros pontos de escrita que não utilizem a função ainda podem necessitar de restrições próprias no banco.
- A função usa `SECURITY DEFINER` de forma restrita: somente usuários autenticados podem executá-la, e ela recusa perfis que não sejam `ADMINISTRADOR` ou `COORDENACAO_PEDAGOGICA` com cadastro ativo.
- **Não colar a chave `service_role` em arquivos de projeto**. A função é invocada pelo cliente Supabase com a sessão do próprio usuário.
- Histórico de situações, Livro Eletrônico e emissão de documentos possuem regras independentes. Os demais módulos permanecem em desenvolvimento e não estão homologados para documentos oficiais.
- Não é necessário executar a função de importação manualmente no SQL Editor com dados reais. Ela será chamada pela interface após o usuário confirmar a prévia.

## Diagnóstico se aparecer erro

- `PGRST202` / `42883`: SQL não foi aplicado no projeto correspondente ou API ainda não atualizou a definição da função.
- `42501` / não autorizado: conferir login, perfil ativo e `usuarios_sistema`.
- `Linha N`: é erro de dados. O lote completo foi cancelado. Corrija a planilha e importe novamente após conferir a consulta.
- Erro de rede sem resposta conclusiva: **não conclua que houve rollback**; consulte alunos/matrículas antes de reenviar.
