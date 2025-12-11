#!/bin/bash
set -e

# Create .kube directory if it doesn't exist
mkdir -p $HOME/.kube

# Generate oc completion script
oc completion bash > $HOME/.kube/completion.bash.inc

# Add source command to .bashrc if not already present
if ! grep -q "completion.bash.inc" $HOME/.bashrc; then
    echo "" >> $HOME/.bashrc
    echo "# oc shell completion" >> $HOME/.bashrc
    echo "source '$HOME/.kube/completion.bash.inc'" >> $HOME/.bashrc
fi
