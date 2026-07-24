// test825a : project USAG FalseCrypt server
package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/k-atusa/USAG-Lib/Bencrypt"
	"github.com/taewook427/USAG-KOX/FalseCrypt"
)

type Config struct {
	// blog server
	Port    int    `json:"port"`
	PostDir string `json:"postdir"`
	PostCap int64  `json:"postcap"`

	// chunk server
	MaxSize   int64  `json:"maxsize"`
	ChunkMeta string `json:"chunkmeta"`
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

			MaxSize:   512 * 1048576,
			ChunkMeta: "./chunkmeta.json",
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
	var meta FalseCrypt.ChunkMeta
	metaBytes, err := os.ReadFile(config.ChunkMeta)
	if os.IsNotExist(err) { // make new if not exists
		meta.MainPath = "./accounts"
		meta.BfSize = 1048576
		meta.Paths = []string{"./chunks"}
		meta.Caps = []int64{1024 * 1048576}
		meta.Weights = []float32{1.0}
		meta.WriteKey = Bencrypt.Random(32)

		metaStr, saveErr := meta.Save()
		if saveErr != nil {
			return nil, fmt.Errorf("failed to serialize chunkmeta: %v", saveErr)
		}
		if writeErr := os.WriteFile(config.ChunkMeta, []byte(metaStr), 0644); writeErr != nil {
			return nil, fmt.Errorf("failed to write chunkmeta: %v", writeErr)
		}
		log.Println("Created chunkmeta:", config.ChunkMeta)
	} else if err != nil {
		return nil, fmt.Errorf("failed to read chunkmeta: %v", err)
	} else {
		if initErr := meta.Init(string(metaBytes)); initErr != nil {
			return nil, fmt.Errorf("failed to initialize chunkmeta: %v", initErr)
		}
	}

	// init chunkbalancer
	var cb FalseCrypt.ChunkBalancer
	cb.Init(&meta)
	var cs ChunkSvr
	cs.Init(meta.WriteKey, &cb)
	return &cs, nil
}

// register chunk server handler
func registerFCs(cs *ChunkSvr) {
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
		r.Body = http.MaxBytesReader(w, r.Body, config.MaxSize)
		r.ParseForm()
		username := r.FormValue("username")
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))
		chksum, _ := hex.DecodeString(r.FormValue("chksum"))

		data, err := io.ReadAll(r.Body)
		defer r.Body.Close()
		if err != nil {
			http.Error(w, "request too large", http.StatusRequestEntityTooLarge)
			return
		}

		err = cs.SetAccount(username, data, chksum, timestamp, auth)
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
		r.Body = http.MaxBytesReader(w, r.Body, config.MaxSize)
		r.ParseForm()
		cid, _ := hex.DecodeString(r.FormValue("cid"))
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))
		chksum, _ := hex.DecodeString(r.FormValue("chksum"))

		data, err := io.ReadAll(r.Body)
		defer r.Body.Close()
		if err != nil {
			http.Error(w, "request too large", http.StatusRequestEntityTooLarge)
			return
		}

		err = cs.WriteChunk(cid, data, chksum, timestamp, auth)
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

	http.HandleFunc("/api/fc/checkchunk", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))

		data, chksum, err := cs.CheckChunk(timestamp, auth)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Chksum", hex.EncodeToString(chksum))
		w.Write(data)
	})

	http.HandleFunc("/api/fc/trimchunk", func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, config.MaxSize)
		r.ParseForm()
		chksum, _ := hex.DecodeString(r.FormValue("chksum"))
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))

		bloom, err := io.ReadAll(r.Body)
		defer r.Body.Close()
		if err != nil {
			http.Error(w, "request too large", http.StatusRequestEntityTooLarge)
			return
		}

		err = cs.TrimChunk(bloom, chksum, timestamp, auth)
		if err != nil {
			httpErr(w, err)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	http.HandleFunc("/api/fc/trimempty", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		timestamp, _ := strconv.ParseInt(r.FormValue("timestamp"), 10, 64)
		auth, _ := hex.DecodeString(r.FormValue("auth"))

		err := cs.TrimEmpty(timestamp, auth)
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

	// HTTP files handler
	filesFs := http.FileServer(http.Dir(filepath.Join(config.PostDir, "files")))
	http.HandleFunc("/api/com/files/", func(w http.ResponseWriter, r *http.Request) {
		if enableCORS(w, r) {
			return
		}
		w.Header().Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'") // prevent XSS
		w.Header().Set("X-Content-Type-Options", "nosniff")
		http.StripPrefix("/api/com/files/", filesFs).ServeHTTP(w, r)
	})

	// register posting handlers
	http.HandleFunc("/api/com/posts", func(w http.ResponseWriter, r *http.Request) {
		if enableCORS(w, r) {
			return
		}
		if r.Method == http.MethodGet {
			handleGetPosts(w, r)
		} else if r.Method == http.MethodPost {
			handleCreatePost(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	http.HandleFunc("/api/com/posts/", func(w http.ResponseWriter, r *http.Request) {
		if enableCORS(w, r) {
			return
		}
		if strings.HasSuffix(r.URL.Path, "/like") && r.Method == http.MethodPost {
			handleLikePost(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/dislike") && r.Method == http.MethodPost {
			handleDislikePost(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/comments") && r.Method == http.MethodPost {
			handleCreateComment(w, r)
		} else if r.Method == http.MethodGet {
			handleGetPostDetail(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	http.HandleFunc("/api/com/stats", func(w http.ResponseWriter, r *http.Request) {
		if enableCORS(w, r) {
			return
		}
		if r.Method == http.MethodGet {
			handleGetStats(w, r)
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
