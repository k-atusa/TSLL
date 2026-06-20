// test825a : project USAG FalseCrypt server
package main

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/taewook427/USAG-KOX/FalseCrypt"
)

type Config struct {
	// blog server
	Port    int    `json:"port"`
	PostDir string `json:"postdir"`
	PostCap int64  `json:"postcap"`

	// chunk server
	ChunkKey    []byte    `json:"chkkey"`
	ChunkMain   string    `json:"chkmain"`
	ChunkDir    []string  `json:"chkdir"`
	ChunkSize   []int64   `json:"chksize"`
	ChunkWeight []float32 `json:"chkweight"`
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

			ChunkKey:    []byte(""),
			ChunkMain:   "./accounts",
			ChunkDir:    []string{"./chunks"},
			ChunkSize:   []int64{102400},
			ChunkWeight: []float32{1.0},
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

// init chunk server
func initCS() (*ChunkSvr, error) {
	if len(config.ChunkDir) == 0 || len(config.ChunkDir) != len(config.ChunkSize) || len(config.ChunkSize) != len(config.ChunkWeight) {
		return nil, errors.New("invalid chunk server config")
	}
	cus := make([]FalseCrypt.ChunkUnit, len(config.ChunkDir))
	for i := range config.ChunkDir {
		cus[i].Init(config.ChunkDir[i], config.ChunkSize[i], config.ChunkWeight[i])
	}
	var cb FalseCrypt.ChunkBalancer
	cb.Init(config.ChunkMain, cus)
	var cs ChunkSvr
	cs.Init(config.ChunkKey, &cb)
	return &cs, nil
}

// register chunk server handler
func registerFCs(cs *ChunkSvr) {
	http.HandleFunc("/api/fc/getlog", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))

		logStr, err := cs.GetLog(timestamp, auth)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.Write([]byte(logStr))
	})

	http.HandleFunc("/api/fc/getaccount", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		username := r.FormValue("username")

		data, err := cs.GetAccount(username)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.Write(data)
	})

	http.HandleFunc("/api/fc/setaccount", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		username := r.FormValue("username")
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))
		chksum, _ := hex.DecodeString(r.FormValue("chksum"))

		data, _ := io.ReadAll(r.Body)
		defer r.Body.Close()

		err := cs.SetAccount(username, data, chksum, timestamp, auth)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/fc/readchunk", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		cid, _ := hex.DecodeString(r.FormValue("cid"))

		data, err := cs.ReadChunk(cid)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.Write(data)
	})

	http.HandleFunc("/api/fc/writechunk", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		cid, _ := hex.DecodeString(r.FormValue("cid"))
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))
		chksum, _ := hex.DecodeString(r.FormValue("chksum"))

		data, _ := io.ReadAll(r.Body)
		defer r.Body.Close()

		err := cs.WriteChunk(cid, data, chksum, timestamp, auth)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/fc/delchunk", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		cid, _ := hex.DecodeString(r.FormValue("cid"))
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))

		err := cs.DelChunk(cid, timestamp, auth)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/fc/checkchunk", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		chksum, _ := hex.DecodeString(r.FormValue("chksum"))
		chkHash := r.FormValue("chkHash") == "true"
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))

		cids, _ := io.ReadAll(r.Body)
		defer r.Body.Close()

		err := cs.CheckChunk(cids, chksum, chkHash, timestamp, auth)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/fc/trimchunk", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		rmEmpty := r.FormValue("rmEmpty") == "true"
		chksum, _ := hex.DecodeString(r.FormValue("chksum"))
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))

		bloom, _ := io.ReadAll(r.Body)
		defer r.Body.Close()

		err := cs.TrimChunk(rmEmpty, bloom, chksum, timestamp, auth)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
}

// read error, make http code
func httpErr(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}
	switch err.Error() {
	case "unauthorized":
		http.Error(w, err.Error(), http.StatusUnauthorized)
	case "invalid checksum":
		http.Error(w, err.Error(), http.StatusBadRequest)
	case "invalid CIDs length":
		http.Error(w, err.Error(), http.StatusBadRequest)
	case "invalid filter length":
		http.Error(w, err.Error(), http.StatusBadRequest)
	default:
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func main() {
	defer func() {
		if e := recover(); e != nil {
			os.WriteFile("./panic-log.txt", []byte(fmt.Sprintf("%v", e)), 0644)
		}
	}()

	initEnv()
	allowedFiles := map[string]bool{
		"/":            true,
		"/index.html":  true,
		"/app.js":      true,
		"/favicon.png": true,
	} // whitelist of files to serve

	// HTTP frontend handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Clean(r.URL.Path)
		path = filepath.ToSlash(path)
		if !allowedFiles[path] {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		if path == "/" {
			http.ServeFile(w, r, "./index.html")
		} else {
			http.ServeFile(w, r, filepath.Join(".", path))
		}
	})

	// HTTP files handler
	filesFs := http.FileServer(http.Dir(filepath.Join(config.PostDir, "files")))
	http.HandleFunc("/api/com/files/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'") // prevent XSS
		w.Header().Set("X-Content-Type-Options", "nosniff")
		http.StripPrefix("/api/com/files/", filesFs).ServeHTTP(w, r)
	})

	// register posting handlers
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

	// register chunk handlers
	cs, err := initCS()
	if err == nil {
		registerFCs(cs)
	} else {
		log.Fatalf("Failed to init chunk server: %v", err)
	}

	// start server
	log.Printf("Server starting on http://localhost:%d", config.Port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", config.Port), nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
