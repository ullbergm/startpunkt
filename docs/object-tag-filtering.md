# Tag filtering

Tags decide which tiles a visitor sees, by the address they open. One instance can then serve several views: one for everyone, one for administrators, one for developers.

## The rule

- A tile without tags is always shown.
- A tile with tags is shown when at least one of its tags is in the path of the address.

| Address | Shown |
| --- | --- |
| `https://start.example.com/` | Untagged tiles only |
| `https://start.example.com/admin` | Untagged tiles, and tiles tagged `admin` |
| `https://start.example.com/admin,dev` | Untagged tiles, and tiles tagged `admin` or `dev` |

The first segment of the path is the filter. Tags are separated by commas and compared without regard to case.

## Tagging a tile

On an annotated resource, such as an Ingress, a Route, an HTTPRoute or a VirtualService, tags are a comma-separated annotation:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: admin-dashboard
  annotations:
    startpunkt.ullberg.us/enable: "true"
    startpunkt.ullberg.us/tags: "admin,dev"
spec:
  # ...
```

On an `Application`, they are a field of the spec, in the same form:

```yaml
apiVersion: startpunkt.ullberg.us/v1
kind: Application
metadata:
  name: registry
  namespace: startpunkt
spec:
  name: Registry
  group: Infrastructure
  url: https://registry.example.com
  tags: "admin"
```

Bookmarks have no tags and are always shown.

## Not access control

Tags keep the page tidy. They do not hide anything from anyone: the instance sends every tile to every browser, the page applies the filter, and any visitor can open any path. To restrict who can see a service, protect the service itself, and put an authenticating proxy in front of Startpunkt if the list of services is sensitive.

## Several clusters

A [remote](../README.md#several-clusters-on-one-page) can be limited by tag as well, with `include.tags` and `exclude.tags` on the `Remote` resource. That filter is applied by the instance, so tiles it leaves out never reach the browser.
