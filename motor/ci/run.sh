# Render de un vídeo de atlas en GitHub Actions, según motor/ci/job.json:
#   page (escena en motor/web), frames, fps, data (script que genera los datos), music (script de música), out (nombre del vídeo y la portada)
# Deja videos/OUT.mp4, portadas/OUT.jpg y motor/ci/ok.txt en el repo. Toda la lógica vive aquí para poder cambiarla sin tocar el workflow.
set -euo pipefail
exec > >(tee -a /tmp/ci_log.txt) 2>&1
J=motor/ci/job.json; v() { python3 -c "import json,sys; print(json.load(open('$J'))[sys.argv[1]])" "$1"; }
if python3 -c "import json,sys; sys.exit(0 if 'fetch' in json.load(open('$J')) else 1)"; then   # modo descarga de datos
  python3 motor/ci/fetch.py
  D=$(python3 -c "import json; print(json.load(open('$J'))['dir'])")
  git config user.name "atlas-render"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add "$D"; git commit -m "datos: descarga para $D"; git pull --rebase -q && git push; exit 0
fi
PAGE=$(v page); OUT=$(v out); DATA=$(v data); MUSIC=$(v music)
echo "== $OUT ($PAGE)"
sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg > /dev/null
pip install -q numpy scipy shapely pyproj playwright pillow
python -m playwright install --with-deps chromium > /dev/null
(cd motor/web && npm install --no-audit --no-fund --silent)
echo "== datos"; bash "$DATA"
echo "== fotogramas y portada"
(cd motor/web && python -m http.server 8765 > /tmp/http.log 2>&1 &) ; sleep 2
python motor/ci/render_ci.py
echo "== música y montaje"; bash motor/ci/enc_ci.sh "$MUSIC" "$OUT"
git config user.name "atlas-render"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add "videos/$OUT.mp4" "portadas/$OUT.jpg" motor/ci/ok.txt
git commit -m "$OUT: vídeo y portada renderizados en GitHub Actions"
git pull --rebase -q && git push
echo "== listo"
