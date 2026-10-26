# Sistema Documental — versão 0.7 (primeira entrega)

**Ramificação prevista:** `emissao-documental-v07`. Base preservada: v0.6.

## Funcionalidades implantadas nesta entrega

- Pesquisa de pessoas por nome ou CPF e de vínculos por matrícula, usando apenas consultas autenticadas às tabelas `alunos`, `matriculas`, `turmas`, `cursos` do Supabase. A consulta não carrega o universo de pessoas antecipadamente.
- Seleção explícita da matrícula, considerando que uma pessoa pode ter mais de um vínculo escolar.
- Bloqueio da elaboração da Declaração de Vínculo quando a situação acadêmica da matrícula não for `MT`.
- Conferência de dados da turma, do curso, de datas, horário e módulo. Campos alterados na preparação não modificam os cadastros oficiais.
- Prévia HTML de Declaração de Vínculo com indicação ostensiva **SEM VALIDADE DOCUMENTAL**.
- Salvamento e recuperação de rascunhos em `rascunhos_documentos`, utilizando as políticas RLS já definidas.
- Diretor Escolar e Secretário Escolar representados como assinantes necessários no fluxo futuro.

## Limites deliberados

**Esta versão NÃO emite documento oficial, NÃO gera PDF final, NÃO atribui sequência ou código CEE, NÃO assina digitalmente e NÃO escreve em `documentos` ou `contador_documentos`.** Não usar a prévia para apresentação a terceiros como declaração válida. As funcionalidades não substituem a conferência pelo responsável escolar.

Antes de habilitar emissão oficial em uma próxima etapa:

1. Implementar transação servidor/RPC para alocar `sequencial` sob bloqueio de linha e criar `documentos` com verificação de autenticação e autorização.
2. Validar rigorosamente as transições de status do registro, impedindo retorno de `FINALIZADO` a estados de assinatura.
3. Configurar assinatura digital conforme Parecer CEE/RJ nº 45 N/2022 e verificar infraestrutura ICP-Brasil aplicável.
4. Gerar e armazenar o PDF definitivo, hash SHA-256 e mecanismos de validação acessíveis, preservando confidencialidade.
5. Homologar o conteúdo e os signatários institucionais, inclusive conferir dados de portaria, publicação, endereço e carga horária com documentos oficiais.
6. Eliminar dependência dos registros fictícios da tela `Livro Eletrônico` antes de qualquer operação oficial.

## Como instalar

Atualize a pasta `grau-rjcentro-documentos-inicial` da ramificação `emissao-documental-v07` com os arquivos deste ZIP. Não crie uma pasta dentro da pasta já existente. Confirme o commit. Verifique o Preview na Vercel e teste a leitura e o rascunho com um cadastro fictício e situação `MT`.

**Banco de dados:** esta entrega utiliza as tabelas atuais. Não execute novos scripts SQL. As políticas RLS da implantação inicial precisam continuar ativas. O projeto não deve conter chave `service_role` no frontend.
