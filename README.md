# Clothing Management System

A full-stack clothing management application built with Vue.js, Express, PostgreSQL, and Docker. The app supports user authentication, clothing inventory management, outfit planning, and image uploads.

## Tech Stack

- Frontend: Vue 3 + Vite
- Backend: Express.js + Node.js
- Database: PostgreSQL
- Containerization: Docker Compose

## Features

- User registration and login
- JWT-based authentication
- CRUD for clothing items
- Image upload support for clothing
- Outfit creation with clothing items
- Responsive UI for managing inventory

## Project Structure

```text
Clothing-Management-System-19-30/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── uploads/
├── frontend/
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Run with Docker Compose

### Prerequisites

- Docker Desktop installed and running

### Start the application

```bash
docker-compose up --build
```

### Access the app

- Frontend: http://localhost:3000
- Backend API: http://localhost:5002/api
- PostgreSQL: localhost:5432

### Stop the application

```bash
docker-compose down
```

To remove volumes and reset stored data:

```bash
docker-compose down -v
```

## Run Locally Without Docker

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend will run on port 5002 by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on Vite's default dev server.

## Environment Variables

### Backend

The backend uses the following environment variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clothing_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5002
JWT_SECRET=clothing-secret-key
```

### Frontend

```env
VITE_API_URL=http://localhost:5002/api
```

## API Endpoints

### Authentication

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/me
- PUT /api/auth/me/password

### Clothing

- GET /api/clothing
- GET /api/clothing/:id
- POST /api/clothing
- PUT /api/clothing/:id
- DELETE /api/clothing/:id

### Outfits

- GET /api/outfits
- GET /api/outfits/:id
- POST /api/outfits
- PUT /api/outfits/:id
- DELETE /api/outfits/:id

### Health Check

- GET /api/health

## Notes

- Most API routes require a JWT token in the Authorization header.
- Uploaded images are stored under the backend uploads folder.
- The database is initialized automatically when the backend starts.

## License

This project is intended for learning and educational purposes.