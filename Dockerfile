FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . ./
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

CMD ["node", "index.js"]
