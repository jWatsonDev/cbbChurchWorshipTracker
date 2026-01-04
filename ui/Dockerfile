FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Install simple http server for serving the Angular app
RUN npm install -g http-server

COPY --from=builder /app/dist/ui /app/dist

EXPOSE 4200

CMD ["http-server", "dist", "-p", "4200", "--proxy", "http://api:3000"]
