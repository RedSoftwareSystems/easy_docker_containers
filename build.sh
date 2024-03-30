#!/bin/bash

# Simple bash script to build the GNOME Shell extension
echo "Zipping the extension..."
glib-compile-schemas schemas
zip -r easy_docker_containers@red.software.systems.zip . -x *.git* -x *.idea* -x *.history* -x *.*~ -x *.sh -x *.vscode/*
echo "Building is done."
