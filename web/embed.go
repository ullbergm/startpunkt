// Package web holds the built frontend.
package web

import (
	"embed"
	"io/fs"
)

// The dist directory is produced by "npm run build". A placeholder file keeps
// it present so the Go code compiles before the frontend has been built.
//
//go:embed all:dist
var dist embed.FS

// Assets returns the built frontend with index.html at its root.
func Assets() fs.FS {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		panic(err)
	}
	return sub
}
