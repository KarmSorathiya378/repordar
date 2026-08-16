#!/bin/bash
# Fetch ReactBits components (src/content/ layout) + their CSS
cd /d/karm/repordar/web
mkdir -p src/components/reactbits
BASE="https://raw.githubusercontent.com/DavidHDev/react-bits/main/src/content"
for entry in \
  "Backgrounds/Particles/Particles" \
  "Components/SpotlightCard/SpotlightCard" \
  "Animations/Magnet/Magnet" \
  "TextAnimations/SplitText/SplitText" \
  "TextAnimations/BlurText/BlurText" \
  "TextAnimations/ShinyText/ShinyText"; do
  name=$(basename "$entry")
  curl -s --max-time 20 "$BASE/$entry.jsx" -o "src/components/reactbits/$name.jsx"
  curl -s --max-time 20 "$BASE/$entry.css" -o "src/components/reactbits/$name.css"
  size=$(wc -c < "src/components/reactbits/$name.jsx")
  csssize=$(wc -c < "src/components/reactbits/$name.css")
  echo "$name: jsx=$size css=$csssize"
done
echo "=== jsx deps ==="
grep -hoE "from ['\"][^'\"]+['\"]" src/components/reactbits/*.jsx | sort -u
echo "=== css files ==="
ls -la src/components/reactbits/