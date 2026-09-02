package main

import (
	"log/slog"
	"os"

	"routing-engine/internal/poc/osm"
)

func main() {
	pbfDir := `e:\NERA\ner_pbf`
	gobFile := `e:\NERA\Routing Engine\ner_graph.gob`

	slog.Info("Starting graph build", slog.String("dir", pbfDir))

	g, err := osm.ParseNERDirectory(pbfDir)
	if err != nil {
		slog.Error("Failed to parse NER directory", slog.String("error", err.Error()))
		os.Exit(1)
	}

	slog.Info("Saving graph to file", slog.String("file", gobFile))
	if err := g.SaveToFile(gobFile); err != nil {
		slog.Error("Failed to save graph", slog.String("error", err.Error()))
		os.Exit(1)
	}

	slog.Info("Graph built and saved successfully!")
}
