#!/bin/bash

# Simple bash script to build the GNOME Shell extension.
# Only runtime files are packed; docs and screenshots are left out.
set -e
cd "$(dirname "$0")"

ZIP=easy_docker_containers@red.software.systems.zip

echo "Zipping the extension..."
glib-compile-schemas schemas
rm -f "$ZIP"
zip -r "$ZIP" \
  metadata.json \
  extension.js \
  prefs.js \
  stylesheet.css \
  src \
  icons \
  schemas \
  -x "schemas/gschemas.compiled" -x "*.*~"
echo "Building is done."
