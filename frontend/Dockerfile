ARG FRONTEND_BUILD_IMAGE=node:22-alpine
ARG FRONTEND_RUNTIME_IMAGE=nginx:1.27-alpine

FROM ${FRONTEND_BUILD_IMAGE} AS build

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM ${FRONTEND_RUNTIME_IMAGE}

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist /usr/share/nginx/html

EXPOSE 80
