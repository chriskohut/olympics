#!/bin/zsh
set -euo pipefail

ROOT_DIR="/Users/chris/olympics"
NODE_BIN="/opt/homebrew/bin/node"
AWS_BIN="/opt/homebrew/bin/aws"
BUCKET="s3://kolympics"

cd "$ROOT_DIR"

"$NODE_BIN" "$ROOT_DIR/update-medals.js"

"$AWS_BIN" s3 sync "$ROOT_DIR" "$BUCKET" \
  --exclude "*" \
  --include "index.html" \
  --include "styles.css" \
  --include "script.js" \
  --include "pool.json" \
  --include "pool.js"
