# DirectHub R1

project WHY(Web Hub Yard): Direct Hub

> DirectHub is SFTP and web UI server for storing and streaming files

## Usage

- DirectHub runs multiple SFTP accounts and web access to each folder
- Server manager can add or remove data folder.
- Each folder has own access code, controlling R/RW access.

## Architecture

- Each folder acts as independent stroage with own write key.
- Read key is hash(write key), and username for sftp is crc(key).
- You can share folder via web with url and key.
- Files are stored plaintext in server.

```python
server
config.json
cert.pem
key.pem
data/
  ...
public/
  ...
```

## Build Executable

```bash
go mod init example.com
go mod tidy
go build -ldflags="-s -w" -trimpath server.go
```
