package startup

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

var RequiredNERStates = []string{
	"assam",
	"meghalaya",
	"arunachal_pradesh",
	"nagaland",
	"manipur",
	"mizoram",
	"tripura",
	"sikkim",
}

// DownloadMissingPBFs checks the given directory and downloads any missing state PBF files from Geofabrik.
// It reports progress via a callback function.
func DownloadMissingPBFs(targetDir string, progressCb func(stateName string, percent float64)) ([]string, error) {
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create target dir: %w", err)
	}

	var downloadedStates []string

	for _, state := range RequiredNERStates {
		filename := fmt.Sprintf("%s-latest.osm.pbf", state)
		filepathStr := filepath.Join(targetDir, filename)

		// Check if file already exists
		if _, err := os.Stat(filepathStr); err == nil {
			downloadedStates = append(downloadedStates, state)
			continue
		}

		// File is missing, let's download it
		url := fmt.Sprintf("https://download.geofabrik.de/asia/india/%s", filename)
		if err := downloadFile(url, filepathStr, func(percent float64) {
			if progressCb != nil {
				progressCb(state, percent)
			}
		}); err != nil {
			return nil, fmt.Errorf("failed to download %s: %w", state, err)
		}

		downloadedStates = append(downloadedStates, state)
	}

	return downloadedStates, nil
}

func downloadFile(url string, dest string, progressCb func(percent float64)) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	// Geofabrik blocks default Go User-Agent occasionally
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NERA-Routing-Engine/0.1")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	totalSize := resp.ContentLength
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	buf := make([]byte, 32*1024)
	var downloaded int64

	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			_, wErr := out.Write(buf[:n])
			if wErr != nil {
				return wErr
			}
			downloaded += int64(n)
			if totalSize > 0 && progressCb != nil {
				percent := float64(downloaded) / float64(totalSize) * 100.0
				progressCb(percent)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}
	return nil
}
