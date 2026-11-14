# Secondary tile links

A tile can carry up to eight named links, such as documentation, logs or its deployment. They appear below the tile's main link and can be reached independently with the keyboard. A combined card shows links from each member, labelled with its cluster. Links follow the tile's `targetBlank` setting.

An Application or Bookmark declares them in `spec.links`:

```yaml
apiVersion: startpunkt.ullberg.us/v1
kind: Application
metadata:
  name: grafana
spec:
  name: Grafana
  url: https://grafana.example.com
  links:
    - name: Documentation
      url: https://grafana.com/docs/
    - name: Logs
      url: https://logs.example.com/grafana
```

Other source types declare the same list as JSON in an annotation:

```yaml
metadata:
  annotations:
    startpunkt.ullberg.us/enable: "true"
    startpunkt.ullberg.us/links: >-
      [{"name":"Documentation","url":"https://docs.example.com"},
       {"name":"Logs","url":"https://logs.example.com"}]
```

The annotation works for built-in annotated sources and CEL mappings. An Application or Bookmark can use it too when `spec.links` is absent. An explicit `spec.links: []` clears the links instead of using the annotation.

Each link needs a nonempty name of at most 80 bytes and an absolute HTTP or HTTPS address of at most 4096 bytes. A malformed annotation or invalid link is reported as a source error, and that object's tiles are omitted. The edit API checks the same limits. Secondary addresses are not probed.

The optional `links` array is part of the `/api/v1` tile contract and is preserved through split mode and federation. Clients that do not know it can ignore it.

## Editing inherited links

The editor shows annotation links even when `spec.links` is absent. They are read-only until **Override** copies them into the spec. Removing every overridden link saves an explicit empty list. **Use annotation links** removes the spec override and restores inheritance.

Resource reads return the annotation preview as `inheritedLinks`, independently of the current spec override. An invalid annotation returns `inheritedLinksError` instead. The editor shows that error as text and disables resetting to the invalid annotation; a valid spec override can still be edited. The server returns 400 if a write would remove the override while the annotation is invalid. These controls change `spec.links`, not the annotation.
