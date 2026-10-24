# Atualização 0.6

Este arquivo descrevia a estrutura inicial. Para o estado atual da importação atômica de matrículas, instruções e limitações, consulte **GUIA_V06.md**.

---

# Sistema Documental — Grau Técnico RJ Centro

**Versão:** 0.1.0 — estrutura inicial e telas de demonstração.

Projeto exclusivo da unidade **Grau Técnico Rio de Janeiro Centro**, CNPJ 38.852.241/0001-31, INEP **33194564**. Baseado no planejamento institucional de emissão de documentos escolares e Livro Eletrônico, com referência ao Parecer CEE/RJ nº 45 N/2022.

## O que já está pronto

- Next.js (App Router), React, TypeScript, CSS responsivo.
- Layout do Dashboard com indicadores **fictícios** e acesso aos módulos.
- Navegação responsiva para desktop e celular.
- Telas preparatórias: Alunos; Cursos e Turmas; Emissão; Livro Eletrônico; Assinaturas; Autenticidade; Configurações.
- Marca da escola no cabeçalho, fornecida para este projeto.
- Arquivo central de parâmetros institucionais, cinco documentos e nove situações acadêmicas.
- Interface de escolha de **blocos visuais** de assinatura, com centralização quando apenas um é escolhido.

## O que NÃO está pronto

**NÃO USAR PARA DOCUMENTOS OFICIAIS OU DADOS REAIS DE ALUNOS.**

Não há login real, autorização no servidor, Supabase, armazenamento, sequência CEE transacional, emissão de PDF, assinatura ICP-Brasil, QR Code válido ou Livro Eletrônico formal. Os registros de exemplo são ilustrativos. Qualquer tela aparentemente acessível **não implica autorização de acesso**: políticas de segurança serão implementadas antes da utilização real.

Uma escolha de bloco visual não substitui as assinaturas digitais obrigatórias do Secretário Escolar e do Diretor (ou substituto), quando aplicáveis segundo o Parecer.

O reconhecimento formal de eventual substituição do livro físico deverá ser confirmado com a Inspeção Escolar. Parâmetros de código para alunos ainda cursando necessitam de validação normativa antes de emissões oficiais.

## Primeira publicação no GitHub (sem terminal)

1. Acesse https://github.com/new.
2. Crie o repositório `grau-rjcentro-documentos` e marque **Private**.
3. Deixe desmarcadas as opções para criar README, .gitignore e licença.
4. Depois, abra o repositório e use **uploading an existing file** para enviar o **conteúdo extraído deste ZIP**, respeitando as pastas e os arquivos. Não envie o ZIP fechado como se fosse o código.
5. Confira a presença de `package.json`, `app`, `components`, `lib` e `public` na raiz.

## Executar localmente (opcional)

Necessário Node.js 20.9 ou mais recente:

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

Para checagem técnica após instalação:

```bash
npm run typecheck
npm run build
```

## Estrutura

```text
app/
  page.tsx                 Dashboard
  alunos/page.tsx          Cadastro e importação (protótipo)
  cursos/page.tsx          Cursos e turmas (protótipo)
  emissao/page.tsx         Fluxo de emissão e blocos visuais de assinatura
  livro/page.tsx           Livro Eletrônico (registros fictícios)
  assinaturas/page.tsx     Central de assinaturas (protótipo)
  validacao/page.tsx       Consulta pública (não ativada)
  configuracoes/page.tsx   Dados institucionais
components/                Navegação e elementos reutilizáveis
lib/                       Parâmetros e dados fictícios
public/                    Logo da instituição
```

## Próximas etapas planejadas

- **Etapa 2 — Supabase:** modelo relacional de alunos, matrículas, cursos, turmas, usuários, emissões e auditoria; autenticação, Row Level Security (RLS), controle atômico e seguro de sequência.
- **Etapa 3 — Vercel:** publicação do ambiente conectado, variáveis de ambiente e testes.
- **Etapa 4:** gerador PDF real, modelos aprovados, fluxo de assinatura (integrada e externa), verificação de assinatura e guarda do documento definitivo.
- **Etapa 5:** validação por QR Code (sem download público), relatórios, exportação e teste documental com a Inspeção Escolar.

**Segurança:** nunca comitar senhas, tokens, certificados privados, dados reais de alunos ou arquivos `.env` com valores de produção. O arquivo `.env.example` serve apenas como exemplo de configuração para a etapa seguinte.
