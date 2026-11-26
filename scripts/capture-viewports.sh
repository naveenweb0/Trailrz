#!/bin/bash
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT_DIR="/Users/naveenmaan/Desktop/trailrz-nextjs/screenshots"
mkdir -p "$OUT_DIR"

PAGES=(
  "home|http://localhost:3000/?nopreload=1"
  "discover|http://localhost:3000/discover?nopreload=1"
  "event_detail|http://localhost:3000/events/candlelight-jazz-cellar-chandigarh?nopreload=1"
  "originals|http://localhost:3000/originals?nopreload=1"
  "about|http://localhost:3000/about?nopreload=1"
  "contact|http://localhost:3000/contact?nopreload=1"
  "my_tickets|http://localhost:3000/my-tickets?nopreload=1"
)

VIEWPORTS=(
  "1440:900"
  "1280:800"
  "768:1024"
  "390:844"
)

for vp in "${VIEWPORTS[@]}"; do
  w="${vp%:*}"
  h="${vp#*:}"
  for entry in "${PAGES[@]}"; do
    IFS="|" read -r name url <<< "$entry"
    out="${OUT_DIR}/${name}_${w}x${h}.png"
    echo "Capturing $name at ${w}x${h}..."
    "$CHROME" --headless=new --screenshot="$out" --window-size="${w},${h}" --user-data-dir="/tmp/chrome-vp-${w}x${h}" --virtual-time-budget=2000 "$url" >/dev/null 2>&1 || true
  done
done

echo "Screenshot capture complete!"
ls -lh "$OUT_DIR"
