# Roadmap de Sprints

## Sprint 1 - Infraestrutura

- Docker Compose com PostgreSQL e PgAdmin.
- Prisma configurado.
- Backend NestJS com Swagger.
- Frontend Next.js.
- ESLint e Prettier.
- Estrutura Clean Architecture.
- Testes de health check da API, renderizacao inicial do frontend e conexao do banco.

## Sprint 2 - Autenticacao

- Login, logout, JWT, refresh token e guards de permissao.
- Testes de login valido, login invalido e rotas protegidas.
- Status: concluida.
- Senhas com bcrypt.
- Access token curto e refresh token rotativo.
- Cookies HttpOnly e revogacao no logout.
- Cadastro inicial de treinador.
- Confirmacao de e-mail com expiracao e limite de tentativas.
- Bloqueio temporario apos falhas de login.
- Recuperacao com senha temporaria de uso unico.
- Auditoria de eventos sensiveis.

## Incremento de Seguranca e Atletas

- Criacao de atletas exclusiva do treinador.
- Senha temporaria para primeiro acesso.
- Troca obrigatoria antes de acessar outras areas.
- Isolamento de dados por treinador no backend.
- Perfil proprio para atleta.
- Rate limit em endpoints sensiveis.

## Sprint 3 - Gestao de Atletas

- CRUD de atletas, desativacao logica e upload de foto.
- Testes de CRUD completo.
- Status: em andamento.
- Concluido: cadastro, listagem, consulta protegida, alteracao de nome, busca e filtro por status.
- Concluido: status calculado de convite, primeiro login, ativo e inativo.
- Concluido: desativacao e reativacao sem exclusao de historico.
- Concluido: reenvio de convite e bloqueio de acesso do atleta inativo.
- Concluido: auditoria legivel com filtros por atleta, evento, periodo e resultado.
- Pendente: upload de foto e finalizacao da tela de edicao cadastral.

## Sprint 4 - Planejamento de Treinos

- Semanas, dias, blocos, series, complexes, publicacao e recalculo.
- Testes de CRUD, calculo de cargas e snapshot.

## Sprint 5 - Execucao de Treino

- Treino do dia, check-in e historico.

## Sprint 6 - Feedback

- Feedback do atleta e resposta/nota do treinador.

## Sprint 7 - Upload de Videos

- Upload MP4/MOV, preview, reproducao e streaming local.

## Sprint 8 - Recordes Pessoais

- Cadastro, historico e atualizacao de PRs.

## Sprint 9 - Controle de Fadiga

- Recovery Score e historico.

## Sprint 10 - Analytics

- Volume, frequencia, RPE medio, evolucao de PRs e fadiga.

## Sprint 11 - Biblioteca de Exercicios

- Videos, descricoes, objetivos e erros comuns.

## Sprint 12 - PWA

- Instalacao, cache e offline basico.
