FROM node:22.13.1-alpine3.21 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --include=dev

FROM node:22.13.1-alpine3.21 AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY package.json package-lock.json ./
COPY apps/api apps/api
COPY packages packages
RUN npm run prisma:generate -w @lvm/api
RUN npm run build -w @lvm/api

FROM node:22.13.1-alpine3.21 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
RUN addgroup -S lvm && adduser -S lvm -G lvm
COPY --from=build --chown=lvm:lvm /app/node_modules ./node_modules
COPY --from=build --chown=lvm:lvm /app/package.json ./package.json
COPY --from=build --chown=lvm:lvm /app/package-lock.json ./package-lock.json
COPY --from=build --chown=lvm:lvm /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=lvm:lvm /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=lvm:lvm /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=lvm:lvm /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=lvm:lvm /app/apps/api/scripts ./apps/api/scripts
USER lvm
EXPOSE 3333
CMD ["npm", "run", "start", "-w", "@lvm/api"]
