package handlers

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestMockDriveWebSocketUpdatesTracker(t *testing.T) {
	tracker := NewMockDriveTracker()
	server := httptest.NewServer(MockDriveWebSocketHandler(tracker))
	defer server.Close()

	wsURL := "ws" + server.URL[len("http"):]
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close()

	want := MockDrivePosition{Lat: 26.1445, Lng: 91.7362, Progress: 0.25, SegmentIndex: 4}
	if err := conn.WriteJSON(want); err != nil {
		t.Fatalf("write position: %v", err)
	}

	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		got, connected, ok := tracker.snapshot()
		if ok && connected {
			if got.Lat != want.Lat || got.Lng != want.Lng || got.Progress != want.Progress || got.SegmentIndex != want.SegmentIndex {
				t.Fatalf("tracker position = %+v, want %+v", got, want)
			}
			if got.UpdatedAt.IsZero() {
				t.Fatal("tracker did not timestamp the update")
			}
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("tracker did not receive websocket position")
}
