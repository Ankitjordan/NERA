package handlers

import (
	"encoding/json"
	"net/http"

	"routing-engine/internal/localization"
	"routing-engine/internal/models"
	"routing-engine/internal/services/hazard"
)

// HazardHandler handles the GET /api/v1/hazards endpoint.
func HazardHandler(svc *hazard.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Language", localization.FromRequest(r))

		hazards := svc.GetActiveHazards()
		if hazards == nil {
			hazards = []models.Hazard{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(hazards)
	}
}
