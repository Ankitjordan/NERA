package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	apiKey := "4cf8e5ac-2657-4ecf-842e-2976f4e514f3"
	
	// Test 1: Guwahati to Shillong
	testRoute("Guwahati -> Shillong", apiKey, "26.1445,91.7362", "25.5788,91.8933")
	
	// Test 2: Imphal to Kohima
	testRoute("Imphal -> Kohima", apiKey, "24.8170,93.9368", "25.6701,94.1077")
	
	// Test 3: Guwahati to Shillong with Avoidance Area (Custom Model)
	testAvoidance("Guwahati -> Shillong with Avoidance", apiKey, "26.1445,91.7362", "25.5788,91.8933")
}

func testRoute(name, apiKey, origin, destination string) {
	fmt.Printf("\n--- %s ---\n", name)
	url := fmt.Sprintf("https://graphhopper.com/api/1/route?point=%s&point=%s&profile=car&locale=en&calc_points=true&instructions=true&key=%s", origin, destination, apiKey)
	
	resp, err := http.Get(url)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	if resp.StatusCode != 200 {
		fmt.Printf("API Error %d: %s\n", resp.StatusCode, string(body))
		return
	}
	
	var data map[string]interface{}
	json.Unmarshal(body, &data)
	
	paths := data["paths"].([]interface{})
	path := paths[0].(map[string]interface{})
	
	dist := path["distance"].(float64)
	time := path["time"].(float64)
	
	fmt.Printf("Distance: %.2f km\n", dist/1000)
	fmt.Printf("Duration: %.2f minutes\n", time/60000)
	fmt.Printf("Geometry present: %v\n", path["points"] != nil)
	
	instructions := path["instructions"].([]interface{})
	fmt.Printf("Turn-by-turn instructions count: %d\n", len(instructions))
	if len(instructions) > 0 {
		first := instructions[0].(map[string]interface{})
		fmt.Printf("First instruction: %s\n", first["text"])
	}
}

func testAvoidance(name, apiKey, origin, destination string) {
	fmt.Printf("\n--- %s ---\n", name)
	url := fmt.Sprintf("https://graphhopper.com/api/1/route?key=%s", apiKey)
	
	// We'll define a custom model that penalizes or avoids an area completely.
	// Let's create an area polygon right in the middle of NH6 to force a detour.
	// A simple box around Nongpoh: 91.8, 25.85 to 91.9, 25.95
	
	payload := map[string]interface{}{
		"points": [][]float64{
			{91.7362, 26.1445}, // Guwahati
			{91.8933, 25.5788}, // Shillong
		},
		"profile": "car",
		"ch.disable": true,
		"custom_model": map[string]interface{}{
			"priority": []map[string]interface{}{
				{
					"if": "in_hazard_zone",
					"multiply_by": "0.0", // 0.0 means completely blocked/avoid
				},
			},
			"areas": map[string]interface{}{
				"hazard_zone": map[string]interface{}{
					"type": "Feature",
					"geometry": map[string]interface{}{
						"type": "Polygon",
						"coordinates": [][][]float64{
							{
								{91.80, 25.85},
								{91.95, 25.85},
								{91.95, 25.95},
								{91.80, 25.95},
								{91.80, 25.85},
							},
						},
					},
				},
			},
		},
	}
	
	jsonPayload, _ := json.Marshal(payload)
	
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	if resp.StatusCode != 200 {
		fmt.Printf("API Error %d: %s\n", resp.StatusCode, string(body))
		return
	}
	
	var data map[string]interface{}
	json.Unmarshal(body, &data)
	
	paths := data["paths"].([]interface{})
	path := paths[0].(map[string]interface{})
	
	dist := path["distance"].(float64)
	time := path["time"].(float64)
	
	fmt.Printf("Distance: %.2f km\n", dist/1000)
	fmt.Printf("Duration: %.2f minutes\n", time/60000)
	fmt.Printf("Geometry present: %v\n", path["points"] != nil)
}
