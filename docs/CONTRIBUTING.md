# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue, email, or any other method with the owners of this repository before making a change.
Please note we have a [code of conduct](CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

## Development environment setup

You need Go and Node.js with npm. Helm is needed for the chart checks, and Docker and kind for the test of the move from 4.x.

1. Clone the repo

   ```sh
   git clone https://github.com/ullbergm/startpunkt
   ```

2. Build and run the project

   The binary serves the page that is built into it, and reads the cluster your `kubectl` points at:

   ```sh
   make build
   bin/startpunkt
   ```

   To work on the page, start the frontend's development server next to it. It reloads on every change and passes `/api` on to the binary:

   ```sh
   cd web
   npm install
   npm run dev
   ```

   Before you send a change, run the checks:

   ```sh
   make check
   ```

   After changing the types in `api/v1`, regenerate the custom resource definitions with `make crds` and commit the result.

The layout of the code and the rules it follows are in [AGENTS.md](../AGENTS.md), and the design with its reasons in [v5-design.md](v5-design.md).

**Note on Package Manager:** This project uses **npm**. It maintains only `package-lock.json`, not pnpm or yarn lockfiles.

## Issues and feature requests

You've found a bug in the source code, a mistake in the documentation or maybe you'd like a new feature?Take a look at [GitHub Discussions](https://github.com/ullbergm/startpunkt/discussions) to see if it's already being discussed.  You can help us by [submitting an issue on GitHub](https://github.com/ullbergm/startpunkt/issues). Before you create an issue, make sure to search the issue archive -- your issue may have already been addressed!

Please try to create bug reports that are:

- _Reproducible._ Include steps to reproduce the problem.
- _Specific._ Include as much detail as possible: which version, what environment, etc.
- _Unique._ Do not duplicate existing opened issues.
- _Scoped to a Single Bug._ One bug per report.

**Even better: Submit a pull request with a fix or new feature!**

### How to submit a Pull Request

1. Search our repository for open or closed
   [Pull Requests](https://github.com/ullbergm/startpunkt/pulls)
   that relate to your submission. You don't want to duplicate effort.
2. Fork the project
3. Create your feature branch (`git checkout -b feat/amazing_feature`)
4. Commit your changes (`git commit -m 'feat: add amazing_feature'`) Startpunkt uses [conventional commits](https://www.conventionalcommits.org), so please follow the specification in your commit messages.
5. Push to the branch (`git push origin feat/amazing_feature`)
6. [Open a Pull Request](https://github.com/ullbergm/startpunkt/compare?expand=1)

## Release Process

A release is a tag. Pushing a tag such as `v5.1.0` runs the Release workflow, which

- runs the checks,
- builds the image for amd64 and arm64 and pushes it to `ghcr.io/ullbergm/startpunkt`,
- packages the chart with the tag's version and pushes it to `oci://ghcr.io/ullbergm/charts/startpunkt`,
- creates the GitHub release, with notes generated from the pull requests merged since the last one.

A tag with a suffix, such as `v5.1.0-rc.1`, becomes a pre-release and leaves the `latest` tag of the image where it is.

Only maintainers with write access can push tags.

**Pull request titles** end up in the release notes, so write them as [conventional commits](https://www.conventionalcommits.org): `type(scope): description`, for example

- `feat(api): add theme customization endpoint`
- `fix(ui): correct bookmark sorting order`
- `docs(readme): update installation instructions`
