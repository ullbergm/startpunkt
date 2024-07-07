<h1 align="center">Startpunkt</h1>
<p align="center">
  <i>Startpunkt is a clean startpstart page unkt designed to display links to all your self-hosted resources in your kubernetes cluster.</i>
  <br/><br/>
  <img width="130" alt="Startpunkt" src="https://raw.githubusercontent.com/ullbergm/startpunkt/main/docs/images/logo.png"/>
  <br/><br/>
  <a href="https://github.com/ullbergm/startpunkt/blob/main/CHANGELOG.md"><img src="https://img.shields.io/github/v/release/ullbergm/startpunkt?style=flat-square&logo=hackthebox&color=609966&logoColor=fff" alt="Current Version"/></a>
  <a target="_blank" href="https://github.com/ullbergm/startpunkt"><img src="https://img.shields.io/github/last-commit/ullbergm/startpunkt?style=flat-square&logo=github&color=609966&logoColor=fff" alt="Last commit"/></a>
  <a href="https://github.com/ullbergm/startpunkt/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-609966?style=flat-square&logo=opensourceinitiative&logoColor=fff" alt="License MIT"/></a>
  <a href="https://github.com/ullbergm/startpunkt/actions/workflows/schedule-link-checker.yml"><img src="https://img.shields.io/github/actions/workflow/status/ullbergm/startpunkt/schedule-link-checker.yml?style=flat-square&color=609966&logoColor=fff&label=links" alt="Link checker"/></a>
  <br/>
  <a href="https://github.com/ullbergm/startpunkt/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22"><img src="https://img.shields.io/badge/PRs-welcome-ff69b4.svg?style=flat-square&color=609966&logoColor=fff&label=PRs" alt="Pull Requests welcome"/></a>
  <a href="https://buymeacoffee.com/magnus.ullberg"><img src="https://img.shields.io/badge/Buy%20me%20a-coffee-ff1414.svg?style=flat-square&color=aa1414&logoColor=fff&label=Buy%20me%20a" alt="buy me a coffee"/></a>
  <a href="https://ullberg.us/cv.pdf"><img src="https://img.shields.io/badge/Offer%20me%20a-job-00d414.svg?style=flat-square&color=0000f4&logoColor=fff&label=Offer%20me%20a" alt="offer me a job"/></a>
  <br/><br/>
  <a href="https://github.com/ullbergm/startpunkt/issues/new?assignees=&labels=bug&template=01_BUG_REPORT.md&title=bug%3A+">Report a Bug</a> ·
  <a href="https://github.com/ullbergm/startpunkt/issues/new?assignees=&labels=enhancement&template=02_FEATURE_REQUEST.md&title=feat%3A+">Request a Feature</a> ·
  <a href="https://github.com/ullbergm/startpunkt/discussions">Ask a Question</a>
  <br/><br/>
  <img src="https://raw.githubusercontent.com/ullbergm/startpunkt/main/docs/images/screenshot.png" alt="Startpunkt" width="80%"/>
</p>

<details open="open">
<summary>Table of Contents</summary>

- [🎯 Features](#-features)
- [🚀 Getting started](#-getting-started)
  - [Helm](#helm)
  - [Kubectl](#kubectl)
- [👌 Built With](#-built-with)
    - [Quarkus](#quarkus)
    - [Vite](#vite)
    - [Preact](#preact)
    - [Bootstrap](#bootstrap)
- [🗂️ Roadmap](#️-roadmap)
- [🏷️ Support](#️-support)
- [🚀 Project assistance](#-project-assistance)
- [🗂️ Contributing](#️-contributing)
- [🏆 Authors \& contributors](#-authors--contributors)
- [🗂️ Security](#️-security)
- [📄 License](#-license)
- [🌎 Acknowledgements](#-acknowledgements)

</details>

## 🎯 Features

* 🔐 **Local execution**. Everything is executed locally on your cluster.
* ⚡ **Automatic**. Services are automatically added / removed as they are deployed to the cluster.
* 🗂️ **Service Groups**. Group services by namespace or custom groups.
* 🏷️ **Bookmarks**. Create a list of bookmarks using CRDs.
* 👌 **GitOps Ready**. Manage the services and bookmarks using CRDs and the rest of the application is configured with YAML.
* 🚀 **Fast**. Using Quarkus natively compiled binaries makes them really fast.
<!-- * 🌎 **Internationalized**. Supports multiple languages. -->
<!-- * 🎨 **Themes**. Supports themes. -->

---

## 🚀 Getting started

### Helm

A simple helm chart is available in the repo that you can use to deploy the application.

```shell
git clone https://github.com/ullbergm/startpunkt.git

helm .....
```

### Kubectl

They kubectl yaml needed is included in the repo.

```shell
kubectl apply -f https://raw.githubusercontent.com/ullbergm/startpunkt/main/deploy/startpunkt.yaml
```

## 👌 Built With

#### [Quarkus](https://quarkus.io/)

Quarkus provides a way to compile the java code to native binaries, making the container really small and quick to start up.

It also provides several libraries that simplify the development immensely.
* Rest client
* Kubernetes client
* Caching
* Health checks
* Prometheus monitoring
* Deploying a static website builder in the same application

#### [Vite](https://vitejs.dev)
#### [Preact](https://preactjs.com)
#### [Bootstrap](https://getbootstrap.com/)

## 🗂️ Roadmap

See the [open issues](https://github.com/ullbergm/startpunkt/issues) for a list of proposed features (and known issues).

- [Top Feature Requests](https://github.com/ullbergm/startpunkt/issues?q=label%3Aenhancement+is%3Aopen+sort%3Areactions-%2B1-desc) (Add your votes using the 👍 reaction)
- [Top Bugs](https://github.com/ullbergm/startpunkt/issues?q=is%3Aissue+is%3Aopen+label%3Abug+sort%3Areactions-%2B1-desc) (Add your votes using the 👍 reaction)
- [Newest Bugs](https://github.com/ullbergm/startpunkt/issues?q=is%3Aopen+is%3Aissue+label%3Abug)

## 🏷️ Support

Reach out to the maintainer at one of the following places:

- [GitHub Discussions](https://github.com/ullbergm/startpunkt/discussions)
- Contact options listed on [this GitHub profile](https://github.com/ullbergm)

## 🚀 Project assistance

If you want to say **thank you** or/and support active development of Startpunkt:

- Add a [GitHub Star](https://github.com/ullbergm/startpunkt) to the project.
- Buy me a [coffee](https://buymeacoffee.com/magnus.ullberg).

## 🗂️ Contributing

First off, thanks for taking the time to contribute! Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make will benefit everybody else and are **greatly appreciated**.

Please read [our contribution guidelines](docs/CONTRIBUTING.md), and thank you for being involved!

## 🏆 Authors & contributors

The original setup of this repository is by [Magnus Ullberg](https://github.com/ullbergm).

For a full list of all authors and contributors, see [the contributors page](https://github.com/ullbergm/startpunkt/contributors).

## 🗂️ Security

Startpunkt follows good practices of security, but 100% security cannot be assured.
Startpunkt is provided **"as is"** without any **warranty**. Use at your own risk.

_For more information and to report security issues, please refer to our [security documentation](docs/SECURITY.md)._

## 📄 License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) for more information.

## 🌎 Acknowledgements

* [SUI](https://github.com/jeroenpardon/sui)
* [Hajimari](https://hajimari.io/)
* [Forecastle](https://github.com/stakater/Forecastle)
