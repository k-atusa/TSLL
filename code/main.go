// test825a : project USAG FalseCrypt server
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

type Config struct {
	Port    int    `json:"port"`
	PostDir string `json:"postdir"`
	PostCap int64  `json:"postcap"`
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
			Port:    80,
			PostDir: "./data",
			PostCap: 104857600,
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

	// ensure directories exist
	os.MkdirAll(filepath.Join(config.PostDir, "posts"), 0755)
	os.MkdirAll(filepath.Join(config.PostDir, "files"), 0755)
}

func main() {
	initEnv()
	fs := http.FileServer(http.Dir("."))
	http.Handle("/", fs)

	// files handler
	filesFs := http.FileServer(http.Dir(filepath.Join(config.PostDir, "files")))
	http.HandleFunc("/api/com/files/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'") // prevent XSS
		w.Header().Set("X-Content-Type-Options", "nosniff")
		http.StripPrefix("/api/com/files/", filesFs).ServeHTTP(w, r)
	})

	// register post handlers
	http.HandleFunc("/api/com/posts", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetPosts(w, r)
		} else if r.Method == http.MethodPost {
			handleCreatePost(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	http.HandleFunc("/api/com/posts/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetPostDetail(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// start server
	log.Printf("Server starting on http://localhost:%d", config.Port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", config.Port), nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
