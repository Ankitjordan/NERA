package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"
)

// EngineConfig holds basic startup configuration for the Routing Engine.
type EngineConfig struct {
	ServiceName string
	Environment string
	Version     string
}

// DefaultConfig returns the default configuration for the engine.
func DefaultConfig() EngineConfig {
	return EngineConfig{
		ServiceName: "NERA-Routing-Engine",
		Environment: "development",
		Version:     "0.1.0",
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
	)

	logger.Debug("Initializing in-memory routing tables and graph structures...")
	time.Sleep(50 * time.Millisecond)

	logger.Info("Routing table initialized successfully",
		slog.Int("nodes_loaded", 128),
		slog.Int("routes_active", 56),
	)

	logger.Warn("Notice: Operating in standalone development mode")

	logger.Info("Routing Engine is ready and running",
		slog.String("status", "HEALTHY"),
		slog.Time("started_at", time.Now().UTC()),
	)

	return nil
}

func main() {
	cfg := DefaultConfig()
	logger := SetupLogger(false)
	slog.SetDefault(logger)

	fmt.Println("========================================")
	fmt.Println("       NERA ROUTING ENGINE LOGGER       ")
	fmt.Println("========================================")

	ctx := context.Background()
	if err := RunEngine(ctx, logger, cfg); err != nil {
		logger.Error("Engine encountered an error", slog.String("error", err.Error()))
		os.Exit(1)
	}

	logger.Info("Engine initialization finished successfully.")
}
