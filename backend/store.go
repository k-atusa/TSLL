// test825c : project USAG FalseCrypt server
package main

import (
	"bytes"
	"crypto/subtle"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/k-atusa/USAG-Lib/Bencrypt"
	"github.com/taewook427/USAG-KOX/FalseCrypt"
)

// chunk storage server
type ChunkSvr struct {
	wrkey []byte
	cb    *FalseCrypt.ChunkBalancer
}

func (cs *ChunkSvr) authorize(order string, timestamp int64, value []byte, auth []byte) bool {
	diff := time.Now().Unix() - timestamp
	if diff < -900 || diff > 900 {
		return false // timeout unauthorized
	}

	// [order][time][data] HMAC check
	buf := make([]byte, len(order)+8+len(value))
	copy(buf[:len(order)], order)
	binary.LittleEndian.PutUint64(buf[len(order):len(order)+8], uint64(timestamp))
	copy(buf[len(order)+8:], value)
	if subtle.ConstantTimeCompare(auth, Bencrypt.HMAC3256(cs.wrkey, buf)) == 1 {
		return true
	} else {
		time.Sleep(1500 * time.Millisecond) // anti random attack
		return false
	}
}

func (cs *ChunkSvr) Init(key []byte, cb *FalseCrypt.ChunkBalancer) {
	cs.wrkey = key
	cs.cb = cb
}

// fetch account, returns (account, hash)
func (cs *ChunkSvr) GetAccount(username string) ([]byte, error) {
	var buf bytes.Buffer
	if err := cs.cb.GetAccount(username, &buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// set account
func (cs *ChunkSvr) SetAccount(username string, data []byte, chksum []byte, timestamp int64, auth []byte) error {
	if !cs.authorize("SetAccount", timestamp, chksum, auth) {
		return errors.New("unauthorized")
	}
	if !bytes.Equal(chksum, Bencrypt.SHA3256(data)) {
		return errors.New("invalid checksum")
	}
	if err := cs.cb.SetAccount(username, bytes.NewReader(data), int64(len(data))); err != nil {
		return err
	}
	return nil
}

// read chunk
func (cs *ChunkSvr) ReadChunk(cid []byte) ([]byte, error) {
	return cs.cb.ReadChunk(cid)
}

// write chunk
func (cs *ChunkSvr) WriteChunk(cid []byte, data []byte, chksum []byte, timestamp int64, auth []byte) error {
	wrv := make([]byte, len(cid)+len(chksum)) // auth value: [cid][checksum]
	copy(wrv[:len(cid)], cid)
	copy(wrv[len(cid):], chksum)
	if !cs.authorize("WriteChunk", timestamp, wrv, auth) {
		return errors.New("unauthorized")
	}
	if !bytes.Equal(chksum, Bencrypt.SHA3256(data)) {
		return errors.New("invalid checksum")
	}
	if err := cs.cb.WriteChunk(cid, data); err != nil {
		return err
	}
	return nil
}

// delete chunk
func (cs *ChunkSvr) DelChunk(cid []byte, timestamp int64, auth []byte) error {
	if !cs.authorize("DelChunk", timestamp, cid, auth) {
		return errors.New("unauthorized")
	}
	if err := cs.cb.DelChunk(cid); err != nil {
		return err
	}
	return nil
}

// fetch operations log
func (cs *ChunkSvr) GetLog(timestamp int64, auth []byte) (string, error) {
	if !cs.authorize("GetLog", timestamp, nil, auth) {
		return "", errors.New("unauthorized")
	}
	return cs.cb.GetLog()
}

// returns existing chunk bloomfilter and checksum
func (cs *ChunkSvr) CheckChunk(timestamp int64, auth []byte) ([]byte, []byte, error) {
	if !cs.authorize("CheckChunk", timestamp, nil, auth) {
		return nil, nil, errors.New("unauthorized")
	}
	bloom := cs.cb.CheckChunk()
	return bloom, Bencrypt.SHA3256(bloom), nil
}

// trims chunk by bloomfilter
func (cs *ChunkSvr) TrimChunk(bloom []byte, chksum []byte, timestamp int64, auth []byte) error {
	if !cs.authorize("TrimChunk", timestamp, chksum, auth) {
		return errors.New("unauthorized")
	}
	if !bytes.Equal(chksum, Bencrypt.SHA3256(bloom)) {
		return errors.New("invalid checksum")
	}
	return cs.cb.TrimChunk(bloom)
}

// removes empty folders
func (cs *ChunkSvr) TrimEmpty(timestamp int64, auth []byte) error {
	if !cs.authorize("TrimEmpty", timestamp, nil, auth) {
		return errors.New("unauthorized")
	}
	return cs.cb.TrimEmpty()
}

// init chunk server
func initCS() (*ChunkSvr, error) {
	var meta FalseCrypt.ChunkMeta
	metaBytes, err := os.ReadFile(config.ChunkMeta)
	if os.IsNotExist(err) { // make new if not exists
		meta.MainPath = "./accounts"
		meta.BfSize = 1048576
		meta.Paths = []string{"./chunks"}
		chunkCap := int64(1024 * 1048576) // default 1GB
		meta.Caps = []int64{chunkCap}
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
		io.WriteString(w, logStr)
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

// read error and make http code for FCS
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
