// test825c : project USAG FalseCrypt server
package main

import (
	"bytes"
	"crypto/subtle"
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/k-atusa/USAG-Lib/Bencrypt"
	"github.com/taewook427/USAG-KOX/FalseCrypt"
)

// chunk storage server
type ChunkSvr struct {
	lock  sync.RWMutex
	wrkey []byte
	cb    *FalseCrypt.ChunkBalancer
	log   []string
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
	return subtle.ConstantTimeCompare(auth, Bencrypt.HMAC3256(cs.wrkey, buf)) == 1
}

func (cs *ChunkSvr) addLog(msg string) {
	cs.lock.Lock()
	defer cs.lock.Unlock()
	cs.log = append(cs.log, msg)
}

func (cs *ChunkSvr) Init(key []byte, cb *FalseCrypt.ChunkBalancer) {
	cs.wrkey = key
	cs.cb = cb
	cs.log = make([]string, 0)
}

// fetch operations log
func (cs *ChunkSvr) GetLog(timestamp int64, auth []byte) (string, error) {
	if !cs.authorize("GetLog", timestamp, nil, auth) {
		return "", errors.New("unauthorized")
	}
	cs.lock.Lock()
	defer cs.lock.Unlock()
	temp := strings.Join(cs.log, "\n")
	cs.log = make([]string, 0) // reset log
	return temp, nil
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
	if !cs.authorize("WriteChunk", timestamp, chksum, auth) {
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

// check storage
func (cs *ChunkSvr) CheckChunk(cids []byte, chksum []byte, chkHash bool, timestamp int64, auth []byte) error {
	if !cs.authorize("CheckChunk", timestamp, chksum, auth) {
		return errors.New("unauthorized")
	}
	if !bytes.Equal(chksum, Bencrypt.SHA3256(cids)) {
		return errors.New("invalid checksum")
	}
	if len(cids) == 0 || len(cids)%16 != 0 {
		return errors.New("invalid CIDs length")
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				cs.addLog(fmt.Sprintf("[CheckChunk] panic: %v", r))
			}
		}()
		cs.addLog("[CheckChunk] start")
		defer cs.addLog("[CheckChunk] finish")

		// check all chunks
		for i := 0; i < len(cids)/16; i++ {
			ext, err := cs.cb.CheckChunk(cids[16*i:16*i+16], chkHash)
			if !ext {
				cs.addLog(fmt.Sprintf("[CheckChunk] chunk %x not found", cids[16*i:16*i+16]))
			}
			if err != nil {
				cs.addLog(fmt.Sprintf("[CheckChunk] chunk %x error: %v", cids[16*i:16*i+16], err))
			}
		}
	}()
	return nil
}

// trim storage
func (cs *ChunkSvr) TrimChunk(rmEmpty bool, bloom []byte, chksum []byte, timestamp int64, auth []byte) error {
	if !cs.authorize("TrimChunk", timestamp, chksum, auth) {
		return errors.New("unauthorized")
	}
	if !bytes.Equal(chksum, Bencrypt.SHA3256(bloom)) {
		return errors.New("invalid checksum")
	}
	if len(bloom) < 12 {
		return errors.New("invalid filter length")
	}

	// fast trim with empty folder removing
	if rmEmpty {
		tr, err := cs.cb.TrimEmpty()
		cs.addLog(fmt.Sprintf("[TrimEmpty] emptied %d folders", tr))
		return err
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				cs.addLog(fmt.Sprintf("[TrimChunk] panic: %v", r))
			}
		}()
		cs.addLog("[TrimChunk] start")
		defer cs.addLog("[TrimChunk] finish")

		// full trim with bloom filter
		tr, err := cs.cb.TrimChunk(bloom)
		cs.addLog(fmt.Sprintf("[TrimChunk] delete %d chunks", tr))
		if err != nil {
			cs.addLog(fmt.Sprintf("[TrimChunk] error: %v", err))
		}
	}()
	return nil
}
