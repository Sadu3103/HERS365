# tsx runtime: compiled dist/ can't run under plain node (extension-less ESM
# imports), so ship source and run through tsx like `npm start` does locally.
FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["npm", "start"]
