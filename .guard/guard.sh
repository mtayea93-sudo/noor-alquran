#!/bin/bash
cd "$GITHUB_WORKSPACE"
FIXED=0
if ! grep -q '8s5u5tpdtwzuv' tools.js || grep -q 'backup.qurango.com' tools.js; then cp .guard/tools.js tools.js; FIXED=1; fi
if ! grep -q 'MP3Q_FALLBACK' app.js; then cp .guard/app.js app.js; FIXED=1; fi
if ! grep -q 'noor-quran-v8' sw.js; then cp .guard/sw.js sw.js; FIXED=1; fi
if [ "$FIXED" = "1" ]; then
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add -A
  git commit -m "guard: إصلاح تلقائي للإذاعات والفولباك 🤖"
  git pull --rebase origin main || true
  git push origin main
  echo "guard: اتصلحت الملفات"
else
  echo "guard: كل حاجة سليمة"
fi
