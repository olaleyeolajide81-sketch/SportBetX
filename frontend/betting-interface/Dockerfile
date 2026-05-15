FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json vite.config.ts ./
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

FROM nginx:1.25-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN adduser -D -u 1001 nginxuser && \
    chown -R nginxuser:nginxuser /usr/share/nginx/html /var/cache/nginx /var/run

USER nginxuser

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
