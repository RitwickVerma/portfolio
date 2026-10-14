#!/bin/sh
# Writes the homelab status file the site reads at /status.json.
#
# Runs on the Proxmox host (needs `pct` and `qm`). Emits one JSON document:
# host uptime and 1-minute load, plus every guest's id, state and uptime.
# Nothing else — no names, addresses, ports or versions. The ids are the
# CT/VM numbers already printed on the page.
#
# Install (host):
#   install -m 0755 status-producer.sh /usr/local/bin/portfolio-status
#   crontab:  */5 * * * *  /usr/local/bin/portfolio-status 114 /var/www/status/status.json
#
# The second argument is the path *inside* the web container (first argument)
# where the file lands via `pct push`. Serve it from nginx on that container
# OUTSIDE the deploy root, so a rebuild cannot delete it:
#
#   location = /status.json {
#       alias /var/www/status/status.json;
#       add_header Cache-Control "no-store";
#       add_header Access-Control-Allow-Origin "https://www.ritwickverma.dev";
#   }
#
# Schema is `schema: 1`; the site rejects anything else (src/lib/status.ts).

set -eu

WEB_CT="${1:?web container id, e.g. 114}"
DEST="${2:?destination path inside the web container}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

now_iso="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
host_uptime="$(cut -d. -f1 /proc/uptime)"
host_load="$(cut -d' ' -f1 /proc/loadavg)"

# Uptime of a running guest, in seconds, or empty if it cannot be read.
ct_uptime() { pct exec "$1" -- cut -d. -f1 /proc/uptime 2>/dev/null || true; }
vm_uptime() { qm status "$1" --verbose 2>/dev/null | awk '/^uptime:/ {print $2}' || true; }

{
  printf '{"schema":1,"generatedAt":"%s","host":{"uptimeSeconds":%s,"load1":%s},"guests":[' \
    "$now_iso" "$host_uptime" "$host_load"
  first=1
  # pct list: VMID Status Lock Name — qm list: VMID NAME STATUS MEM BOOTDISK PID
  { pct list | awk 'NR>1 {print "CT" $1, $2}'; qm list | awk 'NR>1 {print "VM" $1, $3}'; } |
  sort |
  while read -r id state; do
    [ "$first" = 1 ] || printf ','
    first=0
    case "$state" in
      running)
        vmid="${id#??}"
        case "$id" in CT*) up="$(ct_uptime "$vmid")";; *) up="$(vm_uptime "$vmid")";; esac
        if [ -n "$up" ]; then
          printf '{"id":"%s","state":"running","uptimeSeconds":%s}' "$id" "$up"
        else
          printf '{"id":"%s","state":"running"}' "$id"
        fi
        ;;
      *)
        printf '{"id":"%s","state":"stopped"}' "$id"
        ;;
    esac
  done
  printf ']}\n'
} > "$TMP"

# Refuse to publish anything that is not valid JSON.
python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$TMP"

pct push "$WEB_CT" "$TMP" "$DEST" --perms 0644
