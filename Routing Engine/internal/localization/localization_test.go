package localization

import (
	"net/http/httptest"
	"testing"
)

func TestNormalize(t *testing.T) {
	tests := map[string]string{
		"en":      "en",
		"as-IN":   "as",
		"bn_in":   "bn",
		"invalid": "en",
		"":        "en",
	}
	for input, want := range tests {
		if got := Normalize(input); got != want {
			t.Errorf("Normalize(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestFromRequestPrefersQueryLanguage(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/route?language=lus-IN", nil)
	req.Header.Set("Accept-Language", "bn-IN")
	if got := FromRequest(req); got != "lus" {
		t.Fatalf("FromRequest() = %q, want lus", got)
	}
}

func TestMessageFallsBackToEnglish(t *testing.T) {
	if got := Message("mni", "missing_waypoints"); got != "Missing waypoints" {
		t.Fatalf("Message() = %q, want English fallback", got)
	}
}
