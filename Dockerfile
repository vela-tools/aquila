FROM node:26.13.1-trixie-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5 AS builder

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM scratch AS app-dist

COPY --from=builder /app/dist /

FROM nginx/nginx-unprivileged:1.31.10-alpine-slim@sha256:f4afc48254dc77ea692ec6979d220e5b1176331c636a4d51c502ffdded6789bd AS runtime

COPY --from=app-dist / /usr/share/nginx/html
COPY LICENSE.md NOTICE.md /usr/share/nginx/html/licenses/
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/aquila/security-headers.conf
COPY --chmod=755 nginx/40-aquila-config.sh /docker-entrypoint.d/40-aquila-config.sh

USER 101

EXPOSE 2361

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:2361/ || exit 1
