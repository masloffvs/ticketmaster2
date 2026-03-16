#!/usr/bin/env zsh
set -euo pipefail

TARGET="bun-linux-x64"
BINS_DIR="bins"

echo "[builder] cleaning $BINS_DIR/"
rm -rf "$BINS_DIR"
mkdir -p "$BINS_DIR"

echo "[builder] compiling workerslayer -> $TARGET"
bun build --compile --target=$TARGET --outfile=$BINS_DIR/workerslayer.bin workerslayer/index.ts

echo "[builder] compiling serverlayer -> $TARGET"
bun build --compile --target=$TARGET --outfile=$BINS_DIR/server.bin serverlayer/src/index.ts

echo "[builder] building weblayer static"
pushd weblayer
rm -rf dist
bun run build
popd
mv weblayer/dist $BINS_DIR/weblayer

echo "[builder] done"
ls -lh $BINS_DIR/server.bin $BINS_DIR/workerslayer.bin
echo "[builder] weblayer assets: $(ls $BINS_DIR/weblayer | wc -l) files"