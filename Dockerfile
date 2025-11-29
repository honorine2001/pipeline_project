# Use node LTS
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source
COPY . .

# Expose the port
EXPOSE 3000

# Create data dir and set permissions for sqlite
RUN mkdir -p /usr/src/app/data
VOLUME [ "/usr/src/app/data" ]

ENV NODE_ENV=production
CMD ["node", "server.js"]
