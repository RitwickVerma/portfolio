#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit): eslint on the edited TS/JS file (the repo flat config).
# Only the edited file, only inside this repo. Exit 0 when clean or when the tool is missing;
# exit 2 (output goes to Claude) only on a real error in that file.
set -uo pipefail
command -v jq >/dev/null 2>&1 || exit 0
input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -n "$f" ] && [ -f "$f" ] || exit 0
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$f" in "$root"/*) ;; *) exit 0 ;; esac
cd "$root" || exit 0
fail() { { echo "$1"; printf '%s\n' "$2"; } >&2; exit 2; }

case "$f" in
*.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.mts) ;;
*) exit 0 ;;
esac
[ -x node_modules/.bin/eslint ] || exit 0   # deps not installed: nothing to run, not an error in the file
out=$(node_modules/.bin/eslint --no-warn-ignored "$f" 2>&1)
rc=$?
# eslint: 0 clean, 1 lint errors, 2 config/internal failure (not this file's fault)
[ "$rc" -eq 1 ] && fail "eslint errors in $f" "$out"
exit 0
