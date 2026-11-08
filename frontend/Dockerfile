FROM node:22.22.3-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/classforge-frontend/browser/ /usr/share/nginx/html/

EXPOSE 8080