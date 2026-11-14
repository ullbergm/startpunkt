package source

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func secondaryLinks(spec []apiv1.Link, annotations map[string]string) ([]tile.Link, error) {
	links := make([]tile.Link, 0, len(spec))
	for _, link := range spec {
		links = append(links, tile.Link{Name: strings.TrimSpace(link.Name), URL: strings.TrimSpace(link.URL)})
	}
	if spec == nil && strings.TrimSpace(annotations[annLinks]) != "" {
		decoder := json.NewDecoder(strings.NewReader(annotations[annLinks]))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&links); err != nil {
			return nil, fmt.Errorf("annotation %s: %w", annLinks, err)
		}
		if err := decoder.Decode(new(any)); err != io.EOF {
			return nil, fmt.Errorf("annotation %s must contain one JSON array", annLinks)
		}
		for i := range links {
			links[i].Name = strings.TrimSpace(links[i].Name)
			links[i].URL = strings.TrimSpace(links[i].URL)
		}
	}
	if err := tile.ValidateLinks(links); err != nil {
		return nil, err
	}
	if len(links) == 0 {
		return nil, nil
	}
	return links, nil
}
