# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue, email, or any other method with the owners of this repository before making a change.
Please note we have a [code of conduct](CODE_OF_CONDUCT.md), please follow it in all your interactions with the project.

<!--
## Development environment setup

> **[?]**
> Proceed to describe how to setup local development environment.
> e.g:

To set up a development environment, please follow these steps:

1. Clone the repo

   ```sh
   git clone https://github.com/ullbergm/startpunkt
   ```

2. TODO
-->

## Development environment setup

To set up a development environment, please follow these steps:

1. Clone the repo

   ```sh
   git clone https://github.com/ullbergm/startpunkt
   ```

2. Build and run the project

   For combined backend + frontend development:

   ```sh
   ./mvnw quarkus:dev
   ```

   For frontend-only development:

   ```sh
   cd src/main/webui
   npm install
   npm run dev
   ```

   For full verification (including tests):

   ```sh
   ./mvnw verify
   ```

**Note on Package Manager:** This project uses **npm** as the canonical package manager. Quarkus Quinoa and the frontend-maven-plugin are both configured to use npm. The project maintains only `package-lock.json` (not pnpm or yarn lockfiles).

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
