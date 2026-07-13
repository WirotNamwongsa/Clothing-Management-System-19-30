# 👕 Clothing Management System

A modern, stylish clothing management system built with Vue.js, Express, PostgreSQL, and Docker. Features a teen-friendly UI with smooth animations and full CRUD functionality.

## 🚀 Tech Stack

- **Frontend**: Vue.js 3 + Vite
- **Backend**: Express.js
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose

## ✨ Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- 🎨 Modern, teen-friendly UI design
- 🌈 Beautiful gradient backgrounds
- ✨ Smooth animations and transitions
- 📱 Responsive design
- 🖼️ Image support for clothing items
- 📊 Stock management with status indicators

## 🐳 Running with Docker Desktop

### Prerequisites
- Docker Desktop installed and running

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd Clothing-Management-System-19-30
```

2. Build and run all services:
```bash
docker-compose up --build
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Database: localhost:5432

### Stopping the Application

```bash
docker-compose down
```

To remove volumes (this will delete all data):
```bash
docker-compose down -v
```

## 📁 Project Structure

```
Clothing-Management-System-19-30/
├── backend/
│   ├── server.js          # Express server with CRUD endpoints
│   ├── package.json       # Backend dependencies
│   ├── Dockerfile         # Backend Docker configuration
│   └── .env.example       # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── App.vue        # Main Vue component
│   │   ├── main.js        # Vue entry point
│   │   └── style.css      # Global styles
│   ├── index.html         # HTML template
│   ├── package.json       # Frontend dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── Dockerfile         # Frontend Docker configuration
│   └── .env.example       # Environment variables template
└── docker-compose.yml     # Docker Compose configuration
```

## 🔧 API Endpoints

- `GET /api/clothing` - Get all clothing items
- `GET /api/clothing/:id` - Get single clothing item
- `POST /api/clothing` - Create new clothing item
- `PUT /api/clothing/:id` - Update clothing item
- `DELETE /api/clothing/:id` - Delete clothing item
- `GET /api/health` - Health check

## 🎨 Customization

### Environment Variables

**Backend (.env)**
```
DB_HOST=postgres
DB_PORT=5432
DB_NAME=clothing_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:5000/api
```

## 📝 Database Schema

```sql
CREATE TABLE clothing (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  size VARCHAR(50) NOT NULL,
  color VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ Development

### Running without Docker

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
npm start
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 📄 License

This project is open source and available for educational purposes.