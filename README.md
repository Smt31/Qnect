# Qnect
> A modern social platform for real-time interaction, community building, and AI-assisted engagement.

![Java](https://img.shields.io/badge/Java-21-orange?style=flat-square)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.6-green?style=flat-square)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square)
![Redis](https://img.shields.io/badge/Redis-Cache-red?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)

---

## 🌟 Features

### 💬 Real-time Communication
- **Private Messaging**: Secure 1-on-1 conversations.
- **Group Chats**: Create and manage groups with ease.
- **WebSocket Integration**: Powered by STOMP for instant message delivery.

### 🧠 AI-Assisted Interactions
- **@Cue Assistant**: Your intelligent companion for answering questions and assisting within the platform.
- **Smart Comments**: AI-generated insights and replies to enhance discussions.
- **Summarization**: Quickly grasp lengthy discussions with AI-powered summaries.

### 🌐 Social Feed & Topics
- **Dynamic Feed**: Stay updated with posts, likes, and comments from your network.
- **Topic-Based Discussions**: Follow specific interests and engage in focused conversations.
- **Media Support**: Seamless image uploads via Cloudinary.

### 📧 Notifications
- **Email Alerts**: Transactional emails powered by Brevo (Sendinblue).

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Spring Boot 3 (Java 21)
- **Database**: PostgreSQL (Neon DB)
- **Cache**: Redis (Upstash)
- **Security**: Spring Security + JWT Authentication
- **Real-time**: WebSocket (STOMP)
- **Integrations**: Cloudinary, Brevo, Gemini AI, NewsAPI

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Real-time**: SockJS + STOMP Client
- **Routing**: React Router DOM

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Java 21 (JDK)](https://www.oracle.com/java/technologies/downloads/)
- [Node.js (v18+)](https://nodejs.org/)
- [Docker](https://www.docker.com/) (Optional)
- PostgreSQL Database
- Redis Server

---

## � Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Qpoint.git
cd Qpoint
```

### 2. Backend Configuration
Navigate to the backend directory:
```bash
cd backend
```

Create a `src/main/resources/application.properties` file:

| Variable | Description |
| :--- | :--- |
| `DB_URL` | PostgreSQL Connection URL (`jdbc:postgresql://...`) |
| `DB_USER` | Database Username |
| `DB_PASS` | Database Password |
| `REDIS_PASSWORD` | Redis Password |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) |
| `JWT_ACCESS_EXPIRATION` | Access token expiration (ms) |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration (ms) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret |
| `BREVO_API_KEY` | Brevo API Key |
| `BREVO_FROM_EMAIL` | Sender Email Address |
| `GEMINI_API_KEY` | Google Gemini AI API Key |
| `NEWSAPI_KEY` | NewsAPI Key |

Build and run the application:
```bash
./mvnw clean install
./mvnw spring-boot:run
```
The backend will start on `http://localhost:8080`.

### 3. Frontend Configuration
Navigate to the frontend directory:
```bash
cd ../frontend
```

Create a `.env` file in the root:

| Variable | Description |Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Check backend URL | `http://localhost:8080` |

Install dependencies and start the development server:
```bash
npm install
npm run dev
```
The application will be available at `http://localhost:5173`.

---

## 🐳 Docker Support

To run the full stack with Docker Compose:

1. Ensure the backend environment variables are set (either in `.env` or properly exported).
2. Run the following command from the project root:

```bash
docker-compose up --build -d
```

This will spin up the backend, frontend, and database services.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
