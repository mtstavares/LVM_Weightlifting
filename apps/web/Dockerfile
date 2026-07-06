FROM node:22.13.1-alpine3.21 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --include=dev

FROM node:22.13.1-alpine3.21 AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_APP_URL=http://app.localhost
ARG API_PROXY_URL=http://api:3333
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV API_PROXY_URL=$API_PROXY_URL
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web apps/web
COPY packages packages
RUN npm run build -w @lvm/web

FROM node:22.13.1-alpine3.21 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S lvm && adduser -S lvm -G lvm
COPY --from=build --chown=lvm:lvm /app/node_modules ./node_modules
COPY --from=build --chown=lvm:lvm /app/package.json ./package.json
COPY --from=build --chown=lvm:lvm /app/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=lvm:lvm /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=lvm:lvm /app/apps/web/public ./apps/web/public
COPY --from=build --chown=lvm:lvm /app/packages ./packages
USER lvm
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@lvm/web"]
