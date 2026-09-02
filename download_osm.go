package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

func main() {
	// Bounding box for Guwahati to Shillong: south,west,north,east
	// Lat 25.5 to 26.2, Lon 91.5 to 92.0
	bbox := "25.5,91.5,26.2,92.0"
	
	// Overpass QL to get all ways with highway tag and their nodes
	query := fmt.Sprintf(`[out:xml][timeout:300];
(
  way["highway"](%s);
  node(w);
);
out body;`, bbox)

	data := url.Values{}
	data.Set("data", query)

	req, err := http.NewRequest("POST", "https://overpass-api.de/api/interpreter", strings.NewReader(data.Encode()))
	if err != nil {
		panic(err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	fmt.Println("Downloading OSM XML from Overpass API...")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		panic(fmt.Sprintf("Failed to download, status: %s, body: %s", resp.Status, body))
	}

	out, err := os.Create("ner_extract.osm")
	if err != nil {
		panic(err)
	}
	defer out.Close()

	n, err := io.Copy(out, resp.Body)
	if err != nil {
		panic(err)
	}
	
	fmt.Printf("Successfully downloaded %d bytes to ner_extract.osm\n", n)
}
