FROM node:18-bullseye-slim

# Create app directory
WORKDIR /app

# Install dependencies (production only)
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Ensure environment
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/index.js"]
