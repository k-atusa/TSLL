// test825b : project USAG FalseCrypt server - community (FCInside) logic
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
	"strconv"
	"strings"
	"sync"
	"time"
)

// ============================================================
// Data Structures & Models
// ============================================================

// GalleryDef defines a single gallery served by FCInside.
type GalleryDef struct {
	ID        string `json:"id"`        // URL-safe identifier, e.g. "announcement"
	Name      string `json:"name"`      // Display name, e.g. "공지사항 갤러리"
	ShortName string `json:"shortName"` // Abbreviation shown in sidebar, e.g. "공지"
	Icon      string `json:"icon"`      // Emoji icon
}

// FCIMeta is the on-disk configuration structure for fcimeta.json.
type FCIMeta struct {
	PostDir   string       `json:"postDir"`   // root dir; each gallery stored under PostDir/<id>/
	FilesDir  string       `json:"filesDir"`  // uploaded files directory
	PostCap   int64        `json:"postCap"`   // total byte cap for PostDir + FilesDir
	HotMin    int          `json:"hotMin"`    // minimum likes to appear in 실베 (default: 10)
	Galleries []GalleryDef `json:"galleries"` // list of served galleries
}

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
	Gallery     string       `json:"gallery"`
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

// miniPost is a lightweight struct used only during capacity enforcement.
type miniPost struct {
	ID        string   `json:"id"`
	Gallery   string   `json:"gallery"`
	CreatedAt int64    `json:"createdAt"`
	Files     []string `json:"files"`
}

type StorageStats struct {
	UsedBytes int64 `json:"usedBytes"`
	CapBytes  int64 `json:"capBytes"`
	PostCount int   `json:"postCount"`
	FileCount int   `json:"fileCount"`
}

// ============================================================
// Globals & Constants
// ============================================================

var fciMeta FCIMeta
var mu sync.RWMutex
var uploadSem = make(chan struct{}, 8)

const pageSize = 100

var imageExtensions = map[string]bool{
	".png": true, ".webp": true, ".jpg": true, ".jpeg": true,
	".gif": true, ".avif": true, ".bmp": true,
}

// ============================================================
// Initialization & Route Registration
// ============================================================

func defaultFCIMeta() FCIMeta {
	return FCIMeta{
		PostDir:  "./fcidata/posts",
		FilesDir: "./fcidata/files",
		PostCap:  104857600, // 100 MB
		HotMin:   15,
		Galleries: []GalleryDef{
			{ID: "announcement", Name: "공지사항 갤러리", ShortName: "공지", Icon: "📢"},
			{ID: "development", Name: "개발 갤러리", ShortName: "개발", Icon: "💻"},
		},
	}
}

// initFCI loads or creates fcimeta.json and ensures all gallery directories exist.
func initFCI() {
	metaPath := config.FCIMeta
	if metaPath == "" {
		metaPath = "./fcimeta.json"
		config.FCIMeta = metaPath
	}

	data, err := os.ReadFile(metaPath)
	if os.IsNotExist(err) {
		fciMeta = defaultFCIMeta()
		out, err := json.MarshalIndent(fciMeta, "", "  ")
		if err != nil {
			log.Fatalf("FCInside: failed to marshal default fcimeta: %v", err)
		}
		if dir := filepath.Dir(metaPath); dir != "." && dir != "" {
			if mkdirErr := os.MkdirAll(dir, 0755); mkdirErr != nil {
				log.Fatalf("FCInside: failed to create directory for fcimeta '%s': %v", dir, mkdirErr)
			}
		}
		if writeErr := os.WriteFile(metaPath, out, 0644); writeErr != nil {
			log.Fatalf("FCInside: failed to write fcimeta.json: %v", writeErr)
		}
		log.Println("Created default fcimeta:", metaPath)
	} else if err != nil {
		log.Fatalf("FCInside: failed to read fcimeta.json: %v", err)
	} else {
		if decErr := json.Unmarshal(data, &fciMeta); decErr != nil {
			log.Fatalf("FCInside: failed to decode fcimeta.json: %v", decErr)
		}
		if fciMeta.HotMin == 0 {
			fciMeta.HotMin = 10 // back-compat: default if missing from existing fcimeta.json
		}
	}

	// Ensure files directory exists
	if err := os.MkdirAll(fciMeta.FilesDir, 0755); err != nil {
		log.Fatalf("FCInside: failed to create files dir: %v", err)
	}
	// Ensure per-gallery post subdirectories exist
	for _, g := range fciMeta.Galleries {
		dir := filepath.Join(fciMeta.PostDir, g.ID)
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("FCInside: failed to create gallery dir '%s': %v", g.ID, err)
		}
	}
}

// registerFCom registers all /api/com/* HTTP handlers.
// enableCORS is the shared CORS middleware provided by main.
func registerFCom(enableCORS func(http.ResponseWriter, *http.Request) bool) {
	// static file server for uploaded files
	filesFs := http.FileServer(http.Dir(fciMeta.FilesDir))
	http.HandleFunc("/api/com/files/", func(w http.ResponseWriter, r *http.Request) {
		if enableCORS(w, r) {
			return
		}
		w.Header().Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		http.StripPrefix("/api/com/files/", filesFs).ServeHTTP(w, r)
	})

	http.HandleFunc("/api/com/galleries", func(w http.ResponseWriter, r *http.Request) {
		if enableCORS(w, r) {
			return
		}
		if r.Method == http.MethodGet {
			handleGetGalleries(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

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
		switch {
		case strings.HasSuffix(r.URL.Path, "/like") && r.Method == http.MethodPost:
			handleLikePost(w, r)
		case strings.HasSuffix(r.URL.Path, "/dislike") && r.Method == http.MethodPost:
			handleDislikePost(w, r)
		case strings.HasSuffix(r.URL.Path, "/comments") && r.Method == http.MethodPost:
			handleCreateComment(w, r)
		case r.Method == http.MethodGet:
			handleGetPostDetail(w, r)
		default:
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
}

// ============================================================
// Sanitization & String Utilities
// ============================================================

func sanitizeString(s string) string {
	return strings.ToValidUTF8(s, "")
}

func sanitizeAttachmentID(id string) string {
	id = sanitizeString(id)
	id = strings.TrimSpace(id)
	if id == "" {
		return "file-0"
	}
	var b strings.Builder
	b.Grow(len(id))
	for _, r := range id {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	res := strings.Trim(b.String(), "-")
	if res == "" {
		return "file-0"
	}
	return res
}

func sanitizeFilename(filename string) string {
	filename = sanitizeString(filename)
	filename = filepath.Base(filename)
	filename = strings.ReplaceAll(filename, "..", "")
	filename = strings.ReplaceAll(filename, "/", "_")
	filename = strings.ReplaceAll(filename, "\\", "_")
	filename = strings.TrimSpace(filename)
	if filename == "" || filename == "." {
		return "unnamed_file"
	}
	return filename
}

func normalizeHandle(handle string) string {
	handle = sanitizeString(handle)
	handle = strings.TrimSpace(handle)
	if handle == "" {
		return ""
	}
	return strings.Replace(handle, "Anon#", "익명#", 1)
}

func generateAnonHandle(seed int64) string {
	h := fmt.Sprintf("%x", seed)
	if len(h) > 4 {
		h = h[len(h)-4:]
	}
	return fmt.Sprintf("익명#%s", h)
}

func isImageExt(filename string) bool {
	return imageExtensions[strings.ToLower(filepath.Ext(filename))]
}

// ============================================================
// Storage & Disk Helpers
// ============================================================

// galleryPostDir returns the posts directory for the given gallery ID.
func galleryPostDir(galleryID string) string {
	return filepath.Join(fciMeta.PostDir, galleryID)
}

// galleryIDSet returns a set of valid gallery IDs for fast lookup.
func galleryIDSet() map[string]struct{} {
	m := make(map[string]struct{}, len(fciMeta.Galleries))
	for _, g := range fciMeta.Galleries {
		m[g.ID] = struct{}{}
	}
	return m
}

// findPostPath scans all gallery directories for a post with the given ID.
// Returns the full path and gallery ID, or empty strings if not found.
func findPostPath(id string) (path string, gallery string) {
	for _, g := range fciMeta.Galleries {
		p := filepath.Join(galleryPostDir(g.ID), id+".json")
		if _, err := os.Stat(p); err == nil {
			return p, g.ID
		}
	}
	return "", ""
}

// loadPost reads and unmarshals a post JSON file.
func loadPost(path string) (Post, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Post{}, err
	}
	var p Post
	if err := json.Unmarshal(data, &p); err != nil {
		return Post{}, err
	}
	return p, nil
}

// savePost marshals and writes a post to its file.
func savePost(path string, p Post) error {
	data, err := json.Marshal(p)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func getDirSize(path string) int64 {
	var size int64
	filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size
}

// enforceCapacity deletes the oldest post(s) until total disk usage is within cap.
// Must be called with mu.Lock() held.
func enforceCapacity() {
	// Compute initial total size
	totalSize := int64(0)
	for _, g := range fciMeta.Galleries {
		totalSize += getDirSize(galleryPostDir(g.ID))
	}
	totalSize += getDirSize(fciMeta.FilesDir)

	if totalSize <= fciMeta.PostCap {
		return
	}

	// Collect all posts (lightweight) sorted oldest-first
	var all []miniPost
	for _, g := range fciMeta.Galleries {
		dir := galleryPostDir(g.ID)
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, f := range entries {
			if !strings.HasSuffix(f.Name(), ".json") {
				continue
			}
			data, err := os.ReadFile(filepath.Join(dir, f.Name()))
			if err != nil {
				continue
			}
			var mp miniPost
			if json.Unmarshal(data, &mp) == nil {
				mp.Gallery = g.ID
				all = append(all, mp)
			}
		}
	}
	sort.Slice(all, func(i, j int) bool { return all[i].CreatedAt < all[j].CreatedAt })

	freed := false
	for totalSize > fciMeta.PostCap && len(all) > 0 {
		oldest := all[0]
		all = all[1:]
		log.Printf("enforceCapacity: deleting post %s (gallery: %s)", oldest.ID, oldest.Gallery)

		postPath := filepath.Join(galleryPostDir(oldest.Gallery), oldest.ID+".json")

		// Subtract file sizes before deleting
		if info, err := os.Stat(postPath); err == nil {
			totalSize -= info.Size()
		}
		os.Remove(postPath)

		for _, fname := range oldest.Files {
			fp := filepath.Join(fciMeta.FilesDir, fname)
			if info, err := os.Stat(fp); err == nil {
				totalSize -= info.Size()
			}
			os.Remove(fp)
		}
		freed = true
	}

	if freed {
		debug.FreeOSMemory()
	}
}

// ============================================================
// HTTP Handlers
// ============================================================

// GET /api/com/galleries
func handleGetGalleries(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fciMeta.Galleries)
}

// GET /api/com/stats
func handleGetStats(w http.ResponseWriter, _ *http.Request) {
	mu.RLock()
	defer mu.RUnlock()

	totalSize := int64(0)
	postCount := 0
	for _, g := range fciMeta.Galleries {
		dir := galleryPostDir(g.ID)
		totalSize += getDirSize(dir)
		entries, _ := os.ReadDir(dir)
		for _, f := range entries {
			if strings.HasSuffix(f.Name(), ".json") {
				postCount++
			}
		}
	}
	totalSize += getDirSize(fciMeta.FilesDir)
	filesDir, _ := os.ReadDir(fciMeta.FilesDir)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(StorageStats{
		UsedBytes: totalSize,
		CapBytes:  fciMeta.PostCap,
		PostCount: postCount,
		FileCount: len(filesDir),
	})
}

// GET /api/com/posts?gallery=<id|all|hot>&page=<n>
func handleGetPosts(w http.ResponseWriter, r *http.Request) {
	mu.RLock()
	defer mu.RUnlock()

	galleryParam := strings.TrimSpace(r.URL.Query().Get("gallery"))
	if galleryParam == "" {
		galleryParam = "all"
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	// Determine which gallery directories to scan
	var dirs []string
	switch galleryParam {
	case "all", "hot":
		for _, g := range fciMeta.Galleries {
			dirs = append(dirs, g.ID)
		}
	default:
		if _, ok := galleryIDSet()[galleryParam]; !ok {
			http.Error(w, "Unknown gallery", http.StatusBadRequest)
			return
		}
		dirs = []string{galleryParam}
	}

	// Load posts from disk
	var posts []Post
	for _, gid := range dirs {
		entries, err := os.ReadDir(galleryPostDir(gid))
		if err != nil {
			continue
		}
		for _, f := range entries {
			if !strings.HasSuffix(f.Name(), ".json") {
				continue
			}
			p, err := loadPost(filepath.Join(galleryPostDir(gid), f.Name()))
			if err != nil {
				continue
			}
			posts = append(posts, p)
		}
	}

	// Filter for 실시간 베스트
	if galleryParam == "hot" {
		hotMin := fciMeta.HotMin
		hot := posts[:0]
		for _, p := range posts {
			if p.Likes >= hotMin {
				hot = append(hot, p)
			}
		}
		posts = hot
	}

	// Sort newest-first
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].CreatedAt > posts[j].CreatedAt
	})

	// Paginate
	total := len(posts)
	start := (page - 1) * pageSize
	if start >= total {
		posts = []Post{}
	} else {
		end := start + pageSize
		if end > total {
			end = total
		}
		posts = posts[start:end]
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Total-Count", strconv.Itoa(total))
	w.Header().Set("X-Page", strconv.Itoa(page))
	w.Header().Set("X-Page-Size", strconv.Itoa(pageSize))
	json.NewEncoder(w).Encode(posts)
}

// GET /api/com/posts/<id>
func handleGetPostDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/com/posts/")
	if id == "" || filepath.Base(id) != id {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	postPath, _ := findPostPath(id)
	if postPath == "" {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	data, err := os.ReadFile(postPath)
	if err != nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// POST /api/com/posts
func handleCreatePost(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, config.MaxSize)
	if err := r.ParseMultipartForm(2 * 1048576); err != nil {
		http.Error(w, "File too large or parse error", http.StatusBadRequest)
		return
	}

	title := strings.TrimSpace(sanitizeString(r.FormValue("title")))
	if title == "" {
		title = "(제목 없음)"
	}
	body := sanitizeString(r.FormValue("body"))
	handle := normalizeHandle(r.FormValue("handle"))
	galleryID := strings.TrimSpace(sanitizeString(r.FormValue("gallery")))

	if _, ok := galleryIDSet()[galleryID]; !ok {
		if len(fciMeta.Galleries) > 0 {
			galleryID = fciMeta.Galleries[0].ID
		} else {
			http.Error(w, "No galleries configured", http.StatusInternalServerError)
			return
		}
	}

	// Rate-limit concurrent uploads
	uploadSem <- struct{}{}
	defer func() { <-uploadSem }()

	// Capture time once — used for both ID and CreatedAt
	now := time.Now().UnixNano()
	post := Post{
		ID:        fmt.Sprintf("%d", now),
		Gallery:   galleryID,
		Handle:    handle,
		Title:     title,
		Body:      body,
		CreatedAt: now,
	}

	// Process uploaded files — explicit Close instead of defer-in-loop
	attachmentIDs := r.MultipartForm.Value["attachmentIds"]
	for i, fileHeader := range r.MultipartForm.File["files"] {
		// Resolve attachment ID
		rawAttachmentID := fmt.Sprintf("file-%d", i)
		if i < len(attachmentIDs) && strings.TrimSpace(attachmentIDs[i]) != "" {
			rawAttachmentID = attachmentIDs[i]
		}
		attachmentID := sanitizeAttachmentID(rawAttachmentID)
		cleanFilename := sanitizeFilename(fileHeader.Filename)

		src, err := fileHeader.Open()
		if err != nil {
			continue
		}

		filename := fmt.Sprintf("%s_%s", post.ID, cleanFilename)
		dst, err := os.Create(filepath.Join(fciMeta.FilesDir, filename))
		if err != nil {
			src.Close()
			continue
		}
		io.Copy(dst, src)
		dst.Close()
		src.Close()

		post.Files = append(post.Files, filename)
		post.Attachments = append(post.Attachments, Attachment{ID: attachmentID, Filename: filename})

		// Auto-inject image attachment token into post body
		if isImageExt(cleanFilename) {
			token := fmt.Sprintf("[[attach:%s]]", attachmentID)
			if post.Body == "" {
				post.Body = token
			} else {
				post.Body = post.Body + "\n" + token
			}
		}
	}

	// Persist and enforce capacity under write lock
	mu.Lock()
	err := savePost(filepath.Join(galleryPostDir(galleryID), post.ID+".json"), post)
	if err != nil {
		mu.Unlock()
		http.Error(w, "Failed to save post", http.StatusInternalServerError)
		return
	}
	enforceCapacity()
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

// POST /api/com/posts/<id>/comments
func handleCreateComment(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/com/posts/"), "/comments")
	if id == "" || filepath.Base(id) != id {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	postPath, _ := findPostPath(id)
	if postPath == "" {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	p, err := loadPost(postPath)
	if err != nil {
		http.Error(w, "Corrupt post data", http.StatusInternalServerError)
		return
	}

	var req struct {
		Body   string `json:"body"`
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	sanitizedBody := strings.TrimSpace(sanitizeString(req.Body))
	if sanitizedBody == "" {
		http.Error(w, "Comment body is required", http.StatusBadRequest)
		return
	}

	handle := normalizeHandle(req.Handle)
	if handle == "" {
		handle = generateAnonHandle(time.Now().UnixNano())
	}

	now := time.Now().UnixNano()
	p.Comments = append(p.Comments, Comment{
		ID:        fmt.Sprintf("%d", now),
		Handle:    handle,
		Body:      sanitizedBody,
		CreatedAt: now,
	})

	if err := savePost(postPath, p); err != nil {
		http.Error(w, "Failed to save comment", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// modifyPostVote is a shared helper for like/dislike handlers.
func modifyPostVote(w http.ResponseWriter, r *http.Request, suffix string, apply func(*Post)) {
	mu.Lock()
	defer mu.Unlock()

	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/com/posts/"), suffix)
	if id == "" || filepath.Base(id) != id {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	postPath, _ := findPostPath(id)
	if postPath == "" {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	p, err := loadPost(postPath)
	if err != nil {
		http.Error(w, "Corrupt post data", http.StatusInternalServerError)
		return
	}

	apply(&p)

	if err := savePost(postPath, p); err != nil {
		http.Error(w, "Failed to save post", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// POST /api/com/posts/<id>/like
func handleLikePost(w http.ResponseWriter, r *http.Request) {
	modifyPostVote(w, r, "/like", func(p *Post) { p.Likes++ })
}

// POST /api/com/posts/<id>/dislike
func handleDislikePost(w http.ResponseWriter, r *http.Request) {
	modifyPostVote(w, r, "/dislike", func(p *Post) { p.Dislikes++ })
}
