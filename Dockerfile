# Stage 1: Build optimized static React bundle
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY public ./public
COPY src ./src
COPY tailwind.config.js postcss.config.js components.json ./

ARG REACT_APP_API_URL=/
ARG REACT_APP_NODE_API_URL=/
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_NODE_API_URL=$REACT_APP_NODE_API_URL \
    GENERATE_SOURCEMAP=false

RUN npm run build

# Stage 2: Ultra-lightweight Nginx Alpine runtime (~45MB)
FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=5s \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
