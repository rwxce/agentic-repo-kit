#!/usr/bin/env bash
# WHAT: Setup script for a fresh checkout or parallel worktree (Conductor, git worktree, Codespaces,
#   a Claude Code worktree hook): install deps, run codegen, then build/copy the code index in the
#   background WITHOUT ever failing setup.
# REPO SIGNAL: several parallel worktrees per repo, a code-index/graph tool, generated code needed
#   before typecheck.
# CONFIGURE: INSTALL_CMD, CODEGEN_CMD, INDEX_* below. Hook it into your worktree tool's "setup" or
#   a package.json "setup" script. Idempotent: safe to re-run.
set -o pipefail

INSTALL_CMD="${INSTALL_CMD:-pnpm install}"
CODEGEN_CMD="${CODEGEN_CMD:-}"                     # e.g. "pnpm exec <tool> codegen"; empty = skip
INDEX_DIR="${INDEX_DIR:-<index-out-dir>}"          # e.g. graphify-out
INDEX_FILE="${INDEX_FILE:-<index-out-dir>/graph.json}"   # file whose existence means "index is built"
INDEX_UPDATE_CMD="${INDEX_UPDATE_CMD:-<tool> update .}"  # incremental refresh
INDEX_BUILD_CMD="${INDEX_BUILD_CMD:-<tool> extract . --code-only}" # full build

setup_failed=0

# --- 1. Dependencies (blocking) ---------------------------------------------------------------
# Hard-won: a half-downloaded package-store entry makes every later install fail the same way.
# Detect the corrupted entry in the log, delete just that, retry once.
install_log="$(mktemp)"
if ! $INSTALL_CMD 2>&1 | tee "$install_log"; then
  broken="$(grep -oE 'node_modules/\.pnpm/[^/]+' "$install_log" | head -1)"
  if [ -n "$broken" ]; then
    echo "Corrupted store entry $broken -- removing and retrying once"
    rm -rf "$broken"
    $INSTALL_CMD || setup_failed=1
  else
    setup_failed=1
  fi
fi
rm -f "$install_log"

# --- 2. Codegen hook point (blocking) -----------------------------------------------------------
# Generated types the typechecker needs. Run it against the dev environment's config, never an
# anonymous local backend that rewrites .env.local behind your back.
if [ -n "$CODEGEN_CMD" ]; then
  $CODEGEN_CMD || setup_failed=1
fi

[ "$setup_failed" = "1" ] && exit 1

# --- 3. Code index (strictly best effort: nothing below may fail setup) --------------------------
(
  set +e
  mkdir -p .context
  command -v "${INDEX_BUILD_CMD%% *}" >/dev/null 2>&1 || { echo "index tool not installed -- skipping (non-blocking)"; exit 0; }

  # Main checkout = the first worktree. Its index is the shared seed for every other worktree.
  main_root="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)")"
  here="$(pwd -P)"
  log="$here/.context/index-setup.log"

  if [ -n "$main_root" ] && [ "$main_root" != "$here" ] && [ -f "$main_root/$INDEX_FILE" ]; then
    # Copy the main checkout's index, then refresh incrementally in the background.
    rm -rf "./$INDEX_DIR" && cp -R "$main_root/$INDEX_DIR" "./$INDEX_DIR" 2>/dev/null
    nohup sh -c "$INDEX_UPDATE_CMD" >"$log" 2>&1 &
  else
    # No index anywhere: build here, then seed the main checkout so future worktrees copy it.
    nohup sh -c '
      '"$INDEX_BUILD_CMD"' &&
      if [ -n "$1" ] && [ "$1" != "$2" ] && [ ! -f "$1/'"$INDEX_FILE"'" ] && [ -f "'"$INDEX_FILE"'" ]; then
        rm -rf "$1/'"$INDEX_DIR"'" && cp -R "'"$INDEX_DIR"'" "$1/'"$INDEX_DIR"'"
      fi
    ' sh "$main_root" "$here" >"$log" 2>&1 &
  fi
) || true

exit 0
