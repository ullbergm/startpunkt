FROM mcr.microsoft.com/devcontainers/java:3-21-bookworm

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install OpenShift CLI (oc)
RUN curl -LO https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux.tar.gz \
    && tar -xvf openshift-client-linux.tar.gz oc \
    && mv oc /usr/local/bin/ \
    && rm openshift-client-linux.tar.gz

# Install pre-commit and bash-completion
# Remove the Yarn repository as its GPG key is expired/unavailable
RUN rm -f /etc/apt/sources.list.d/yarn.list \
    && apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends pre-commit bash-completion
