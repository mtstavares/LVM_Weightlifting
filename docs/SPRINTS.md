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

- Cadastro, desativacao logica, perfil esportivo e upload seguro de foto.
- Status: concluida.
- Concluido: cadastro, listagem, consulta protegida, busca e filtro por status.
- Concluido: status calculado de convite, primeiro login, ativo e inativo.
- Concluido: desativacao e reativacao sem exclusao de historico.
- Concluido: reenvio de convite e bloqueio de acesso do atleta inativo.
- Concluido: auditoria legivel com filtros por atleta, evento, periodo e resultado.
- Concluido: finalizacao obrigatoria do perfil apos a primeira troca de senha.
- Concluido: foto JPG, JPEG, PNG ou WEBP validada por tamanho, MIME e assinatura binaria.
- Concluido: idade calculada, sexo, categorias de peso e nivel competitivo.
- Concluido: PRs de Snatch, Clean & Jerk, Back Squat, Front Squat e Deadlift.
- Concluido: atleta gerencia o proprio perfil e treinador possui acesso somente leitura.
- Concluido: bloqueios `403`, isolamento por treinador e auditoria de acessos indevidos.
- Concluido: layout mobile-first do treinador com Feed, Atletas e Perfil.
- Concluido: perfil editavel do treinador com foto, idade, academia e descricao.
- Concluido: feed inicial autenticado e preparado para isolamento por `trainer_id`.
- Testes: autorizacao, upload, perfil, PRs e regressao da autenticacao.

## Sprint 4 - Planejamento de Treinos

- Status: concluida.
- Calendario mensal com navegacao de 12 meses anteriores ate 1 mes futuro.
- Prescricao por Aquecimento, Tecnica/Balistico, Forca e Musculacao.
- Exercicios com series, repeticoes, carga e descanso.
- Criacao, edicao, visualizacao e exclusao logica com snapshot de versoes.
- Status visuais de treino futuro, pendente, concluido e nao realizado.
- Isolamento por `trainer_id` e bloqueio de alteracao de sessao concluida.

## Sprint 5 - Execucao de Treino

- Status: concluida.
- Atleta visualiza somente os proprios treinos.
- Inicio da sessao, conclusao individual de secoes e progresso recalculado.
- Secoes vazias nao entram no percentual.
- Conclusao exclusiva pelo atleta com data, hora e duracao.
- Historico da prescricao e da execucao preservado.

## Sprint 6 - Feedback

- Status: concluida.
- Feedback com PSE, fadiga e observacoes.
- Comentarios do treinador vinculados a sessao e visiveis ao atleta.
- Auditoria de criacao, alteracao, inicio, conclusao, feedback e comentario.
- Testes de autorizacao, regras de execucao e clientes da API.

## Sprint 7 - Upload de Videos

- Upload MP4/MOV, preview, reproducao e streaming local.

## Sprint 8 - Recordes Pessoais

- Historico de evolucao, comparativos e integracao dos PRs com treinos.

## Sprint 9 - Controle de Fadiga

- Recovery Score e historico.

## Sprint 10 - Analytics

- Volume, frequencia, RPE medio, evolucao de PRs e fadiga.

## Sprint 11 - Biblioteca de Exercicios

- Videos, descricoes, objetivos e erros comuns.

## Sprint 12 - PWA

- Instalacao, cache e offline basico.
