# Stage 1: Build frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=build-frontend /app/frontend/dist ./frontend-dist
RUN mkdir /data && chown app:app /data
USER app

EXPOSE 3001
ENV DB_PATH=/data/data.sqlite
CMD ["node", "src/server.js"]
