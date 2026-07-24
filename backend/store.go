// test825c : project USAG FalseCrypt server
package main

import (
	"bytes"
	"crypto/subtle"
	"encoding/binary"
	"errors"
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
