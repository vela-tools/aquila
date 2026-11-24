#!/bin/sh
set -eu

json_string() {
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

name=$(json_string "${AQUILA_BROKER_NAME:-}")
url=$(json_string "${AQUILA_BROKER_URL:-}")

mkdir -p /tmp/aquila
printf '{\n  "brokerName": "%s",\n  "brokerUrl": "%s"\n}\n' "$name" "$url" > /tmp/aquila/config.json
