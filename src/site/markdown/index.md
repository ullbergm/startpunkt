<h1 align="center">Startpunkt</h1>
<p align="center">
  <i>Startpunkt is a clean start page designed to display links to all your self-hosted resources in your kubernetes cluster.</i>
  <br/><br/>
  <img src="https://raw.githubusercontent.com/ullbergm/startpunkt/main/docs/images/screenshot.png" alt="Startpunkt" width="50%"/>
</p>

## 🎯 Features

- 🔐 **Local execution**. Everything is executed locally on your cluster.
- ⚡ **Automatic**. Services are automatically added / removed as they are deployed to the cluster.
- 🗂️ **Service Groups**. Group services by namespace or custom groups.
- 🏷️ **Bookmarks**. Create a list of bookmarks using CRDs.
- 👌 **GitOps Ready**. Manage the services and bookmarks using CRDs and the rest of the application is configured with YAML.
- ⚡ **Integrated**. Supports displaying services defined in
  - Startpunkt annotations/CRDs
  - Kubernetes Ingress
  - OpenShift Routes
  - Hajimari CRDs
  - Istio VirtualServices.
  - GatewayAPI HTTPRoutes.
- 🚀 **Fast**. Using Quarkus natively compiled binaries makes them really fast.
- 🌎 **Internationalized**. Supports multiple languages.
- 🎨 **Themes**. Supports themes.

## 👌 Built With

### [Quarkus](https://quarkus.io/)

Quarkus provides a way to compile the java code to native binaries, making the container really small and quick to start up.

It also provides several libraries that simplify the development immensely.
- Rest client
- Kubernetes client
- Caching
- Health checks
- Prometheus monitoring
- Deploying a static website builder in the same application

### [Vite](https://vitejs.dev)

### [Preact](https://preactjs.com)

### [Bootstrap](https://getbootstrap.com/)

## 🏆 Authors & contributors

The original setup of this repository is by [Magnus Ullberg](https://github.com/ullbergm).

For a full list of all authors and contributors, see [the contributors page](https://github.com/ullbergm/startpunkt/contributors).

## 🌎 Acknowledgements

- [SUI](https://github.com/jeroenpardon/sui)
- [Hajimari](https://hajimari.io/)
- [Forecastle](https://github.com/stakater/Forecastle)
