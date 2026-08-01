// test825a : project USAG FalseCrypt server
package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

//go:embed all:out
var outFS embed.FS

type Config struct {
	// http port
	Port int `json:"port"`

	// chunk server
	MaxSize   int64  `json:"maxsize"`
	ChunkMeta string `json:"chunkmeta"`

	// community server
	FCIMeta string `json:"fcimeta"`
}

var config Config

// init environment
func initEnv() {
	// move to executable path
	exePath, _ := os.Executable()
	realPath, _ := filepath.EvalSymlinks(exePath)
	os.Chdir(filepath.Dir(realPath))

	// load config
	file, err := os.Open("config.json")
	if os.IsNotExist(err) {
		config = Config{
			Port:      4000,
			MaxSize:   512 * 1048576,
			ChunkMeta: "./chunkmeta.json",
			FCIMeta:   "./fcimeta.json",
		}
		data, _ := json.MarshalIndent(config, "", "  ")
		if err := os.WriteFile("config.json", data, 0644); err != nil {
			log.Fatalf("Failed to create config: %v", err)
		}
		log.Println("Created default config")
	} else if err != nil {
		log.Fatalf("Failed to open config: %v", err)
	} else {
		defer file.Close()
		if err := json.NewDecoder(file).Decode(&config); err != nil {
			log.Fatalf("Failed to decode config: %v", err)
		}
	}
}

// register Next.js exported static frontend
func registerStatic() {
	subFS, err := fs.Sub(outFS, "out")
	if err != nil {
		log.Fatalf("Failed to load embedded frontend assets: %v", err)
	}
	staticServer := http.FileServer(http.FS(subFS))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		reqPath := strings.TrimPrefix(r.URL.Path, "/")
		if reqPath == "" {
			reqPath = "index.html"
		}

		// Direct file check
		if f, err := subFS.Open(reqPath); err == nil {
			f.Close()
			staticServer.ServeHTTP(w, r)
			return
		}

		// Check reqPath + ".html" (e.g. /posts/new -> posts/new.html)
		if fHtml, err := subFS.Open(reqPath + ".html"); err == nil {
			fHtml.Close()
			r.URL.Path = r.URL.Path + ".html"
			staticServer.ServeHTTP(w, r)
			return
		}

		// Fallback for Next.js App Router dynamic post detail route (/posts/[id])
		if strings.HasPrefix(reqPath, "posts/") && !strings.HasPrefix(reqPath, "posts/new") {
			if strings.HasSuffix(reqPath, ".txt") {
				if fTxt, err := subFS.Open("posts/preview.txt"); err == nil {
					defer fTxt.Close()
					w.Header().Set("Content-Type", "text/plain; charset=utf-8")
					io.Copy(w, fTxt)
					return
				}
			}
			if fDetail, err := subFS.Open("posts/preview.html"); err == nil {
				defer fDetail.Close()
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				io.Copy(w, fDetail)
				return
			}
		}

		// Fallback to index.html
		if indexFile, err := subFS.Open("index.html"); err == nil {
			defer indexFile.Close()
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			io.Copy(w, indexFile)
			return
		}
		http.NotFound(w, r)
	})
}

func main() {
	defer func() {
		if e := recover(); e != nil {
			os.WriteFile("./panic-log.txt", []byte(fmt.Sprintf("%v", e)), 0644)
		}
	}()

	// initialize env, set CORS
	initEnv()
	enableCORS := func(w http.ResponseWriter, r *http.Request) bool {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Chksum")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return true
		}
		return false
	}

	// init FCInside, register /api/com/* handlers
	log.Println("initializing FCInside...")
	initFCI()
	registerFCom(enableCORS)

	// init FalseCrypt, register /api/fc/* handlers
	log.Println("initializing FalseCrypt...")
	cs, err := initCS()
	if err == nil {
		registerFCs(cs)
	} else {
		log.Fatalf("Failed to init chunk server: %v", err)
	}

	// register Next.js static frontend
	registerStatic()

	// start server
	log.Printf("Server starting on http://localhost:%d", config.Port)
	srv := &http.Server{
		Addr:           fmt.Sprintf(":%d", config.Port),
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
