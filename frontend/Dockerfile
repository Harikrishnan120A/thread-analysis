FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./package.json
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
RUN npm run build

# Development image for `docker compose --profile dev`
FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development NEXT_TELEMETRY_DISABLED=1 HOST=0.0.0.0 PORT=3000
# Dependencies will be mounted at runtime via anonymous volume (/app/node_modules)
# Install once for the image so it's ready if volume is empty
COPY package.json ./package.json
RUN npm install --no-audit --no-fund
COPY . ./
EXPOSE 3000
CMD ["npm","run","dev"]

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
