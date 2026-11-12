# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 5.x | Yes |
| 4.x and older | No. See [Migrating from 4.x](migrating-from-4.x.md). |

Fixes are made on `main` and released as a new 5.x version.

## Reporting a vulnerability

Please do not report a vulnerability in a public issue or discussion.

1. Report it privately, with [GitHub's private vulnerability reporting](https://github.com/ullbergm/startpunkt/security/advisories/new) or one of the contact options on [the maintainer's GitHub profile](https://github.com/ullbergm).
2. Describe the vulnerability: the version, how the instance is deployed, and the steps that show the problem.

   If you have a fix, that is most welcome. Attach or summarize it in your message.

3. We will evaluate the report and, if necessary, release a fix or mitigating steps. We will let you know the outcome and credit you in the report.

   Please **do not disclose the vulnerability publicly** until a fix is released.

4. Once we have either published a fix or declined to address the vulnerability, you are free to disclose it.

## What to expect from an instance

These are properties of the design, not vulnerabilities:

- Reading is open. Anyone who can reach the page sees every tile, including tiles that a [tag filter](object-tag-filtering.md) leaves out of a view. Put an authenticating proxy in front of an instance whose list of services is sensitive.
- The edit key is one shared secret. Everyone who has it can create, change and delete `Application` and `Bookmark` resources in the namespaces the instance reads.
- The instance sends a request to the address of every application it shows, from inside the cluster. Whoever may create an `Application` or annotate a Route or an Ingress decides where those requests go. Nothing from the answers is shown.
