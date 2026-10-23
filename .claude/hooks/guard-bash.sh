#!/usr/bin/env bash
# PreToolUse(Bash) guard: blocks git push to master/main, wrangler deploy/publish, and MR merges (a push to master auto-deploys the site).
# Reads the hook JSON on stdin; exit 2 (stderr goes to Claude) blocks the command.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib-cmd.sh
source "$HERE/lib-cmd.sh"

command -v jq >/dev/null 2>&1 || { echo "guard-bash: jq is missing, command not checked" >&2; exit 1; }
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
[ -n "$cwd" ] || cwd=$(pwd)

block() {
    {
        echo "BLOCKED: $1"
        echo "  command segment: $2"
        echo "  Work on a branch; the owner merges. CI deploys with CLOUDFLARE_API_TOKEN, never run wrangler locally."
    } >&2
    exit 2
}

while IFS= read -r seg; do
    [ -n "$seg" ] || continue
    parse_seg "$seg"
    [ -n "$PROG" ] || continue
    if reason=$(git_push_reason 'master|main' "$cwd"); then
        block "$reason. A push to master deploys the site to production (AGENTS.md). Push a branch and open an MR." "$seg"
    fi
    case "$PROG" in
    wrangler)
        has_arg deploy publish && block "wrangler deploy/publish ships to Cloudflare production. Deploys go through the CI deploy job on master." "$seg"
        ;;
    glab)
        [ "${ARGS[0]:-}" = mr ] && has_arg merge && block "merging an MR into master triggers the production deploy; the owner merges" "$seg"
        ;;
    gh)
        [ "${ARGS[0]:-}" = pr ] && has_arg merge && block "merging a PR into master triggers the production deploy; the owner merges" "$seg"
        ;;
    esac
done < <(printf '%s\n' "$cmd" | all_segments)
exit 0
