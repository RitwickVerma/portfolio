#!/bin/sh
# Writes /status.json from the Proxmox API. Runs ON the web container (CT114)
# itself, so the host pushes nothing and the container needs no root on it.
#
# One-time setup on the Proxmox host (read-only, no shell access):
#   pveum user add status@pve
#   pveum user token add status@pve site --privsep 1
#   pveum acl modify / --tokens 'status@pve!site' --roles PVEAuditor
# Put the printed secret in /etc/portfolio-status.env (chmod 600):
#   PVE_URL=https://<host>:8006
#   PVE_NODE=<node name>
#   PVE_TOKEN='status@pve!site=<secret>'
#   PVE_CACERT=/etc/ssl/pve-root-ca.pem     # pin the host's CA; no -k
#   OUT=/var/www/status/status.json         # outside the deploy root
# Cron (CT114):  */5 * * * *  /usr/local/bin/portfolio-status
#
# Emits schema 1 (src/lib/status.ts): guest id, running/stopped, uptime, host
# uptime and load. No names, addresses or versions leave the host. Anything
# that is not valid JSON in, or fails the shape check out, is never published.
#
# Test without a host:  PVE_FIXTURE_DIR=tools/fixtures sh tools/status-from-api.sh

set -eu
[ -f /etc/portfolio-status.env ] && . /etc/portfolio-status.env
OUT="${OUT:?OUT not set}"
TMP="$(mktemp)"; trap 'rm -f "$TMP" "$TMP.res" "$TMP.node"' EXIT

fetch() { # $1 = api path, $2 = destination
  if [ -n "${PVE_FIXTURE_DIR:-}" ]; then cp "$PVE_FIXTURE_DIR/$(echo "$1" | tr '/?=&' '____').json" "$2"; return; fi
  curl -fsS --max-time 15 --cacert "${PVE_CACERT:?PVE_CACERT not set}" \
    -H "Authorization: PVEAPIToken=${PVE_TOKEN:?PVE_TOKEN not set}" "${PVE_URL:?PVE_URL not set}/api2/json$1" -o "$2"
}

NODE="${PVE_NODE:-node}"
fetch "/cluster/resources?type=vm" "$TMP.res"
fetch "/nodes/$NODE/status" "$TMP.node"

node - "$TMP.res" "$TMP.node" > "$TMP" <<'JS'
const fs = require("fs");
const res = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).data;
const node = JSON.parse(fs.readFileSync(process.argv[3], "utf8")).data;
const guests = res
  .filter((r) => r.type === "lxc" || r.type === "qemu")
  .map((r) => {
    const id = (r.type === "lxc" ? "CT" : "VM") + r.vmid;
    const g = { id, state: r.status === "running" ? "running" : "stopped" };
    if (g.state === "running" && Number.isFinite(r.uptime) && r.uptime >= 0) g.uptimeSeconds = Math.floor(r.uptime);
    return g;
  })
  .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
const host = {};
if (Number.isFinite(node.uptime)) host.uptimeSeconds = Math.floor(node.uptime);
const load = parseFloat(node.loadavg?.[0]);
if (Number.isFinite(load)) host.load1 = load;
process.stdout.write(JSON.stringify({ schema: 1, generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), host, guests }) + "\n");
JS

# Publish only a non-empty guest list, atomically.
node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(d.schema!==1||!d.guests.length) process.exit(1)' "$TMP"
mkdir -p "$(dirname "$OUT")"
cp "$TMP" "$OUT.new" && mv "$OUT.new" "$OUT"
