package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type MockDrivePosition struct {
	Lat              float64   `json:"lat"`
	Lng              float64   `json:"lng"`
	Bearing          float64   `json:"bearing"`
	SpeedKmh         float64   `json:"speedKmh"`
	DistanceCoveredM float64   `json:"distanceCoveredM"`
	TotalDistanceM   float64   `json:"totalDistanceM"`
	Progress         float64   `json:"progress"`
	SegmentIndex     int       `json:"segmentIndex"`
	Finished         bool      `json:"finished"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type MockDriveTracker struct {
	mu        sync.RWMutex
	position  *MockDrivePosition
	connected bool
}

func NewMockDriveTracker() *MockDriveTracker { return &MockDriveTracker{} }

func (t *MockDriveTracker) update(position MockDrivePosition) {
	position.UpdatedAt = time.Now().UTC()
	t.mu.Lock()
	t.position = &position
	t.mu.Unlock()
}

func (t *MockDriveTracker) setConnected(connected bool) {
	t.mu.Lock()
	t.connected = connected
	t.mu.Unlock()
}

func (t *MockDriveTracker) snapshot() (MockDrivePosition, bool, bool) {
	t.mu.RLock()
	defer t.mu.RUnlock()
	if t.position == nil {
		return MockDrivePosition{}, t.connected, false
	}
	return *t.position, t.connected, true
}

var mockDriveUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func MockDriveWebSocketHandler(tracker *MockDriveTracker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := mockDriveUpgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		tracker.setConnected(true)
		defer tracker.setConnected(false)

		for {
			var position MockDrivePosition
			if err := conn.ReadJSON(&position); err != nil {
				return
			}
			tracker.update(position)
		}
	}
}

func MockDrivePositionHandler(tracker *MockDriveTracker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		position, connected, hasPosition := tracker.snapshot()
		response := struct {
			Connected bool               `json:"connected"`
			Position  *MockDrivePosition `json:"position,omitempty"`
		}{Connected: connected}
		if hasPosition {
			response.Position = &position
		}
		_ = json.NewEncoder(w).Encode(response)
	}
}
