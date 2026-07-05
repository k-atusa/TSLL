# FalseCrypt-server v1.0.0

project USAG: FalseCrypt server

> FalseCrypt-server is simple posting blog and datachunk backend

## Usage

- Anyone can upload post with title, content, cover image and any file.
- When post storage is full, it automatically remove oldest post.
- This server also provide chunk based datastore for FalseCrypt app.

#### Config

| Option | Type | Info | 정보 |
| :-- | :-- | :-- | :-- |
| port | int | HTTP server port | HTTP 서버 포트 |
| postdir | string | post storage path | 게시글 저장폴더 경로 |
| postcap | int | post storage limit | 게시글 저장폴더 한도 |
| maxsize | int | HTTP max body size | HTTP 본문 크기한도 |
| chunkmeta | string | chunk metadata path | 청크 저장소 설정파일 경로 |

#### Chunk Metadata

| Option | Type | Info | 정보 |
| :-- | :-- | :-- | :-- |
| mainpath | string | path to store accounts | 계정파일을 보관할 경로 |
| bfsize | int | stored CID bloomfilter size | 보유한 CID 확인용 블룸필터 크기 |
| paths | string[] | chunk storage paths | 청크 저장폴더 경로들 |
| caps | int[] | chunk storage limits | 청크 저장폴더 한도 |
| weights | float[] | chunk storage preferences | 청크 저장폴더 가중치 |
| wrkey | string | write auth key | 쓰기 권한 키 |

## Build Executable

```bash
go mod init example.com
go mod tidy
go build -ldflags="-s -w" -trimpath -o server main.go post.go store.go
```
