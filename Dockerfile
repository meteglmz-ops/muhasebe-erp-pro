FROM node:20-alpine

# Install build tools needed for better-sqlite3 compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY client/package*.json ./client/

# Install server and client dependencies
RUN npm install
RUN npm --prefix client install

# Copy application source
COPY . .

# Build client frontend
RUN npm --prefix client run build

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["npm", "start"]
