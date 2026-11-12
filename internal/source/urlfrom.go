package source

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
)

// resolveURLFrom reads the URL of an Application from the object its urlFrom
// points at.
func resolveURLFrom(app *unstructured.Unstructured, from *apiv1.URLFrom, lookup Lookup) (string, error) {
	if from.APIVersion == "" || from.Kind == "" || from.Name == "" || from.Property == "" {
		return "", errors.New("apiVersion, kind, name and property are required")
	}
	if lookup == nil {
		return "", errors.New("references cannot be resolved here")
	}
	ref := Ref{APIVersion: from.APIVersion, Kind: from.Kind, Namespace: from.Namespace, Name: from.Name}
	// apiGroup is optional. When it is set, apiVersion holds the version
	// alone; otherwise apiVersion may be "group/version".
	if from.APIGroup != "" && !strings.Contains(from.APIVersion, "/") {
		ref.APIVersion = from.APIGroup + "/" + from.APIVersion
	}
	if ref.Namespace == "" {
		ref.Namespace = app.GetNamespace()
	}
	target, err := lookup(ref)
	if err != nil {
		return "", err
	}
	if target == nil {
		return "", fmt.Errorf("%s %s/%s does not exist", ref.Kind, ref.Namespace, ref.Name)
	}
	value, ok := property(target.Object, from.Property)
	if !ok || value == "" {
		return "", fmt.Errorf("%s %s/%s has no value at %q",
			ref.Kind, ref.Namespace, ref.Name, from.Property)
	}
	if from.URLTemplate != "" {
		return strings.ReplaceAll(from.URLTemplate, "{0}", value), nil
	}
	return value, nil
}

// property reads a value by a dotted path such as "spec.host" or
// "status.ingress[0].host". Only scalar values are returned.
func property(object map[string]any, path string) (string, bool) {
	var current any = object
	for _, part := range strings.Split(path, ".") {
		name, indexes, ok := splitIndexes(part)
		if !ok {
			return "", false
		}
		if name != "" {
			m, isMap := current.(map[string]any)
			if !isMap {
				return "", false
			}
			if current, ok = m[name]; !ok {
				return "", false
			}
		}
		for _, i := range indexes {
			list, isList := current.([]any)
			if !isList || i >= len(list) {
				return "", false
			}
			current = list[i]
		}
	}
	switch v := current.(type) {
	case string:
		return v, true
	case bool, int64, float64, int:
		return fmt.Sprint(v), true
	default:
		return "", false
	}
}

// splitIndexes splits "ingress[0][1]" into "ingress" and [0, 1].
func splitIndexes(part string) (name string, indexes []int, ok bool) {
	open := strings.IndexByte(part, '[')
	if open < 0 {
		return part, nil, part != ""
	}
	name, rest := part[:open], part[open:]
	for rest != "" {
		end := strings.IndexByte(rest, ']')
		if rest[0] != '[' || end < 0 {
			return "", nil, false
		}
		i, err := strconv.Atoi(rest[1:end])
		if err != nil || i < 0 {
			return "", nil, false
		}
		indexes = append(indexes, i)
		rest = rest[end+1:]
	}
	return name, indexes, true
}
