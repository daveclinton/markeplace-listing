Now, to test the setup:

Build and run the development environment:

bashCopy# First time or after dependencies change
docker-compose up --build

# Subsequent runs
docker-compose up

Build and run the production environment:

bashCopy# First time or after dependencies change
docker-compose -f docker-compose.prod.yml up --build

# Subsequent runs
docker-compose -f docker-compose.prod.yml up
To stop the containers:
bashCopy# Development
docker-compose down

# Production
docker-compose -f docker-compose.prod.yml down
To view logs:
bashCopy# Follow logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app