#!/usr/bin/env bash
# Reset all self-hosted Convex data: SQLite, component data, file storage,
# exports, search indexes, temporary files, and deployed modules. The instance
# credentials remain so the configured endpoint and admin key keep working.
# This is intentionally destructive and must run as root on the host that owns
# the volume. Convex may create root-owned mapped files in a rootless volume.
set -euo pipefail

SERVICE_DIR="${CONVEX_SERVICE_DIR:-/home/podman/services}"
DATA_DIR="${CONVEX_DATA_DIR:-$SERVICE_DIR/data/kalanidhi/convex-data}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo env CONFIRM_CONVEX_RESET=DELETE_ALL_CONVEX_DATA $0" >&2
  exit 1
fi

if [[ ! -d "$SERVICE_DIR" || ! -f "$SERVICE_DIR/docker-compose.yml" ]]; then
  echo "Convex service directory not found: $SERVICE_DIR" >&2
  exit 1
fi

if [[ "${CONFIRM_CONVEX_RESET:-}" != "DELETE_ALL_CONVEX_DATA" ]]; then
  cat >&2 <<'EOF'
This permanently deletes every Convex database record, Better Auth component
record, file-storage blob, export, search index, temporary file, and deployed
module for KalaNidhi. Instance credentials are retained for administration.

Repeat with CONFIRM_CONVEX_RESET=DELETE_ALL_CONVEX_DATA to continue.
EOF
  exit 1
fi

run_as_podman() {
  sudo -iu podman "$@"
}

run_as_podman bash -lc "cd '$SERVICE_DIR' && podman compose stop convex convex-dashboard"
mkdir -p "$DATA_DIR/credentials"
find "$DATA_DIR" -mindepth 1 -maxdepth 1 ! -name credentials -exec rm -rf -- {} +
run_as_podman bash -lc "cd '$SERVICE_DIR' && podman compose up -d convex convex-dashboard"

for _ in $(seq 1 24); do
  health=$(run_as_podman podman inspect services-convex-1 --format '{{.State.Health.Status}}' 2>/dev/null || true)
  if [[ "$health" == "healthy" ]]; then
    echo "Convex volume reset complete. Next: deploy functions, upload seed images, then run seed/run:run."
    exit 0
  fi
  sleep 2
done

echo "Convex restarted but did not become healthy within 48 seconds." >&2
exit 1
