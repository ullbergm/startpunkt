package source

import (
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"cel.dev/cel-go/cel"
	"cel.dev/cel-go/common/types"
	"cel.dev/cel-go/common/types/ref"
	"cel.dev/cel-go/ext"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
	"github.com/ullbergm/startpunkt/internal/tile"
)

// Custom is the adapter for a resource type that is described in the
// settings instead of in Go: an expression says where an object is served,
// and the annotations do the rest, as for the built-in sources.
type Custom struct {
	spec    apiv1.CustomSource
	options Annotated
	url     cel.Program
	// The fallbacks for the display fields. Nil where none is given.
	name, group, icon, info cel.Program
}

// celCost bounds what one expression may do for one object. An expression
// over a single object stays far below it; one that does not is a mistake.
const celCost = 1_000_000

var (
	// Host(`a.example.com`) and Host("a.example.com"), as Traefik and
	// others write routing rules. Several hosts may be listed in one call.
	hostCall = regexp.MustCompile(`Host(?:SNI)?\(([^)]*)\)`)
	hostName = regexp.MustCompile("[`\"']([^`\"']+)[`\"']")

	resourceName = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`)
)

// hostsFromRule returns the host names a routing rule matches on, in the
// order they appear.
func hostsFromRule(rule string) []string {
	hosts := []string{}
	for _, call := range hostCall.FindAllStringSubmatch(rule, -1) {
		for _, name := range hostName.FindAllStringSubmatch(call[1], -1) {
			hosts = append(hosts, name[1])
		}
	}
	return hosts
}

// celEnv is what expressions can use: the object, the standard functions,
// the string extensions, and two helpers for routing rules.
func celEnv() (*cel.Env, error) {
	return cel.NewEnv(
		cel.Variable("object", cel.DynType),
		ext.Strings(),
		cel.Function("hostsFromRule",
			cel.Overload("hostsFromRule_string", []*cel.Type{cel.StringType}, cel.ListType(cel.StringType),
				cel.UnaryBinding(func(rule ref.Val) ref.Val {
					s, _ := rule.Value().(string)
					return types.DefaultTypeAdapter.NativeToValue(hostsFromRule(s))
				}))),
		cel.Function("hostFromRule",
			cel.Overload("hostFromRule_string", []*cel.Type{cel.StringType}, cel.StringType,
				cel.UnaryBinding(func(rule ref.Val) ref.Val {
					s, _ := rule.Value().(string)
					if hosts := hostsFromRule(s); len(hosts) > 0 {
						return types.String(hosts[0])
					}
					return types.String("")
				}))),
	)
}

// NewCustom compiles the custom sources. It fails on the first mapping
// that cannot be used, naming the mapping, the expression and what is
// wrong with it. taken lists the resource types that already have a
// source, by Type.
func NewCustom(specs []apiv1.CustomSource, taken map[string]bool) ([]Source, error) {
	if len(specs) == 0 {
		return nil, nil
	}
	env, err := celEnv()
	if err != nil {
		return nil, err
	}
	names := map[string]bool{}
	types := map[string]string{}
	var out []Source
	for i, spec := range specs {
		where := fmt.Sprintf("sources.custom[%d]", i)
		if spec.Name != "" {
			where = fmt.Sprintf("sources.custom %q", spec.Name)
		}
		fail := func(format string, args ...any) error {
			return fmt.Errorf("%s: %s", where, fmt.Sprintf(format, args...))
		}
		switch {
		case spec.Name == "":
			return nil, fail("name is required")
		case names[spec.Name]:
			return nil, fail("the name is used twice")
		case spec.Version == "":
			return nil, fail("version is required")
		case !resourceName.MatchString(spec.Resource):
			return nil, fail("resource %q is not a plural resource name such as ingressroutes", spec.Resource)
		case spec.DefaultProtocol != "" && spec.DefaultProtocol != "http" && spec.DefaultProtocol != "https":
			return nil, fail("defaultProtocol %q is not http or https", spec.DefaultProtocol)
		case strings.TrimSpace(spec.URL) == "":
			return nil, fail("url is required")
		}
		names[spec.Name] = true
		c := &Custom{spec: spec, options: Annotated{Enabled: true, OnlyAnnotated: spec.OnlyAnnotated == nil || *spec.OnlyAnnotated}}
		typ := Type(c)
		if taken[typ] {
			return nil, fail("%s has a built-in source; use that", typ)
		}
		if other, ok := types[typ]; ok {
			return nil, fail("%s is also read by %q; one source per resource type", typ, other)
		}
		types[typ] = spec.Name
		for field, target := range map[string]struct {
			expression string
			program    *cel.Program
		}{
			"url":       {spec.URL, &c.url},
			"tileName":  {spec.TileName, &c.name},
			"tileGroup": {spec.TileGroup, &c.group},
			"icon":      {spec.Icon, &c.icon},
			"info":      {spec.Info, &c.info},
		} {
			if strings.TrimSpace(target.expression) == "" {
				continue
			}
			ast, issues := env.Compile(target.expression)
			if issues != nil && issues.Err() != nil {
				return nil, fail("%s: %q does not compile: %v", field, target.expression, issues.Err())
			}
			program, err := env.Program(ast, cel.CostLimit(celCost))
			if err != nil {
				return nil, fail("%s: %q: %v", field, target.expression, err)
			}
			*target.program = program
		}
		out = append(out, c)
	}
	return out, nil
}

// Group implements Source.
func (c *Custom) Group() string { return c.spec.APIGroup }

// Resource implements Source.
func (c *Custom) Resource() string { return c.spec.Resource }

// Versions implements Source.
func (c *Custom) Versions() []string { return []string{c.spec.Version} }

// Tiles implements Source.
func (c *Custom) Tiles(obj *unstructured.Unstructured, _ Lookup) ([]tile.Tile, error) {
	// An object that is not going to be shown is not evaluated: its
	// expressions may well not fit it.
	ann := obj.GetAnnotations()
	if _, annotated := ann[annEnable]; !annotated && c.options.OnlyAnnotated {
		return nil, nil
	}
	vars := map[string]any{"object": obj.Object}
	var endpoints []endpoint
	// The url annotation replaces whatever the expression would say.
	if strings.TrimSpace(ann[annURL]) == "" {
		addresses, err := evalStrings(c.url, vars)
		if err != nil {
			return nil, fmt.Errorf("custom source %q: url: %w", c.spec.Name, err)
		}
		for _, address := range addresses {
			address = strings.TrimSpace(address)
			switch {
			case address == "":
			case strings.Contains(address, "://"):
				if !strings.HasPrefix(address, "http://") && !strings.HasPrefix(address, "https://") {
					return nil, fmt.Errorf("custom source %q: url: %q is not an http or https address", c.spec.Name, address)
				}
				endpoints = append(endpoints, endpoint{url: address})
			default:
				host, path, _ := strings.Cut(address, "/")
				if path != "" {
					path = "/" + path
				}
				endpoints = append(endpoints, endpoint{host: host, path: path})
			}
		}
	}
	protocol := c.spec.DefaultProtocol
	if protocol == "" {
		protocol = "http"
	}
	return annotatedTilesWith(obj, c.options, protocol, endpoints, func() (display, error) {
		var d display
		for field, target := range map[string]struct {
			program cel.Program
			into    *string
		}{
			"tileName": {c.name, &d.name}, "tileGroup": {c.group, &d.group}, "icon": {c.icon, &d.icon}, "info": {c.info, &d.info},
		} {
			if target.program == nil {
				continue
			}
			values, err := evalStrings(target.program, vars)
			if err != nil {
				return d, fmt.Errorf("custom source %q: %s: %w", c.spec.Name, field, err)
			}
			if len(values) > 0 {
				*target.into = values[0]
			}
		}
		return d, nil
	})
}

// evalStrings runs an expression that is meant to give a string or a list
// of strings.
func evalStrings(program cel.Program, vars map[string]any) ([]string, error) {
	out, _, err := program.Eval(vars)
	if err != nil {
		return nil, err
	}
	switch value := out.Value().(type) {
	case string:
		return []string{value}, nil
	case nil:
		return nil, nil
	}
	list, err := out.ConvertToNative(reflect.TypeOf([]string{}))
	if err != nil {
		return nil, errors.New("the expression must give a string or a list of strings, not " + out.Type().TypeName())
	}
	return list.([]string), nil
}
