// test827 : project USAG FalseCrypt CRC32 Check
package main

import (
	"fmt"
	"hash/crc32"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

func main() {
	// get target directory
	if len(os.Args) < 2 {
		fmt.Println("[HALT] No target directory specified.")
		os.Exit(1)
	}
	targetDir := os.Args[1]

	// open log file
	logFilePath := "crcchk.txt"
	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		fmt.Printf("[HALT] %v\n", err)
		os.Exit(1)
	}
	defer logFile.Close()

	// set multiwriter, log start time
	mw := io.MultiWriter(os.Stdout, logFile)
	logger := log.New(mw, "", 0)
	currentTime := time.Now().Format("2006-01-02 15:04:05")
	logger.Printf("[%s] === Start Check: %s ===\n", currentTime, targetDir)

	// walk directory
	var totalChunks int64
	var corruptedChunks int64
	var errorChunks int64

	// worker pool for async check
	numWorkers := 32
	jobs := make(chan string, 512)
	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for path := range jobs {
				filename := filepath.Base(path)

				// get CRC32 value
				crcHex := filename[22:30]
				storedCRC, err := strconv.ParseUint(crcHex, 16, 32)
				if err != nil {
					logger.Printf("[%s] [ERROR] %s: %v\n", time.Now().Format("2006-01-02 15:04:05"), path, err)
					atomic.AddInt64(&errorChunks, 1)
					continue
				}

				// read file data, check CRC
				data, err := os.ReadFile(path)
				if err != nil {
					logger.Printf("[%s] [ERROR] %s: %v\n", time.Now().Format("2006-01-02 15:04:05"), path, err)
					atomic.AddInt64(&errorChunks, 1)
					continue
				}
				actualCRC := crc32.ChecksumIEEE(data)

				// compare CRC
				if actualCRC != uint32(storedCRC) {
					logger.Printf("[%s] [BITROT] %s: expected(%08x) actual(%08x)\n", time.Now().Format("2006-01-02 15:04:05"), path, storedCRC, actualCRC)
					atomic.AddInt64(&corruptedChunks, 1)
				}
			}
		}()
	}

	err = filepath.WalkDir(targetDir, func(path string, e os.DirEntry, err error) error {
		// find files
		if err != nil {
			logger.Printf("[%s] [ERROR] %s: %v\n", time.Now().Format("2006-01-02 15:04:05"), path, err)
			atomic.AddInt64(&errorChunks, 1)
			return nil
		}
		if e.IsDir() {
			return nil
		}

		filename := e.Name()
		if len(filename) == 30 {
			atomic.AddInt64(&totalChunks, 1)
			jobs <- path
		}
		return nil
	})
	close(jobs)
	wg.Wait()

	// report result
	if err != nil {
		logger.Printf("[%s] [ERROR] %v\n", time.Now().Format("2006-01-02 15:04:05"), err)
	}
	endTime := time.Now().Format("2006-01-02 15:04:05")
	logger.Printf("[%s] === Finish Check ===\n", endTime)
	logger.Printf("    Total Chunks: %d\n", totalChunks)
	logger.Printf("    Corrupted Chunks: %d\n", corruptedChunks)
	logger.Printf("    Read Error Chunks: %d\n", errorChunks)
}
