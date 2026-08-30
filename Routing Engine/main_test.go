package main

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
)

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.ServiceName != "NERA-Routing-Engine" {
		t.Errorf("expected ServiceName 'NERA-Routing-Engine', got '%s'", cfg.ServiceName)
	}
	if cfg.Environment != "development" {
		t.Errorf("expected Environment 'development', got '%s'", cfg.Environment)
	}
	if cfg.Version == "" {
		t.Error("expected non-empty Version")
	}
}

func TestSetupLogger(t *testing.T) {
	textLogger := SetupLogger(false)
	if textLogger == nil {
		t.Fatal("expected non-nil text logger")
	}

	jsonLogger := SetupLogger(true)
	if jsonLogger == nil {
		t.Fatal("expected non-nil json logger")
	}
}

func TestRunEngine(t *testing.T) {
	var buf bytes.Buffer
	handler := slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})
	testLogger := slog.New(handler)

	cfg := EngineConfig{
		ServiceName: "TestEngine",
		Environment: "testing",
		Version:     "0.0.1-test",
	}

	ctx := context.Background()
	err := RunEngine(ctx, testLogger, cfg)
	if err != nil {
		t.Fatalf("RunEngine returned unexpected error: %v", err)
	}

	output := buf.String()
	expectedSubstrings := []string{
		"Starting Routing Engine service",
		"TestEngine",
		"testing",
		"Routing table initialized successfully",
		"Operating in standalone development mode",
		"Routing Engine is ready and running",
	}

	for _, substr := range expectedSubstrings {
		if !strings.Contains(output, substr) {
			t.Errorf("expected log output to contain '%s', got: %s", substr, output)
		}
	}
}
