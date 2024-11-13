# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install production dependencies only
RUN pnpm install --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/configuration.ts ./

# Expose the port your app runs on
EXPOSE 8000

# Start the application
CMD ["node", "dist/main"]