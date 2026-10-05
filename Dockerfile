FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and static assets
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (defaults to 3000 or platform PORT)
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Start DevRelay server
CMD ["npm", "start"]
