package handlers

import (
	"encoding/json"
	"net/http"

	"routing-engine/internal/services/startup"
)

// SystemStatusResponse represents the backend lifecycle status.
type SystemStatusResponse struct {
	State    string      `json:"state"`
	Message  string      `json:"message"`
	Percent  float64     `json:"percent"`
	Metadata interface{} `json:"metadata,omitempty"`
}

// StatusHandler returns the current startup state of the backend.
func StatusHandler(manager *startup.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		state, msg, pct, meta := manager.GetStatus()

		resp := SystemStatusResponse{
			State:    string(state),
			Message:  msg,
			Percent:  pct,
			Metadata: meta,
		}

		json.NewEncoder(w).Encode(resp)
	}
}
