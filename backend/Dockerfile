# Backend Production Dockerfile for Fiber World Operations Platform
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig.json ./
RUN npm install

COPY src/ ./src/
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache python3 make g++

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY src/models/schema.sql ./src/models/schema.sql
COPY src/models/schema.sql ./dist/models/schema.sql

# Create persistent data and uploads directory
RUN mkdir -p data uploads

EXPOSE 5000

CMD ["node", "dist/index.js"]
