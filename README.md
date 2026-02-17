# Qpoint

**Qpoint** is a modern social platform designed for real-time interaction, community building, and AI-assisted engagement. It features real-time chat, topic-based discussions, a dynamic feed, and AI integration to enhance user experience.

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.6-green)
![React](https://img.shields.io/badge/React-18-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Redis](https://img.shields.io/badge/Redis-Cache-red)

---

## 🚀 Features

- **Authentication & Profiles**: Secure user registration, login, and customizable profiles with avatars.
- **Real-time Chat**: 
    - Private 1-on-1 messaging.
    - Group chats with member management.
    - Powered by WebSocket (STOMP) for instant delivery.
- **Feed & Posts**: Share updates, images, and engage with content via likes and comments.
- **Topic Following**: Follow specific topics (Skills) to personalize your feed.
- **AI Integration**:
    - **AI Comments**: Get AI-generated insights or replies on posts.
    - **AI Assistance**: Gemini AI integration for enhanced interactions.
- **Media Uploads**: Seamless image uploads using Cloudinary.
- **Email Notifications**: Integrated with Brevo (Sendinblue) for transaction emails.
- **News Integration**: Stay updated with relevant news via NewsAPI.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Spring Boot 3 (Java 21)
- **Database**: PostgreSQL (Neon DB)
- **Caching**: Redis (Upstash)
- **Security**: Spring Security + JWT
- **Communication**: WebSocket (STOMP), REST API
- **External Services**: 
    - Cloudinary (Images)
    - Brevo (Email)
    - Gemini AI (AI Features)
    - NewsAPI (News)
- **Build Tool**: Maven

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **State/Data Management**: React Query (TanStack Query)
- **Real-time**: SockJS + STOMP client
- **Routing**: React Router DOM

---

## ⚙️ Prerequisites

Ensure you have the following installed:
- **Java 21**
- **Node.js** (v18+ recommended)
- **Docker** (optional, for containerized run)
- **PostgreSQL** (or a cloud instance like Neon)
- **Redis** (or a cloud instance like Upstash)

---

## 📥 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Qpoint.git
cd Qpoint
```

### 2. Backend Setup
Navigate to the backend directory:
```bash
cd backend
```

Create a `src/main/resources/application.properties` file or set environment variables. The application expects the following:

**Required Environment Variables:**

| Variable | Description |
|----------|-------------|
| `DB_URL` | PostgreSQL Connection URL (e.g., `jdbc:postgresql://host:port/db`) |
| `DB_USER` | Database Username |
| `DB_PASS` | Database Password |
| `REDIS_PASSWORD` | Redis Password |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) |
| `JWT_ACCESS_EXPIRATION` | Access token expiration in ms |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration in ms |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret |
| `BREVO_API_KEY` | Brevo (Sendinblue) API Key |
| `BREVO_FROM_EMAIL` | Sender email address for notifications |
| `GEMINI_API_KEY` | Google Gemini AI API Key |
| `NEWSAPI_KEY` | NewsAPI Key |

Build the application:
```bash
./mvnw clean install
```

Run the backend:
```bash
./mvnw spring-boot:run
```

### 3. Frontend Setup
Navigate to the frontend directory:
```bash
cd ../frontend
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in the `frontend` root:
```env
VITE_API_URL=http://localhost:8080
```

Run the development server:
```bash
npm run dev
```

---

## 🐳 Docker Support

To run the entire stack using Docker Compose:

1. Copy `.env.example` to `.env` (if available) or create one with the required backend variables.
2. Run:
   ```bash
   docker-compose up --build
   ```

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for more detailed Docker instructions.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
