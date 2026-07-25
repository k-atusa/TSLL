# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy backend source code
COPY . .

# Build Go executable
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server .

# Final runtime stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates and tzdata
RUN apk add --no-cache ca-certificates tzdata

# Copy built binary and config from builder
COPY --from=builder /app/server /app/server
COPY --from=builder /app/config.json /app/config.json

# Create data directories
RUN mkdir -p /app/data /app/chunks /app/accounts

# Expose HTTP port
EXPOSE 80

CMD ["/app/server"]
