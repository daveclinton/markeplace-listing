# Docker Development Setup

This guide explains how to build and run the application in both development and production environments using Docker.

## Development Environment

### First Time Setup
```bash
# Build and run containers with dependencies
docker-compose up --build
```

### Regular Usage
```bash
# Start containers
docker-compose up

# Stop containers
docker-compose down
```

## Production Environment

### First Time Setup
```bash
# Build and run containers with dependencies
docker-compose -f docker-compose.prod.yml up --build
```

### Regular Usage
```bash
# Start containers
docker-compose -f docker-compose.prod.yml up

# Stop containers
docker-compose -f docker-compose.prod.yml down
```

## Logging

View container logs using the following commands:

```bash
# Follow all container logs
docker-compose logs -f
s
# View specific service logs (e.g., app service)
docker-compose logs -f app
```

## Quick Reference

| Environment | Build & Run | Stop |
|-------------|------------|------|
| Development | `docker-compose up --build` | `docker-compose down` |
| Production | `docker-compose -f docker-compose.prod.yml up --build` | `docker-compose -f docker-compose.prod.yml down` |

## Notes
- Use `--build` flag when dependencies change or during first-time setup
- For regular usage, you can omit the `--build` flag
- Production environment uses a separate configuration file: `docker-compose.prod.yml`





