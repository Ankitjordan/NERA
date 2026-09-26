package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"routing-engine/internal/localization"
	"routing-engine/internal/services/routing"
)

// RouteHandler handles the GET /api/v1/route endpoint.
func RouteHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	language := localization.FromRequest(r)
	w.Header().Set("Content-Language", language)

	waypoints := r.URL.Query().Get("waypoints")
	profile := r.URL.Query().Get("profile")
	if profile == "" {
		profile = "driving"
	}

	if waypoints == "" {
		http.Error(w, localization.Message(language, "missing_waypoints"), http.StatusBadRequest)
		return
	}

	token := os.Getenv("MAPPLS_TOKEN")
	if token == "" {
		slog.Error("MAPPLS_TOKEN environment variable not set")
		http.Error(w, "Server configuration error", http.StatusInternalServerError)
		return
	}

	result, err := routing.FetchRoute(waypoints, profile, token, nil)
	if err != nil {
		if strings.Contains(err.Error(), "no route found") {
			http.Error(w, localization.Message(language, "route_not_found"), http.StatusNotFound)
		} else {
			http.Error(w, localization.Message(language, "route_failed"), http.StatusBadGateway)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	result.Language = language
	json.NewEncoder(w).Encode(result)
}
