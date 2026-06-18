# Escopo do Produto

## Objetivo

Construir uma plataforma web responsiva para treinadores e atletas de Levantamento de Peso Olimpico, com gestao de treinos, feedbacks, fadiga, PRs, videos e analytics.

## Papeis

- `TRAINER`: gerencia atletas, treinos, feedbacks, videos, PRs, exercicios e analytics.
- `ATHLETE`: visualiza treinos, envia check-ins, feedbacks, videos, PRs e acompanha evolucao.

## Modulos

- Autenticacao com JWT e refresh token.
- Gestao de atletas.
- Planejamento de semanas, dias, blocos, series e complexes.
- Publicacao com snapshot de cargas.
- Recalculo manual de cargas.
- Execucao de treino e check-in.
- Feedback atleta-treinador.
- Upload local de videos e fotos.
- Recordes pessoais.
- Controle de fadiga e Recovery Score.
- Analytics de volume, frequencia, RPE, PRs e fadiga.
- Biblioteca de exercicios.
- PWA em sprint futura.

## Regras de Desenvolvimento

- TDD sempre que possivel.
- Cobertura minima alvo de 80%.
- Clean Architecture.
- SOLID.
- Repository Pattern.
- DTO validation.
- OpenAPI/Swagger.
- Preparacao para migracao futura do backend para consumo por Flutter.
