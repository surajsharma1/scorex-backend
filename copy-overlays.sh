#!/bin/bash
set -e

SRC="../../scorex-frontend/scorex-frontend/public/overlays"
DEST="public/overlays"

echo "📁 Copying overlays from $SRC to $DEST"

mkdir -p "$DEST"
cp -r "$SRC"/* "$DEST"/

echo "✅ Copied $(ls -1 "$DEST" | wc -l) overlay files"
ls -la "$DEST" | head -10

