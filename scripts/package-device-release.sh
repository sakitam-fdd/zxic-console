#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  printf "Usage: %s VERSION OUTPUT_DIR\\n" "$0" >&2
  exit 2
fi

version="$1"
output_dir="$2"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="$(cd "$output_dir" 2>/dev/null && pwd || (mkdir -p "$output_dir" && cd "$output_dir" && pwd))"
stage_dir="$output_dir/.device-package"
zip_path="$output_dir/zxic-console-v${version}-device.zip"

[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "invalid version: $version" >&2; exit 1; }
[[ -f "$root_dir/dist/index.html" ]] || { echo "dist/index.html is missing" >&2; exit 1; }
[[ -f "$root_dir/docs/install.bat" ]] || { echo "docs/install.bat is missing" >&2; exit 1; }
[[ -f "$root_dir/docs/INSTALL.md" ]] || { echo "docs/INSTALL.md is missing" >&2; exit 1; }

rm -rf "$stage_dir" "$zip_path"
mkdir -p "$stage_dir/web" "$output_dir"
cp -R "$root_dir/dist/." "$stage_dir/web/"
cp "$root_dir/docs/install.bat" "$stage_dir/install.bat"
cp "$root_dir/docs/INSTALL.md" "$stage_dir/INSTALL.md"

hash_command=""
if command -v sha256sum >/dev/null 2>&1; then hash_command=sha256sum; elif command -v shasum >/dev/null 2>&1; then hash_command="shasum -a 256"; else echo "sha256sum or shasum is required" >&2; exit 1; fi
(cd "$stage_dir" && find web -type f -print0 | sort -z | xargs -0 -n1 bash -c "$hash_command \"\$0\"" && $hash_command install.bat && $hash_command INSTALL.md) > "$stage_dir/SHA256SUMS"

if command -v zip >/dev/null 2>&1; then
  (cd "$stage_dir" && zip -qr "$zip_path" .)
else
  echo "zip is required" >&2
  exit 1
fi
rm -rf "$stage_dir"
printf "Created %s\\n" "$zip_path"
