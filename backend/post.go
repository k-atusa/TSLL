// test825b : project USAG FalseCrypt server
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type Post struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Body      string   `json:"body"`
	Files     []string `json:"files"`
	CreatedAt int64    `json:"createdAt"`
}

type StorageStats struct {
	UsedBytes int64 `json:"usedBytes"`
	CapBytes  int64 `json:"capBytes"`
	PostCount int   `json:"postCount"`
	FileCount int   `json:"fileCount"`
}

var mu sync.Mutex // For synchronizing post creations and deletions

// get directory size
func getDirSize(path string) (int64, error) {
	var size int64
	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size, err
}

// enforce directory capacity
func enforceCapacity() {
	size, err := getDirSize(config.PostDir)
	if err != nil {
		log.Printf("Error calculating dir size: %v", err)
		return
	}

	for size > config.PostCap {
		log.Printf("Current size (%d) exceeds capacity (%d). Cleaning up...", size, config.PostCap)
		postsDir := filepath.Join(config.PostDir, "posts")
		files, err := os.ReadDir(postsDir)
		if err != nil || len(files) == 0 {
			break // Nothing to delete or error
		}

		// load posts
		var posts []Post
		for _, f := range files {
			if !strings.HasSuffix(f.Name(), ".json") {
				continue
			}
			postPath := filepath.Join(postsDir, f.Name())
			data, err := os.ReadFile(postPath)
			if err != nil {
				continue
			}
			var p Post
			if err := json.Unmarshal(data, &p); err == nil {
				posts = append(posts, p)
			}
		}
		if len(posts) == 0 {
			break
		}

		// sort ascending by CreatedAt (oldest first)
		sort.Slice(posts, func(i, j int) bool {
			return posts[i].CreatedAt < posts[j].CreatedAt
		})
		oldest := posts[0]
		log.Printf("Deleting oldest post ID: %s", oldest.ID)

		// delete post json, recalculate
		os.Remove(filepath.Join(postsDir, oldest.ID+".json"))
		for _, fname := range oldest.Files {
			os.Remove(filepath.Join(config.PostDir, "files", fname))
		}
		size, err = getDirSize(config.PostDir)
		if err != nil {
			break
		}
	}
}

// get posts
func handleGetPosts(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	// read posts
	postsDir := filepath.Join(config.PostDir, "posts")
	files, err := os.ReadDir(postsDir)
	if err != nil {
		http.Error(w, "Failed to read posts", http.StatusInternalServerError)
		return
	}

	// load posts
	var posts []Post
	for _, f := range files {
		if !strings.HasSuffix(f.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(postsDir, f.Name()))
		if err != nil {
			continue
		}
		var p Post
		if err := json.Unmarshal(data, &p); err == nil {
			posts = append(posts, p)
		}
	}

	// sort descending by CreatedAt (newest first)
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].CreatedAt > posts[j].CreatedAt
	})
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// get post detail
func handleGetPostDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/com/posts/")
	if id == "" || filepath.Base(id) != id {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	// read post json
	postPath := filepath.Join(config.PostDir, "posts", id+".json")
	data, err := os.ReadFile(postPath)
	if err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// create post
func handleCreatePost(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, config.PostCap) // prevent too large file
	if err := r.ParseMultipartForm(64 * 1048576); err != nil {
		http.Error(w, "File too large or parse error", http.StatusBadRequest)
		return
	}

	// validate title
	title := r.FormValue("title")
	body := r.FormValue("body")
	if title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// generate id, create post
	id := fmt.Sprintf("%d", time.Now().UnixNano())
	post := Post{
		ID:        id,
		Title:     title,
		Body:      body,
		CreatedAt: time.Now().UnixNano(),
	}

	// handle files
	files := r.MultipartForm.File["files"]
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			continue
		}
		defer file.Close()

		// get filename, save
		filename := fmt.Sprintf("%s_%s", id, filepath.Base(fileHeader.Filename))
		post.Files = append(post.Files, filename)
		dst, err := os.Create(filepath.Join(config.PostDir, "files", filename))
		if err != nil {
			continue
		}
		defer dst.Close()
		io.Copy(dst, file)
	}

	// write post json
	postData, _ := json.Marshal(post)
	postPath := filepath.Join(config.PostDir, "posts", id+".json")
	os.WriteFile(postPath, postData, 0644)

	// enforce capacity
	mu.Lock()
	enforceCapacity()
	mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// get storage stats
func handleGetStats(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	usedSize, _ := getDirSize(config.PostDir)

	postsDir := filepath.Join(config.PostDir, "posts")
	postFiles, _ := os.ReadDir(postsDir)
	postCount := 0
	for _, f := range postFiles {
		if strings.HasSuffix(f.Name(), ".json") {
			postCount++
		}
	}

	filesDir := filepath.Join(config.PostDir, "files")
	attachedFiles, _ := os.ReadDir(filesDir)
	fileCount := len(attachedFiles)

	stats := StorageStats{
		UsedBytes: usedSize,
		CapBytes:  config.PostCap,
		PostCount: postCount,
		FileCount: fileCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
