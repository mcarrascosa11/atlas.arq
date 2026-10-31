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
if python3 -c "import json,sys; sys.exit(0 if 'prep' in json.load(open('$J')) else 1)"; then   # modo preparación de datos: script de Python que deja sus resultados en una carpeta del repo
  P=$(v prep); D=$(v dir); pip install -q requests numpy pyproj "laspy[lazrs]"
  python3 "$P" || true
  git config user.name "atlas-render"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add "$D"; git commit -m "datos: $P" || true; git pull --rebase -q && git push; exit 0
fi
if python3 -c "import json,sys; sys.exit(0 if json.load(open('$J')).get('engine') == 'blender' else 1)"; then   # modo Blender: escena en motor/blender
  OUT=$(v out); DATA=$(v data); MUSIC=$(v music); SCENE=$(v scene); TEXTS=$(v texts); FR=$(v frames)
  echo "== $OUT (Blender: $SCENE)"
  sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg libxi6 libxkbcommon0 libsm6 libxrender1 libxxf86vm1 libxfixes3 libgl1 libegl1 > /dev/null
  curl -sL -o /tmp/b.tar.xz https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz && tar xJf /tmp/b.tar.xz -C /tmp
  pip install -q numpy scipy shapely pyproj trimesh manifold3d pillow fonttools brotli
  echo "== datos"; bash "$DATA"
  echo "== fotogramas (Blender, $(nproc) núcleos)"; mkdir -p /tmp/fb
  /tmp/blender-4.2.3-linux-x64/blender -b -noaudio -P "$SCENE" -- /tmp/escena.json /tmp/fb 0 $((FR - 1)) 2>&1 | grep -E "Saved|Error|Traceback" | tail -n 5 || true
  echo "== textos y portada"; python motor/blender/post.py /tmp/fb "$TEXTS" "portadas/$OUT.jpg" motor/web/fonts
  echo "== música y montaje"; bash motor/ci/enc_ci.sh "$MUSIC" "$OUT"
  git config user.name "atlas-render"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add "videos/$OUT.mp4" "portadas/$OUT.jpg" motor/ci/ok.txt; git commit -m "$OUT: vídeo y portada renderizados con Blender en GitHub Actions"; git pull --rebase -q && git push; echo "== listo"; exit 0
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
if python3 -c "import json,sys; sys.exit(0 if json.load(open('$J')).get('coveronly') else 1)"; then   # modo solo portada: no rehace el vídeo
  NFRAMES=0 python motor/ci/render_ci.py
  echo "portada=$OUT md5=$(md5sum "portadas/$OUT.jpg" | cut -d' ' -f1) fecha=$(date -u +%FT%TZ)" > motor/ci/ok_portada.txt
  git config user.name "atlas-render"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add "portadas/$OUT.jpg" motor/ci/ok_portada.txt; git commit -m "$OUT: portada rehecha en GitHub Actions"; git pull --rebase -q && git push; echo "== portada lista"; exit 0
fi
python motor/ci/render_ci.py
echo "== música y montaje"; bash motor/ci/enc_ci.sh "$MUSIC" "$OUT"
git config user.name "atlas-render"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add "videos/$OUT.mp4" "portadas/$OUT.jpg" motor/ci/ok.txt
git commit -m "$OUT: vídeo y portada renderizados en GitHub Actions"
git pull --rebase -q && git push
echo "== listo"
