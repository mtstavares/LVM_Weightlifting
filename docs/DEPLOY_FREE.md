# Deploy gratuito para teste

Este roteiro deixa o SaaS funcional na web usando GitHub, Neon, Render, Vercel e Resend.

## O que ja foi preparado no projeto

- Banco local limpo, sem usuarios, atletas, posts, treinos ou PRs cadastrados.
- Seed mantendo apenas exercicios padrao do sistema.
- `.gitignore` bloqueando `.env`, uploads locais, outbox de e-mails, builds, caches e dependencias.
- `render.yaml` para facilitar criacao da API no Render.
- `apps/web/vercel.json` para publicar o frontend Next.js dentro do monorepo.
- `.env.production.example` com todas as variaveis necessarias, sem secrets reais.
- Scripts:
  - `npm run build:api`
  - `npm run build:web`
  - `npm run start:api:prod`

## Arquitetura gratuita

- GitHub: repositorio do codigo.
- Neon: banco PostgreSQL gratuito.
- Render: API NestJS gratuita.
- Vercel: frontend Next.js gratuito.
- Resend: envio de e-mails gratuito.
- Storage local no Render: apenas para teste.

Importante: no Render Free, arquivos enviados para storage local podem sumir em redeploy/restart. Para teste serve. Para uso real, migrar para Cloudflare R2, S3 ou Supabase Storage.

## Parte 1 - Preparar o GitHub

### 1.1 Conferir arquivos que nao devem subir

Antes de publicar, confirme que estes arquivos/pastas nao serao versionados:

- `.env`
- `node_modules`
- `apps/**/node_modules`
- `apps/**/dist`
- `apps/web/.next`
- `apps/web/coverage`
- `storage/mail-outbox/*`
- `storage/photos/*`
- `storage/feed/*`
- `storage/videos/*`

Os arquivos `.gitkeep` dentro de `storage` podem subir. Eles mantem as pastas vazias no repositorio.

### 1.2 Criar repositorio

1. Acesse o GitHub.
2. Crie um repositorio novo.
3. Sugestao de nome: `lvm-weightlifting`.
4. Mantenha como privado por enquanto.
5. Nao marque para criar README, `.gitignore` ou license, pois o projeto ja possui esses arquivos.

### 1.3 Subir o codigo

No terminal, na raiz do projeto:

```bash
git status
git add .
git commit -m "Prepare free deployment"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/lvm-weightlifting.git
git push -u origin main
```

Se o remote ja existir:

```bash
git remote set-url origin https://github.com/SEU_USUARIO/lvm-weightlifting.git
git push -u origin main
```

## Parte 2 - Criar banco no Neon

### 2.1 Criar projeto

1. Acesse Neon.
2. Crie uma conta.
3. Clique em `New Project`.
4. Nome sugerido: `lvm-weightlifting`.
5. Escolha a regiao mais proxima possivel do Render.
6. Crie o banco.

### 2.2 Copiar URL do banco

No painel do Neon:

1. Abra `Connection Details`.
2. Selecione `Prisma` ou `Node.js`.
3. Copie a connection string.
4. Ela sera usada como `DATABASE_URL`.

Formato esperado:

```bash
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Se existir opcao `pooled connection`, use a URL pooled para producao.

## Parte 3 - Criar envio de e-mails no Resend

### 3.1 Criar API key

1. Acesse Resend.
2. Crie uma conta.
3. Va em `API Keys`.
4. Crie uma chave.
5. Copie a chave.

Ela sera usada como:

```bash
SMTP_PASSWORD=re_xxxxxxxxxxxxxxxxx
```

### 3.2 Configuracao SMTP

Use:

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASSWORD=SUA_API_KEY_RESEND
SMTP_FROM=LVM Weightlifting <onboarding@resend.dev>
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_GREETING_TIMEOUT_MS=10000
SMTP_SOCKET_TIMEOUT_MS=15000
```

Para teste, `onboarding@resend.dev` pode funcionar. Para producao com dominio proprio, depois configure um dominio verificado no Resend.

## Parte 4 - Publicar API no Render

### 4.1 Criar Web Service

1. Acesse Render.
2. Clique em `New`.
3. Escolha `Web Service`.
4. Conecte sua conta GitHub.
5. Selecione o repositorio `lvm-weightlifting`.
6. Escolha branch `main`.

### 4.2 Configuracao do servico

Use:

- Name: `lvm-api`
- Runtime: `Node`
- Region: preferencialmente a mesma ou mais proxima do Neon.
- Branch: `main`
- Root Directory: deixe vazio.
- Build Command:

```bash
npm ci --include=dev && npm run build:api
```

- Start Command:

```bash
npm run start:api:prod
```

- Health Check Path:

```bash
/health
```

Observacao: o `--include=dev` e necessario porque o build da API usa ferramentas de desenvolvimento, como Nest CLI, TypeScript, Prisma CLI e TSX. O `npm ci` forca uma instalacao limpa baseada no `package-lock.json` e evita cache antigo do Render.

### 4.3 Variaveis da API no Render

Configure em `Environment`:

```bash
NODE_ENV=production
DATABASE_URL=SUA_URL_DO_NEON
JWT_ACCESS_SECRET=gere-um-secret-forte
JWT_REFRESH_SECRET=gere-outro-secret-forte
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
WEB_URL=https://temporario.vercel.app
LOCAL_STORAGE_ROOT=./storage
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASSWORD=SUA_API_KEY_RESEND
SMTP_FROM=LVM Weightlifting <onboarding@resend.dev>
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_GREETING_TIMEOUT_MS=10000
SMTP_SOCKET_TIMEOUT_MS=15000
```

`WEB_URL` sera atualizado depois que a Vercel gerar a URL real do frontend.

### 4.4 Gerar secrets fortes

No PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Rode duas vezes:

- primeira saida para `JWT_ACCESS_SECRET`;
- segunda saida para `JWT_REFRESH_SECRET`.

Nunca use os valores do `.env.example` em producao.

### 4.5 Deploy da API

1. Clique em `Create Web Service`.
2. Aguarde o build.
3. O start executara automaticamente:
   - migrations do Prisma;
   - seed dos exercicios;
   - inicializacao da API.
4. Copie a URL da API.

Exemplo:

```bash
https://lvm-api.onrender.com
```

### 4.6 Testar API

Abra no navegador:

```bash
https://lvm-api.onrender.com/health
```

Resultado esperado:

- status HTTP `200`;
- resposta de saude da API.

Se demorar, aguarde. Render Free pode hibernar.

## Parte 5 - Publicar frontend na Vercel

### 5.1 Criar projeto

1. Acesse Vercel.
2. Clique em `Add New`.
3. Escolha `Project`.
4. Importe o repositorio `lvm-weightlifting`.

### 5.2 Configuracao do projeto

O arquivo `apps/web/vercel.json` ja define:

- framework: Next.js;
- install: `npm install`;
- build: `npm run build`;
- output gerenciado automaticamente pela Vercel.

Se a Vercel pedir configuracao manual, use:

- Framework Preset: `Next.js`
- Root Directory:

```bash
apps/web
```

- Node.js Version: `22.x`
- Install Command:

```bash
npm install
```

- Build Command:

```bash
npm run build
```

- Output Directory: deixe em branco. Para Next.js, a Vercel gerencia a saida automaticamente.

Importante: se o Root Directory ficar na raiz do repositorio, a Vercel pode falhar com `No Next.js version detected`, porque o `next` esta no `apps/web/package.json`, nao no `package.json` da raiz.

Importante: nao configure `.next` manualmente como Output Directory. Isso pode causar `No entrypoint found in output directory: ".next"`.

### 5.3 Variaveis do frontend na Vercel

Configure em `Environment Variables`:

```bash
NEXT_PUBLIC_API_URL=https://lvm-api.onrender.com
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
API_PROXY_URL=https://lvm-api.onrender.com
```

Troque `https://lvm-api.onrender.com` pela URL real da sua API.

`NEXT_PUBLIC_APP_URL` pode ser ajustada depois que a Vercel gerar a URL final.

### 5.4 Deploy do frontend

1. Clique em `Deploy`.
2. Aguarde finalizar.
3. Copie a URL gerada pela Vercel.

Exemplo:

```bash
https://lvm-weightlifting.vercel.app
```

## Parte 6 - Ajuste final de CORS e cookies

Depois que a Vercel gerar a URL final:

### 6.1 Atualizar Render

No Render, atualize:

```bash
WEB_URL=https://lvm-weightlifting.vercel.app
```

Use exatamente a URL do frontend, sem barra final.

### 6.2 Atualizar Vercel

Na Vercel, atualize:

```bash
NEXT_PUBLIC_APP_URL=https://lvm-weightlifting.vercel.app
NEXT_PUBLIC_API_URL=https://lvm-api.onrender.com
API_PROXY_URL=https://lvm-api.onrender.com
```

### 6.3 Redeploy

1. Redeploy da API no Render.
2. Redeploy do frontend na Vercel.

## Parte 7 - Teste funcional completo

Execute os testes abaixo na URL da Vercel.

### 7.1 Cadastro de treinador

1. Acesse `/login`.
2. Clique para criar conta.
3. Informe nome, e-mail e senha valida.
4. Envie o cadastro.
5. Verifique se o e-mail chegou.
6. Copie o codigo.
7. Confirme o e-mail.
8. Faca login.

Resultado esperado:

- treinador loga;
- abre area do treinador;
- menu aparece corretamente.

### 7.2 Criacao de atleta

1. Acesse `Atletas`.
2. Clique em `Adicionar atleta`.
3. Informe nome e e-mail.
4. Salve.
5. Confira se o atleta aparece na lista.
6. Verifique se o e-mail com senha temporaria chegou.

Resultado esperado:

- atleta criado;
- convite enviado;
- status pendente/convite exibido.

### 7.3 Primeiro acesso do atleta

1. Abra uma janela anonima.
2. Acesse a URL da Vercel.
3. Login com e-mail do atleta e senha temporaria.
4. Troque a senha.
5. Finalize cadastro.
6. Preencha dados obrigatorios.
7. Salve.

Resultado esperado:

- atleta nao acessa area interna antes de trocar senha/finalizar perfil;
- depois acessa area do atleta.

### 7.4 Perfil e PRs

1. Na conta do atleta, abra `Meu Perfil`.
2. Edite dados permitidos.
3. Cadastre PRs.
4. Salve.
5. Volte para conta do treinador.
6. Abra o perfil desse atleta.

Resultado esperado:

- treinador visualiza dados e PRs;
- treinador nao edita dados protegidos do atleta.

### 7.5 Treino

1. Na conta do treinador, abra um atleta.
2. Clique em um dia do calendario.
3. Prescreva treino.
4. Teste carga manual.
5. Teste porcentagem baseada em PR.
6. Salve.
7. Entre como atleta.
8. Abra `Meu Treino`.
9. Execute o treino.
10. Marque series.
11. Finalize treino.
12. Envie feedback.

Resultado esperado:

- treino aparece para o atleta correto;
- atleta nao edita prescricao;
- feedback aparece para o treinador.

### 7.6 Feed

1. Como treinador, abra `Feed`.
2. Crie uma publicacao com legenda.
3. Crie uma publicacao com imagem.
4. Como atleta, veja o feed.
5. Curta e comente.
6. Como treinador, exclua comentario/post de aluno.

Resultado esperado:

- feed aparece para o grupo correto;
- curtidas e comentarios funcionam;
- exclusoes respeitam permissao.

### 7.7 Biblioteca de exercicios

1. Como treinador, abra `Perfil`.
2. Clique em `Biblioteca de Exercicios`.
3. Busque exercicios do sistema.
4. Crie um exercicio personalizado.
5. Duplique um exercicio do sistema.
6. Inative um exercicio proprio.
7. Abra a prescricao de treino.

Resultado esperado:

- exercicios ativos aparecem na prescricao;
- exercicios inativos nao aparecem;
- exercicios do sistema nao podem ser editados diretamente.

## Parte 8 - Checklist de problemas comuns

### Erro `Failed to fetch`

Verifique:

- API Render esta acordada?
- `/health` responde?
- `NEXT_PUBLIC_API_URL` esta correto?
- `API_PROXY_URL` esta correto?
- `WEB_URL` no Render e igual a URL da Vercel?
- A URL nao tem barra final?

### Erro `Nao foi possivel concluir a solicitacao` ao criar conta

Normalmente isso indica que o frontend esta chamando o endpoint errado ou recebendo erro HTML/404.

Verifique na Vercel:

- `NEXT_PUBLIC_API_URL` existe?
- O valor e exatamente a URL da API no Render?
- Exemplo:

```bash
NEXT_PUBLIC_API_URL=https://lvm-api.onrender.com
```

- Nao use a URL da Vercel no `NEXT_PUBLIC_API_URL`.
- Depois de alterar variaveis `NEXT_PUBLIC_*`, faca novo deploy do frontend. Essas variaveis entram no build.

Verifique no Render:

- `WEB_URL` existe?
- O valor e exatamente a URL do frontend na Vercel?
- Exemplo:

```bash
WEB_URL=https://lvm-weightlifting.vercel.app
```

- Nao coloque barra final.
- Depois de alterar `WEB_URL`, faca redeploy da API.

### Erro Vercel `TypeError: Invalid URL`

Esse erro normalmente vem de uma variavel de ambiente com URL invalida.

Confira na Vercel:

- `NEXT_PUBLIC_APP_URL` deve ser uma URL completa.
- `NEXT_PUBLIC_API_URL` deve ser uma URL completa.
- `API_PROXY_URL` deve ser uma URL completa.
- Nao use colchetes, aspas, texto extra ou espaco.
- Nao coloque barra final.

Correto:

```bash
NEXT_PUBLIC_APP_URL=https://lvm-weightlifting.vercel.app
NEXT_PUBLIC_API_URL=https://lvm-api.onrender.com
API_PROXY_URL=https://lvm-api.onrender.com
```

Errado:

```bash
NEXT_PUBLIC_APP_URL=[https://lvm-weightlifting.vercel.app]
NEXT_PUBLIC_API_URL=SUA-API-DO-RENDER.onrender.com
API_PROXY_URL=https://lvm-api.onrender.com/
```

Depois de corrigir variaveis na Vercel, faca `Redeploy without cache`.

### Botao `Criar conta` fica carregando sem parar

Isso geralmente significa que a API recebeu a requisicao, mas ficou presa tentando enviar e-mail via SMTP.

Verifique no Render:

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=resend`
- `SMTP_PASSWORD` deve ser a API key real do Resend.
- `SMTP_FROM` deve ser um remetente aceito pelo Resend.

Para teste, use:

```bash
SMTP_FROM=LVM Weightlifting <onboarding@resend.dev>
```

Tambem configure os timeouts:

```bash
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_GREETING_TIMEOUT_MS=10000
SMTP_SOCKET_TIMEOUT_MS=15000
```

Depois de alterar qualquer variavel SMTP no Render, faca redeploy da API.

### Cadastro nao envia e-mail

Verifique:

- `SMTP_HOST=smtp.resend.com`
- `SMTP_USER=resend`
- `SMTP_PASSWORD` e a API key do Resend
- `SMTP_FROM` valido
- logs do Render

### Login nao segura sessao

Verifique:

- frontend usando HTTPS;
- API usando HTTPS;
- `WEB_URL` correto;
- browser nao bloqueando cookies;
- redeploy feito apos trocar env.

### Deploy da API falha em migrations

Verifique:

- `DATABASE_URL` do Neon esta correta;
- banco esta ativo;
- URL possui `sslmode=require`;
- migrations foram versionadas no GitHub.

### Upload funciona e depois some

Isso e esperado no Render Free com storage local. Para resolver de forma definitiva, migrar storage para R2/S3/Supabase Storage.

## Parte 9 - O que ainda fica para producao real

Para teste gratuito, o sistema fica utilizavel. Antes de clientes pagantes, recomenda-se:

- storage persistente privado para midias;
- dominio proprio;
- e-mail com dominio verificado;
- backups automaticos do banco;
- monitoramento de erros;
- API em plano que nao hiberna;
- politica de retencao de logs;
- pipeline de deploy com ambiente staging.
