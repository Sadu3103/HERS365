FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

ENV PORT=4000
EXPOSE 4000

CMD ["npm", "start"]
