FROM node:22-slim

RUN npx -y playwright@1.52.0 install --with-deps chromium

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

COPY dist/ ./dist/

CMD ["node", "dist/index.js"]
