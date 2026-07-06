# Infraestrutura Local Docker

Este ambiente reproduz em localhost a arquitetura planejada para uma VPS.

## Servicos

- `traefik`: reverse proxy e dashboard local.
- `web`: frontend Next.js.
- `api`: backend NestJS.
- `postgres`: banco PostgreSQL interno.
- `minio`: storage S3 local para fotos, imagens e videos.
- `minio-init`: cria o bucket automaticamente.
- `mailpit`: SMTP local e interface para leitura de e-mails.
- `redis`: preparado para cache, filas, notificacoes e sessoes futuras.

## URLs locais

- App: `http://app.localhost`
- App sem editar hosts: `http://localhost`
- API: `http://api.localhost`
- Health API: `http://api.localhost/health`
- Mailpit: `http://mail.localhost`
- MinIO Console: `http://minio.localhost`
- Traefik Dashboard: `http://localhost:8080`

Em Windows, macOS e Linux modernos, `*.localhost` normalmente funciona sem editar `hosts`.
Se nao resolver, adicione no arquivo hosts:

```text
127.0.0.1 app.localhost
127.0.0.1 api.localhost
127.0.0.1 mail.localhost
127.0.0.1 minio.localhost
```

Sem permissao de administrador para alterar `hosts`, use `http://localhost` para acessar o app. Mailpit e MinIO continuam usando os hosts dedicados acima.

## Redes

- `frontend`: Traefik e Web.
- `backend`: Traefik, Web e API.
- `tools`: Traefik, Mailpit UI e MinIO UI.
- `internal`: API, PostgreSQL, Redis, MinIO e Mailpit.

PostgreSQL, Redis e MinIO API nao sao expostos diretamente no host.

## Volumes

- `postgres_data`: dados do PostgreSQL.
- `minio_data`: objetos enviados para MinIO.
- `redis_data`: dados persistidos do Redis.

## Variaveis

O ambiente local usa `.env.development`.

Para VPS/producao, use `.env.production.example` como base e nunca versionar secrets reais.

Variaveis principais:

- `WEB_URL`: origem autorizada do frontend.
- `NEXT_PUBLIC_API_URL`: `/api` para usar proxy same-origin.
- `API_PROXY_URL`: URL interna da API para o Next.js.
- `DATABASE_URL`: montada automaticamente no compose para o container da API.
- `FILE_STORAGE_DRIVER`: `s3` para MinIO/S3.
- `S3_ENDPOINT`: endpoint S3/MinIO.
- `S3_BUCKET`: bucket de uploads.
- `SMTP_HOST`: `mailpit` no Docker local.
- `REDIS_URL`: `redis://redis:6379`.

## Comandos

Subir ambiente:

```bash
npm run docker:up
```

Parar:

```bash
npm run docker:down
```

Reiniciar:

```bash
npm run docker:restart
```

Ver status:

```bash
npm run docker:ps
```

Ver logs:

```bash
npm run docker:logs
```

Executar migrations:

```bash
npm run docker:migrate
```

Executar Prisma Generate:

```bash
npm run docker:generate
```

Executar seed de exercicios:

```bash
npm run docker:seed
```

Criar contas de teste:

```bash
npm run docker:seed:test
```

Apagar volumes locais:

```bash
npm run docker:reset
```

## Fluxo de primeiro uso

1. Instale Docker Desktop.
2. Execute:

```bash
npm run docker:up
```

3. Aguarde os containers ficarem saudaveis:

```bash
npm run docker:ps
```

4. Acesse `http://app.localhost`.
5. Cadastre um treinador.
6. Abra `http://mail.localhost`.
7. Copie o codigo de confirmacao.
8. Confirme o e-mail no app.

## MinIO

Interface:

```text
http://minio.localhost
```

Credenciais locais:

```text
usuario: lvm_minio
senha: lvm_minio_password
```

Bucket criado automaticamente:

```text
lvm-uploads
```

Os uploads ficam privados. A aplicacao serve os arquivos por `/storage/...` validando autenticacao e vinculo.

## Mailpit

SMTP interno:

```text
mailpit:1025
```

Interface:

```text
http://mail.localhost
```

Todos os e-mails de confirmacao, recuperacao e senhas temporarias devem aparecer ali.

## PostgreSQL

O banco fica acessivel apenas pela rede interna Docker.

Para acessar manualmente:

```bash
docker compose --env-file .env.development exec postgres psql -U lvm -d lvm_weightlifting
```

## Traefik

Dashboard:

```text
http://localhost:8080
```

Traefik e o unico servico com portas publicadas diretamente no host.
As rotas locais ficam em `docker/traefik/dynamic.yml`; o Docker socket nao e montado no Traefik.

## Validacao manual

Checklist:

- `http://app.localhost` abre a tela de login.
- `http://api.localhost/health` retorna OK.
- Cadastro de treinador envia e-mail para Mailpit.
- Confirmacao de e-mail funciona.
- Login redireciona para o feed.
- Criacao de atleta envia senha temporaria para Mailpit.
- Upload de foto/feed grava objeto no MinIO.
- Feed continua listando posts.
- Treino continua abrindo para treinador e atleta.

## Preparacao para VPS

Na VPS, a estrutura deve ser reaproveitada alterando variaveis:

- dominio real em `WEB_URL` e `NEXT_PUBLIC_APP_URL`;
- secrets fortes;
- senhas fortes do Postgres e MinIO;
- SMTP real;
- storage S3 real ou MinIO persistente.

Para producao real, criar futuramente `docker-compose.prod.yml` com TLS, backups e politicas de deploy.
