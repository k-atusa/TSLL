# FalseCrypt-server

## 📋 Overview

> project USAG: FalseCrypt server v2.2.0

**FalseCrypt-server** is an all-in-one backend and frontend solution providing a **Community Posting Blog**, a **Chunk-based Datastore Backend for the FalseCrypt**, and an intuitive **Next.js Web Interface** with support for **Standalone Single-Binary Deployment**.

### 🌟 Key Features

1. **Posting Blog & Community System**
   - Create posts with title, content, cover images, and arbitrary file attachments.
   - Post listing, detail view, comment creation, and reaction features (like/dislike).
   - **Auto-pruning Storage Management**: Automatically deletes the oldest posts and associated files (images/attachments) when the total storage usage reaches the configured cap (`PostCap`) to maintain disk usage within specified limits.

2. **FalseCrypt Datachunk Backend**
   - Account profile data storage and authentication verification.
   - CID based block read, write, delete, and integrity verification (Checksum & Auth).
   - BloomFilter support for checking chunk existence and pruning (`trimchunk`, `trimempty`).

3. **Modern Next.js Web UI & Standalone Export**
   - Built with Next.js 16, React 19, TypeScript, and Tailwind CSS.
   - **Next.js Static Export (`output: "export"`)**: Compiles the entire Next.js frontend into static HTML/CSS/JS assets (`frontend/out`).
   - **Go Embedded Server**: The Go backend embeds `out/` via `go:embed` and serves both the web interface and API from a single lightweight executable binary—no Docker or Node.js runtime required at production runtime!

---

## 🛠 Tech Stack

- **Backend**: [Go (Golang)](https://go.dev/), `go:embed`, HTTP Standard Library, `USAG-Lib/Bencrypt`, `USAG-KOX/FalseCrypt`
- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), React 19, TypeScript, Tailwind CSS, Lucide React

---

## 📁 Project Structure

```text
FalseCrypt-server/
├── backend/                  # Go backend server (embeds frontend static export)
│   ├── main.go               # HTTP server, API routing, embedded static file server
│   ├── post.go               # Post management, comments, storage cap auto-pruning
│   ├── store.go              # FalseCrypt chunk store integration
│   ├── out/                  # Next.js static export build (embedded via go:embed)
│   ├── config.json           # Backend server configuration file
│   ├── chunkmeta.json        # Chunk store metadata configuration file
│   └── fcimeta.json          # Community metadata configuration file
├── frontend/                 # Next.js web frontend
│   ├── app/                  # App Router pages & layout
│   ├── components/           # React UI components
│   ├── next.config.ts        # Next.js config (configured with output: "export")
│   └── package.json
├── LICENSE.txt               # GPL-3.0 License
└── README.md                 # Project documentation
```

---

## 🚀 Build & Deployment Guide

### Option 1. Download Pre-built Binary (All-in-One Standalone Execution)

Download the pre-built `fcinside` binary matching your Operating System and CPU architecture from [GitHub Releases](https://github.com/k-atusa/FalseCrypt-server/releases) to run the entire application (Web Interface + Backend API) out-of-the-box without needing Node.js, Go, or build steps.

| Platform | Architecture | Binary Name |
| :--- | :--- | :--- |
| **Linux** | `amd64` (x86_64) | `fcinside-linux-amd64` |
| **Linux** | `arm64` (ARM64 / Raspberry Pi) | `fcinside-linux-arm64` |
| **macOS** | `arm64` (Apple Silicon M1/M2/M3/M4) | `fcinside-darwin-arm64` |
| **macOS** | `amd64` (Intel) | `fcinside-darwin-amd64` |
| **Windows** | `amd64` (x86_64) | `fcinside-windows-amd64.exe` |
| **Windows** | `arm64` (ARM64) | `fcinside-windows-arm64.exe` |

#### Run Server Example (Linux / macOS):
```bash
chmod +x fcinside-linux-amd64
./fcinside-linux-amd64
```

> **All-in-One Single Execution**: Web UI and backend API run instantly on [http://localhost:4000](http://localhost:4000).

---

### Option 2. Manual Standalone Build

To compile the `fcinside` executable manually from source:

```bash
# 1. Export Next.js frontend & sync to backend
cd frontend
npm install
npm run build     # Generates frontend/out and syncs backend/out

# 2. Build standalone Go backend binary
cd ../backend
go build -ldflags="-s -w" -trimpath -o fcinside .

# 3. Run single server binary
./fcinside
```

Access the application directly in your browser:
- **Web UI & API**: [http://localhost:4000](http://localhost:4000)

---

### Option 2. Development Setup

#### 1) Run Backend (Go)
```bash
cd backend
go run .
```

#### 2) Run Frontend (Next.js Dev Server)
```bash
cd frontend
npm run dev
```
> `config.json`, `chunkmeta.json`, and `fcimeta.json` will be automatically generated with default values if not present.

---

## ⚙️ Configuration Guide

### 1. Backend Configuration (`config.json`)

| Option | Type | Default | Info |
| :--- | :--- | :--- | :--- |
| `port` | `int` | `4000` | HTTP server port |
| `maxsize` | `int` (bytes) | `536870912` (512MB) | Maximum HTTP body size limit for file uploads |
| `chunkmeta` | `string` | `"./chunkmeta.json"` | Chunk metadata config file path |
| `fcimeta` | `string` | `"./fcimeta.json"` | Community metadata config file path |

### 2. Chunk Metadata Configuration (`chunkmeta.json`)

| Option | Type | Info |
| :--- | :--- | :--- |
| `mainpath` | `string` | Path to store account profile files |
| `bfsize` | `int` | Stored CID BloomFilter size |
| `paths` | `string[]` | Chunk storage directory paths |
| `caps` | `int[]` | Chunk storage directory capacity limits |
| `weights` | `float[]` | Chunk storage preference weights |
| `wrkey` | `string` | Write/delete request authorization key |

### 3. Community Configuration (`fcimeta.json`)

| Option | Type | Default | Info |
| :--- | :--- | :--- | :--- |
| `postDir` | `string` | `"./fcidata/posts"` | Directory where post files are stored per gallery |
| `filesDir` | `string` | `"./fcidata/files"` | Directory where uploaded attachments are stored |
| `postCap` | `int` (bytes) | `104857600` (100MB) | Storage capacity limit for posts and files (auto-prunes when exceeded) |
| `hotMin` | `int` | `15` | Minimum likes required to appear in the 'hot' (실시간 베스트) gallery |
| `galleries` | `array` | (2 defaults) | List of galleries to serve (ID, Name, ShortName, Icon) |
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
