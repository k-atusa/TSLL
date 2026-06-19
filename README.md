# FalseCrypt-server v1.0.0

project USAG: FalseCrypt server

> FalseCrypt-server is simple posting blog and datachunk backend

## Usage

- Anyone can upload post with title, content, cover image and any file.
- When post storage is full, it automatically remove oldest post.
- This server also provide chunk based datastore for FalseCrypt app.

## Build Executable

```bash
go mod init example.com
go mod tidy
go build -ldflags="-s -w" -trimpath main.go post.go store.go
```
