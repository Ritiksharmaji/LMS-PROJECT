# Build: docker build -t orbitly-web frontend
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY . .
# Public pages are cached and refreshed at runtime, so the build doesn't need the API.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_DEFAULT_ORG=northfield
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL NEXT_PUBLIC_DEFAULT_ORG=$NEXT_PUBLIC_DEFAULT_ORG NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN adduser -S -u 1001 orbitly
COPY --from=build --chown=orbitly /app/.next/standalone ./
COPY --from=build --chown=orbitly /app/.next/static .next/static
COPY --from=build --chown=orbitly /app/public public
USER orbitly
EXPOSE 3000
CMD ["node", "server.js"]
