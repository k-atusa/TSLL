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
	"runtime/debug"
	"sort"
	"strings"
	"sync"
	"time"
)

type miniPost struct {
	ID        string   `json:"id"`
	CreatedAt int64    `json:"createdAt"`
	Files     []string `json:"files"`
}

// === post data structure ===
type Comment struct {
	ID        string `json:"id"`
	Handle    string `json:"handle"`
	Body      string `json:"body"`
	CreatedAt int64  `json:"createdAt"`
}

type Attachment struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
}

type Post struct {
	ID          string       `json:"id"`
	Handle      string       `json:"handle,omitempty"`
	Title       string       `json:"title"`
	Body        string       `json:"body"`
	Files       []string     `json:"files"`
	Attachments []Attachment `json:"attachments,omitempty"`
	CreatedAt   int64        `json:"createdAt"`
	Likes       int          `json:"likes"`
	Dislikes    int          `json:"dislikes"`
	Comments    []Comment    `json:"comments"`
}

type StorageStats struct {
	UsedBytes int64 `json:"usedBytes"`
	CapBytes  int64 `json:"capBytes"`
	PostCount int   `json:"postCount"`
	FileCount int   `json:"fileCount"`
}

// === ensure directory capacity ===
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

func enforceCapacity() {
	size, err := getDirSize(config.PostDir)
	if err != nil {
		log.Printf("Error calculating dir size: %v", err)
		return
	}

	cleaned := false
	for size > config.PostCap {
		log.Printf("Current size (%d) exceeds capacity (%d). Cleaning up...", size, config.PostCap)
		postsDir := filepath.Join(config.PostDir, "posts")
		files, err := os.ReadDir(postsDir)
		if err != nil || len(files) == 0 {
			break // Nothing to delete or error
		}

		// load lightweight posts
		var posts []miniPost
		for _, f := range files {
			if !strings.HasSuffix(f.Name(), ".json") {
				continue
			}
			postPath := filepath.Join(postsDir, f.Name())
			data, err := os.ReadFile(postPath)
			if err != nil {
				continue
			}
			var p miniPost
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
		cleaned = true
		size, err = getDirSize(config.PostDir)
		if err != nil {
			break
		}
	}
	if cleaned {
		debug.FreeOSMemory()
	}
}

// === control user handles ===
func normalizeHandle(handle string) string {
	handle = strings.TrimSpace(handle)
	if handle == "" {
		return ""
	}
	return strings.Replace(handle, "Anon#", "익명#", 1)
}

func generateAnonHandle(seed int64) string {
	randHex := fmt.Sprintf("%x", seed)
	if len(randHex) > 4 {
		randHex = randHex[len(randHex)-4:]
	}
	return fmt.Sprintf("익명#%s", randHex)
}

var mu sync.RWMutex                    // For synchronizing post creations and deletions
var uploadSem = make(chan struct{}, 8) // Limit concurrent uploads to prevent disk overflow

// get posts
func handleGetPosts(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	defer mu.RUnlock()

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
	r.Body = http.MaxBytesReader(w, r.Body, config.MaxSize) // prevent too large file
	if err := r.ParseMultipartForm(2 * 1048576); err != nil {
		http.Error(w, "File too large or parse error", http.StatusBadRequest)
		return
	}

	// validate title
	title := r.FormValue("title")
	body := r.FormValue("body")
	handle := normalizeHandle(r.FormValue("handle"))
	if title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// limit concurrent disk writes
	uploadSem <- struct{}{}
	defer func() { <-uploadSem }()

	// generate id, create post
	id := fmt.Sprintf("%d", time.Now().UnixNano())
	post := Post{
		ID:        id,
		Handle:    handle,
		Title:     title,
		Body:      body,
		CreatedAt: time.Now().UnixNano(),
	}

	// handle files
	files := r.MultipartForm.File["files"]
	attachmentIDs := r.MultipartForm.Value["attachmentIds"]
	for _, fileHeader := range files {
		attachmentID := fmt.Sprintf("file-%d", len(post.Attachments))
		if len(attachmentIDs) > len(post.Attachments) && strings.TrimSpace(attachmentIDs[len(post.Attachments)]) != "" {
			attachmentID = strings.TrimSpace(attachmentIDs[len(post.Attachments)])
		}

		file, err := fileHeader.Open()
		if err != nil {
			continue
		}
		defer file.Close()

		// get filename, save
		filename := fmt.Sprintf("%s_%s", id, filepath.Base(fileHeader.Filename))
		post.Files = append(post.Files, filename)
		post.Attachments = append(post.Attachments, Attachment{ID: attachmentID, Filename: filename})
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
	mu.RLock()
	defer mu.RUnlock()

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

// handle add comment to post
func handleCreateComment(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	id := strings.TrimPrefix(r.URL.Path, "/api/com/posts/")
	id = strings.TrimSuffix(id, "/comments")
	if id == "" || filepath.Base(id) != id {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	postPath := filepath.Join(config.PostDir, "posts", id+".json")
	data, err := os.ReadFile(postPath)
	if err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	var p Post
	if err := json.Unmarshal(data, &p); err != nil {
		http.Error(w, "Corrupt post data", http.StatusInternalServerError)
		return
	}

	var req struct {
		Body   string `json:"body"`
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Body) == "" {
		http.Error(w, "Comment body is required", http.StatusBadRequest)
		return
	}

	commentID := fmt.Sprintf("%d", time.Now().UnixNano())
	handle := normalizeHandle(req.Handle)
	if handle == "" {
		handle = generateAnonHandle(time.Now().UnixNano())
	}
	comment := Comment{
		ID:        commentID,
		Handle:    handle,
		Body:      strings.TrimSpace(req.Body),
		CreatedAt: time.Now().UnixNano(),
	}

	p.Comments = append(p.Comments, comment)
	updatedData, _ := json.Marshal(p)
	os.WriteFile(postPath, updatedData, 0644)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// handle post like/upvote
func handleLikePost(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	id := strings.TrimPrefix(r.URL.Path, "/api/com/posts/")
	id = strings.TrimSuffix(id, "/like")
	if id == "" || filepath.Base(id) != id {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	postPath := filepath.Join(config.PostDir, "posts", id+".json")
	data, err := os.ReadFile(postPath)
	if err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	var p Post
	if err := json.Unmarshal(data, &p); err != nil {
		http.Error(w, "Corrupt post data", http.StatusInternalServerError)
		return
	}

	p.Likes++
	updatedData, _ := json.Marshal(p)
	os.WriteFile(postPath, updatedData, 0644)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// handle post dislike
func handleDislikePost(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	id := strings.TrimPrefix(r.URL.Path, "/api/com/posts/")
	id = strings.TrimSuffix(id, "/dislike")
	if id == "" || filepath.Base(id) != id {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	postPath := filepath.Join(config.PostDir, "posts", id+".json")
	data, err := os.ReadFile(postPath)
	if err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	var p Post
	if err := json.Unmarshal(data, &p); err != nil {
		http.Error(w, "Corrupt post data", http.StatusInternalServerError)
		return
	}

	p.Dislikes++
	updatedData, _ := json.Marshal(p)
	os.WriteFile(postPath, updatedData, 0644)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}
