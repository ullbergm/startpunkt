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

## Release Process

Startpunkt uses GitHub Actions to automate the release process. To create a new release:

1. Navigate to the [Actions tab](https://github.com/ullbergm/startpunkt/actions/workflows/perform-release.yml) in the repository
2. Click "Run workflow" on the "Perform Release" workflow
3. Select the release type:
   - **patch**: Increments the patch version (e.g., 2.1.0 → 2.1.1)
   - **minor**: Increments the minor version (e.g., 2.1.0 → 2.2.0)
   - **major**: Increments the major version (e.g., 2.1.0 → 3.0.0)
   - **custom**: Allows you to specify a custom version number
4. If you selected "custom", enter the desired version number (e.g., 2.3.0)
5. Click "Run workflow"

The workflow will:
- Calculate the release version based on your selection
- Run `mvnw release:prepare` to prepare the release
- Run `mvnw release:perform` to complete the release
- Push the release tag to the repository
- Trigger the automatic GitHub release creation with changelog

**Note**: Only maintainers with write access can trigger releases.

### Automated Changelog Generation

When a new version tag (e.g., `v2.2.4`) is pushed to the repository, the Release workflow automatically:

1. Collects all merged pull requests since the last release
2. Categorizes them based on conventional commit types in PR titles
3. Generates a structured changelog
4. Creates a GitHub release with the changelog

**Changelog Categories:**

The changelog groups changes into the following categories based on the conventional commit type:

- 🚀 **Features** (`feat:`) - New features and enhancements
- 🐛 **Fixes** (`fix:`) - Bug fixes
- 📚 **Documentation** (`docs:`) - Documentation changes
- 🔨 **Refactoring** (`refactor:`) - Code refactoring
- 🧪 **Tests** (`test:`) - Test additions or modifications
- 📦 **Dependencies** (`chore:`) - Dependency updates and maintenance
- ⚙️ **CI/CD** (`ci:`) - CI/CD workflow changes
- 🎨 **Styling** (`style:`) - Code style changes
- ⚡ **Performance** (`perf:`) - Performance improvements
- 🔧 **Build** (`build:`) - Build system changes
- ↩️ **Reverts** (`revert:`) - Reverted changes

**Best Practices for PR Titles:**

To ensure your contributions are properly categorized in the changelog:

1. Use conventional commit format in your PR titles: `type(scope): description`
2. Choose the appropriate type from the list above
3. Keep the description clear and concise
4. Examples:
   - `feat(api): add theme customization endpoint`
   - `fix(ui): correct bookmark sorting order`
   - `docs(readme): update installation instructions`
   - `chore(deps): bump quarkus to 3.8.0`

The changelog configuration is maintained in `.github/workflows/changelog/configuration.json`.

## Documentation Workflows

### Screenshot Generation

Startpunkt includes an automated workflow for capturing screenshots of all application features for documentation purposes.

**Workflow**: `.github/workflows/capture-screenshots.yml`

The screenshot workflow:
- Builds the application in JVM mode
- Sets up a KinD (Kubernetes in Docker) cluster with sample data
- Uses Playwright to capture 22+ screenshots showing:
  - Main application views
  - Spotlight search functionality
  - Settings panels (layout, background, accessibility)
  - Theme variations (light/dark)
  - Accessibility features (high contrast, font scaling)
  - Responsive views (mobile, tablet, desktop)

**Running the Workflow:**

1. **Manual Trigger**: 
   - Go to [Actions → Capture Feature Screenshots](https://github.com/ullbergm/startpunkt/actions/workflows/capture-screenshots.yml)
   - Click "Run workflow"
   - Choose whether to commit screenshots to the repository
   - Screenshots are always saved as artifacts (90-day retention)

2. **Scheduled Execution**:
   - Runs automatically on the 1st of each month at 2am UTC
   - Screenshots are committed to `docs/images/features/`

**Local Screenshot Capture:**

To capture screenshots locally during development:

```sh
# Navigate to screenshot scripts directory
cd .github/workflows/screenshot-scripts

# Install dependencies
npm install

# Start your Startpunkt application (ensure it's running on port 8080)
./mvnw quarkus:dev  # In another terminal

# Capture screenshots
export APP_URL=http://localhost:8080
node capture-screenshots.js
```

Screenshots will be saved to `.github/workflows/screenshot-scripts/screenshots/`.



