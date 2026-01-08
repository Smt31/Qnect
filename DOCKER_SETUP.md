# Docker Setup for Qpoint Application

## Overview

This document explains how to run the Qpoint application using Docker containers in both local development and production environments.

## Project Structure

```
.
├── backend/          # Spring Boot application
├── frontend/         # React application
├── docker-compose.yml
└── .env.example      # Example environment file
```

## Running Locally

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2+

### Steps

1. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Update environment variables** in `.env`:
   ```bash
   # Database configuration for Neon PostgreSQL
   DB_URL=jdbc:postgresql://your-neon-db-url
   DB_USER=your-db-username
   DB_PASSWORD=your-db-password
   
   # JWT configuration (use strong secret in production)
   JWT_SECRET=your-very-secure-jwt-secret
   
   # SMTP configuration (for email functionality)
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   
   # Cloudinary configuration (for file uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

3. **Build and run the application**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Frontend: http://localhost
   - Backend API: http://localhost:8080
   - Backend health check: http://localhost:8080/actuator/health

5. **To run in detached mode**:
   ```bash
   docker-compose up --build -d
   ```

6. **To stop the application**:
   ```bash
   docker-compose down
   ```

## Running in Production

### On Cloud Platforms (Railway, Render, Fly.io)

#### Railway

1. Create a new project in Railway
2. Connect your GitHub repository
3. Add the following build arguments:
   - Backend: Set environment variables in Railway dashboard
   - Frontend: No special configuration needed
4. Add the following environment variables in Railway:
   - `DB_URL`, `DB_USER`, `DB_PASSWORD`
   - `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
5. Deploy!

#### Render

1. Create two services in Render:
   - Web Service for frontend (Dockerfile)
   - Web Service for backend (Dockerfile)
2. Configure environment variables in Render dashboard
3. Set up health checks for both services

#### Fly.io

1. Create a fly.toml file:
   ```bash
   fly launch
   ```
2. Add environment variables:
   ```bash
   fly secrets set DB_URL=your_db_url DB_USER=your_user DB_PASSWORD=your_password
   ```
3. Deploy:
   ```bash
   fly deploy
   ```

### Production Environment Variables

Ensure you have these environment variables set in production:

```bash
# Database
DB_URL=your-neon-postgres-connection-string
DB_USER=your-db-username  
DB_PASSWORD=your-db-password

# Security
JWT_SECRET=a-very-long-and-secure-random-string-at-least-32-chars
JWT_ACCESS_EXPIRATION=3600000    # 1 hour in ms
JWT_REFRESH_EXPIRATION=604800000  # 7 days in ms

# SMTP for email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Cloudinary for file uploads
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Architecture

### Container Communication

- Frontend (port 80) ↔ Nginx proxy ↔ Backend (port 8080)
- All API requests from frontend are proxied to backend through nginx
- Backend connects directly to Neon PostgreSQL database

### Security Features

- Non-root users in containers
- Health checks for service reliability
- Proper CORS handling via nginx proxy
- Environment variable-based configuration

### Performance Features

- Multi-stage builds for smaller images
- Static asset caching in nginx
- Proper timeout configurations
- Layer caching for faster builds

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Verify Neon PostgreSQL connection string format
   - Check that environment variables are properly set
   - Ensure your Neon database allows connections from containers

2. **Frontend-Backend Communication**:
   - Verify nginx proxy configuration
   - Check that backend service is healthy before frontend starts

3. **Build Issues**:
   - Ensure Docker version supports buildkit (if using newer features)
   - Check that all dependencies are properly cached

### Useful Commands

```bash
# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Execute command in running container
docker-compose exec backend sh
docker-compose exec frontend sh

# Build only specific service
docker-compose build backend
docker-compose build frontend

# Clean up
docker-compose down -v  # removes volumes too
```

## Environment Configuration

### Development vs Production

The application uses different profiles:
- `SPRING_PROFILES_ACTIVE=prod` in containers
- Development settings in local `application.properties`

For production deployment, ensure:
- `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` (not update)
- Proper logging levels set
- Security headers configured