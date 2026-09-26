package localization

import (
	"net/http"
	"strings"
)

const DefaultLanguage = "en"

var supportedLanguages = map[string]struct{}{
	"en": {}, "as": {}, "bn": {}, "brx": {}, "kha": {}, "grt": {},
	"mni": {}, "lus": {}, "njo": {}, "ne": {}, "trp": {}, "inc": {},
}

var messages = map[string]map[string]string{
	"en": {
		"missing_waypoints":   "Missing waypoints",
		"invalid_waypoints":   "Invalid waypoints format",
		"route_not_found":     "No route found",
		"route_failed":        "Failed to process route",
		"primary_safe":        "Primary route is safe based on live telemetry.",
		"hazard_avoided":      "Avoided multiple dynamic hazards using AI predictions.",
		"hazard_no_alternate": "Hazard intersects route, but no alternate route was found.",
	},
}

func Normalize(code string) string {
	code = strings.ToLower(strings.TrimSpace(code))
	if separator := strings.IndexAny(code, "-_"); separator > 0 {
		code = code[:separator]
	}
	if _, ok := supportedLanguages[code]; ok {
		return code
	}
	return DefaultLanguage
}

func FromRequest(r *http.Request) string {
	code := r.URL.Query().Get("language")
	if code == "" {
		code = r.Header.Get("Accept-Language")
	}
	return Normalize(code)
}

func Message(language, key string) string {
	language = Normalize(language)
	if translations, ok := messages[language]; ok {
		if value, exists := translations[key]; exists {
			return value
		}
	}
	return messages[DefaultLanguage][key]
}
