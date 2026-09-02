package main

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"routing-engine/internal/handlers"
	"routing-engine/internal/services/hazard"
	"routing-engine/internal/services/startup"
)

// EngineConfig holds basic startup configuration for the Routing Engine.
type EngineConfig struct {
	ServiceName string
	Environment string
	Version     string
	Port        string
}

// DefaultConfig returns the default configuration for the engine.
func DefaultConfig() EngineConfig {
	return EngineConfig{
		ServiceName: "NERA-Routing-Engine",
		Environment: "development",
		Version:     "0.1.0",
		Port:        "8080",
	}
}

// SetupLogger configures and returns a structured logger.
func SetupLogger(isJSON bool) *slog.Logger {
	var handler slog.Handler
	opts := &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}

	if isJSON {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	return slog.New(handler)
}

// RunEngine simulates the execution of the engine logging workflow.
func RunEngine(ctx context.Context, logger *slog.Logger, cfg EngineConfig) error {
	logger.Info("Starting Routing Engine service",
		slog.String("service", cfg.ServiceName),
		slog.String("environment", cfg.Environment),
		slog.String("version", cfg.Version),
		slog.String("port", cfg.Port),
	)

	// Initialize the Startup Manager for graph persistence and loading
	nerGraphPath := "ner_graph.gob"
	metadataPath := "ner_graph_metadata.json"
	pbfDir := `e:\NERA\ner_pbf`

	startupManager := startup.NewManager(nerGraphPath, metadataPath, pbfDir)
	startupManager.StartAsync() // Begins background graph validation/download/build

	// Instantiate services
	hazardSvc := hazard.NewService()

	// Register HTTP routes
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/system/status", handlers.StatusHandler(startupManager))
	mux.HandleFunc("/api/v1/route", handlers.RouteHandler)
	mux.HandleFunc("/api/v1/safe-route", handlers.SafeRouteHandler(hazardSvc, startupManager))
	mux.HandleFunc("/api/v1/hazards", handlers.HazardHandler(hazardSvc))
	mux.HandleFunc("/api/v1/poc/osm-route", handlers.POCOSMRouteHandler(startupManager))

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	logger.Info("Routing Engine HTTP server is running", slog.String("addr", srv.Addr))

	// Start server in a goroutine so it doesn't block context logic if we add it
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	// Keep the main thread alive
	<-ctx.Done()

	return nil
}

func loadEnv(filepath string) {
	file, err := os.Open(filepath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
			if (key == "VITE_MAPPLS_ACCESS_TOKEN" || key == "MAPPLS_ACCESS_TOKEN") && os.Getenv("MAPPLS_TOKEN") == "" {
				os.Setenv("MAPPLS_TOKEN", val)
			}
		}
	}
}

func main() {
	loadEnv(".env")
	loadEnv("../ui/.env.local")
	loadEnv("../ui/.env")

	cfg := DefaultConfig()
	logger := SetupLogger(false)
	slog.SetDefault(logger)

	fmt.Println("========================================")
	fmt.Println("       NERA ROUTING ENGINE LOGGER       ")
	fmt.Println("========================================")

	// Ensure MAPPLS_TOKEN is present
	if os.Getenv("MAPPLS_TOKEN") == "" {
		logger.Warn("MAPPLS_TOKEN environment variable is not set! Routing calls will fail.")
	} else {
		logger.Info("MAPPLS_TOKEN loaded successfully")
	}

	ctx := context.Background()
	if err := RunEngine(ctx, logger, cfg); err != nil {
		logger.Error("Engine encountered an error", slog.String("error", err.Error()))
		os.Exit(1)
	}
}
