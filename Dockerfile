# Root Dockerfile for Railway's GitHub auto-deploy of the API.
# Railway builds the connected service from the repo root; this builds the
# server/ backend from here so no "Root Directory" dashboard setting is needed.
# Mirrors server/Dockerfile (used by `railway up` run from the server/ dir).
# tsx runtime: ship source and run through tsx like `npm start` does locally.
FROM node:20-slim
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server/ .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["npm", "start"]
