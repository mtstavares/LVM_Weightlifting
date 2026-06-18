# LVM Weightlifting

Plataforma SaaS para gestao de atletas de Levantamento de Peso Olimpico (LPO).

## Sprint Atual

Autenticacao segura e gestao inicial de atletas: verificacao de e-mail, recuperacao de senha, primeiro acesso obrigatorio, JWT, refresh token rotativo e isolamento por treinador.

## Como Rodar

1. Instale e inicie o PostgreSQL local.
2. Copie `.env.example` para `.env`.
3. Execute `npm install`.
4. Execute `npm run prisma:generate`.
5. Execute `npm run prisma:migrate`.
6. Execute `npm run prisma:seed`.
7. Execute `npm run dev`.

Servicos locais:

- Web: `http://localhost:3000`
- API: `http://localhost:3333`
- Swagger: `http://localhost:3333/docs`

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
