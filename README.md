# LVM Weightlifting

Plataforma SaaS para gestao de atletas de Levantamento de Peso Olimpico (LPO).

## Sprint Atual

Sprints 3 a 6 concluidas: gestao de atletas, calendario de treinos, prescricao, execucao, feedback, auditoria e isolamento por treinador.

## Como Rodar

1. Instale e inicie o PostgreSQL local.
2. Copie `.env.example` para `.env`.
3. Execute `npm install`.
4. Execute `npm run prisma:generate`.
5. Execute `npm run prisma:migrate`.
6. Execute `npm run prisma:seed`.
7. Execute `npm run dev`.

## Deploy gratuito

Para publicar uma versão de teste sem custo mensal, use o guia em `docs/DEPLOY_FREE.md`.

## Infraestrutura local Docker

Para rodar a arquitetura local com Traefik, PostgreSQL, MinIO, Mailpit e Redis, use `docs/DOCKER_LOCAL.md`.

Servicos locais:

- Web Docker: `http://app.localhost`
- API Docker: `http://api.localhost`
- Health API Docker: `http://api.localhost/health`
- Mailpit Docker: `http://mail.localhost`
- MinIO Docker: `http://minio.localhost`

## E-mails no ambiente local

Sem SMTP configurado, os e-mails de confirmacao e senhas temporarias sao gravados como arquivos JSON em:

`storage/mail-outbox`

Para envio real, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM` no `.env`.

## Fluxos de acesso

- Treinador cria a conta e confirma um codigo com validade de 15 minutos e limite de 5 tentativas.
- A conta permanece inativa ate a confirmacao do e-mail.
- Recuperacao de senha envia uma credencial temporaria de uso unico, valida por 30 minutos.
- Atletas sao criados somente pelo treinador autenticado.
- O primeiro login do atleta exige troca imediata da senha.
- A primeira troca de senha redireciona obrigatoriamente para a finalizacao do perfil.
- O atleta gerencia os proprios dados pessoais, foto e PRs.
- O treinador visualiza o perfil completo e os PRs, sem editar dados protegidos.
- O treinador prescreve treinos no calendario do atleta com quatro secoes configuraveis.
- O atleta executa secoes, acompanha o progresso, conclui a sessao e envia feedback.
- O treinador consulta o feedback e adiciona comentarios preservados no historico.
- O backend filtra atletas pelo treinador autenticado e retorna `403` em acesso cruzado.
## Comandos

- `npm run dev`: inicia API e frontend localmente, sem Docker.
- `npm run dev:docker`: sobe todos os servicos com Docker Compose.
- `npm run test`: executa testes dos workspaces.
- `npm run lint`: executa lint dos workspaces.
- `npm run prisma:generate`: gera Prisma Client.
- `npm run prisma:migrate`: roda migrations locais.
- `npm run prisma:seed`: cadastra exercicios iniciais.

## Decisoes de Arquitetura

- Backend NestJS isolado em `apps/api`.
- Frontend Next.js isolado em `apps/web`.
- Codigo compartilhavel em `packages/shared`.
- Prisma centralizado no backend.
- Uploads locais atras de contrato `FileStorageService`.
- Execucao local como fluxo principal durante o desenvolvimento.
- Docker Compose mantido para integracao futura.
