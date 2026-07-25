# FalseCrypt-server

project USAG: FalseCrypt server

> FalseCrypt-server is simple posting blog and datachunk backend

---

## 📋 Overview

**FalseCrypt-server** is an all-in-one backend and frontend solution providing a **Community Posting Blog**, a **Chunk-based Datastore Backend for the FalseCrypt application**, and an intuitive **Next.js Web Interface**.

### 🌟 Key Features

1. **Posting Blog & Community System**
   - Create posts with title, content, cover images, and arbitrary file attachments.
   - Post listing, detail view, comment creation, and reaction features (like/dislike).
   - **Auto-pruning Storage Management**: Automatically deletes the oldest posts and associated files (images/attachments) when the total storage usage reaches the configured cap (`PostCap`) to maintain disk usage within specified limits.

2. **FalseCrypt Datachunk Backend**
   - Account profile data storage and authentication verification.
   - CID (Content ID)-based chunk block read, write, delete, and integrity verification (Checksum & Auth).
   - BloomFilter support for checking chunk existence and pruning (`trimchunk`, `trimempty`).

3. **Modern Web UI**
   - Built with Next.js 16, React 19, TypeScript, and Tailwind CSS for a sleek community experience.
   - Real-time storage capacity gauge and media previews.

4. **Docker & Docker Compose Integration**
   - Easily build and run both the Go backend and Next.js frontend with single container orchestration commands.

---

## 🛠 Tech Stack

- **Backend**: [Go (Golang)](https://go.dev/), HTTP Standard Library, `USAG-Lib/Bencrypt`, `USAG-KOX/FalseCrypt`
- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), React 19, TypeScript, Tailwind CSS, Lucide React
- **Deployment**: Docker, Docker Compose

---

## 📁 Project Structure

```text
FalseCrypt-server/
├── backend/                  # Go backend server
│   ├── main.go               # HTTP server, routing, config loading
│   ├── post.go               # Post management, comments, storage cap auto-pruning
│   ├── store.go              # FalseCrypt chunk store integration
│   ├── config.json           # Backend server configuration file
│   ├── chunkmeta.json        # Chunk store metadata configuration file
│   └── Dockerfile            # Backend Dockerfile
├── frontend/                 # Next.js web frontend
│   ├── app/                  # App Router main pages & layout
│   ├── components/           # UI components (PostModal, DetailModal, etc.)
│   ├── lib/                  # Backend API client utilities
│   └── Dockerfile            # Frontend Dockerfile
├── docker-compose.yml        # Multi-container orchestration
├── LICENSE.txt               # GPL-3.0 License
└── README.md                 # Project documentation
```

---

## 🚀 Installation & Getting Started

### Option 1. Using Docker Compose (Recommended)

The quickest way to run the complete service stack:

```bash
# 1. Clone the repository
git clone https://github.com/k-atusa/FalseCrypt-server.git
cd FalseCrypt-server

# 2. Build and start services with Docker Compose
docker compose up -d --build
```

Access the services via browser:
- **Web Frontend UI**: [http://localhost:5000](http://localhost:5000)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

Stop containers:
```bash
docker compose down
```

---

### Option 2. Local Manual Setup (Development)

#### 1) Run Backend (Go)

**Prerequisites**: Go 1.22+ installed

```bash
cd backend

# Tidy dependencies
go mod tidy

# Build backend server executable
go build -ldflags="-s -w" -trimpath -o server main.go post.go store.go

# Run server
./server
```
> `config.json` and `chunkmeta.json` will be automatically generated with default values if not present.

#### 2) Run Frontend (Next.js)

**Prerequisites**: Node.js 18+ and npm installed

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Configuration Guide

### 1. Backend Configuration (`config.json`)

| Option | Type | Default | Info |
| :--- | :--- | :--- | :--- |
| `port` | `int` | `80` | HTTP server port |
| `postdir` | `string` | `"./data"` | Post storage path (posts & attachments) |
| `postcap` | `int` (bytes) | `104857600` (100MB) | Post storage capacity limit (auto-prunes when exceeded) |
| `maxsize` | `int` (bytes) | `536870912` (512MB) | Maximum HTTP body size limit for file uploads |
| `chunkmeta` | `string` | `"./chunkmeta.json"` | Chunk metadata config file path |

### 2. Chunk Metadata Configuration (`chunkmeta.json`)

| Option | Type | Info |
| :--- | :--- | :--- |
| `mainpath` | `string` | Path to store account profile files |
| `bfsize` | `int` | Stored CID BloomFilter size |
| `paths` | `string[]` | Chunk storage directory paths |
| `caps` | `int[]` | Chunk storage directory capacity limits |
| `weights` | `float[]` | Chunk storage preference weights |
| `wrkey` | `string` | Write/delete request authorization key |

### 3. Environment Variables

You can override default settings via environment variables in `docker-compose.yml` or runtime environment:

- `PORT`: HTTP server port (e.g. `80`, `8080`)
- `POST_CAP`: Total post storage cap (e.g. `100MB`, `1GB`, `500M`)
- `CHUNK_CAP`: Total chunk store storage cap (e.g. `1GB`, `10GB`)
- `MAX_SIZE`: Maximum request upload body size (e.g. `512MB`, `1GB`)
- `BACKEND_URL`: Backend API URL referenced by frontend (e.g. `http://backend:80`)

---

## 📡 API Endpoints Overview

### 💬 Community API (`/api/com/`)

- `GET /api/com/posts` — Fetch post list
- `POST /api/com/posts` — Create a new post (Multipart/form-data: `title`, `content`, `cover` image, `file` attachment)
- `GET /api/com/posts/{id}` — Fetch post detail
- `POST /api/com/posts/{id}/like` — Like a post
- `POST /api/com/posts/{id}/dislike` — Dislike a post
- `POST /api/com/posts/{id}/comments` — Add a comment to a post
- `GET /api/com/stats` — Retrieve storage usage statistics
- `GET /api/com/files/{filename}` — Serve uploaded cover images and attachments

### 🔐 FalseCrypt Chunk API (`/api/fc/`)

- `GET /api/fc/getaccount` / `POST /api/fc/setaccount` — Retrieve and update account profile data
- `GET /api/fc/readchunk` / `POST /api/fc/writechunk` — Read and write CID-based data chunks
- `POST /api/fc/delchunk` — Delete a chunk by CID
- `GET /api/fc/getlog` — Fetch system action logs
- `POST /api/fc/checkchunk` / `POST /api/fc/trimchunk` / `POST /api/fc/trimempty` — Chunk sync, validation, and maintenance

---

## 📜 License

This project is licensed under the [GNU General Public License v3.0](LICENSE.txt).
