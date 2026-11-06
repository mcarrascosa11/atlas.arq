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
if python3 -c "import json,sys; sys.exit(0 if json.load(open('$J')).get('engine') in ('blender', 'python') else 1)"; then   # modo Blender o Python (dibujo 2D con matplotlib): escena en motor/blender o motor/py
  OUT=$(v out); DATA=$(v data); MUSIC=$(v music); SCENE=$(v scene); TEXTS=$(v texts); FR=$(v frames); ENG=$(v engine)
  echo "== $OUT ($ENG: $SCENE)"
  sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg libxi6 libxkbcommon0 libsm6 libxrender1 libxxf86vm1 libxfixes3 libgl1 libegl1 > /dev/null
  if [ "$ENG" = blender ]; then curl -sL -o /tmp/b.tar.xz https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz && tar xJf /tmp/b.tar.xz -C /tmp; fi
  pip install -q numpy scipy shapely pyproj trimesh manifold3d pillow fonttools brotli matplotlib
  echo "== datos"; bash "$DATA"
  BL=/tmp/blender-4.2.3-linux-x64/blender
  render() { if [ "$ENG" = python ]; then python3 "$SCENE" -- "$@"; else $BL -b -noaudio -P "$SCENE" -- "$@"; fi; }   # misma llamada para las dos
  PV=$(python3 -c "import json; print(','.join(map(str, json.load(open('$J')).get('preview', []))))")
  if [ -n "$PV" ]; then   # prueba rápida: unos fotogramas a media resolución, que se suben al repo antes del render completo
    echo "== prueba rápida (fotogramas $PV al 50 %)"; mkdir -p /tmp/fp "videos/prueba/$OUT"
    render /tmp/escena.json /tmp/fp "$PV" 0 50 2>&1 | grep --line-buffered -E "fotograma|Error|Traceback|Casco" || true
    for f in /tmp/fp/*.png; do python3 -c "import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], quality=85)" "$f" "videos/prueba/$OUT/$(basename "${f%.png}").jpg"; done
    HOJA=$(python3 -c "import json; print(json.load(open('$J')).get('hoja', ''))")   # hoja de bocetos con los títulos de cada escena
    if [ -n "$HOJA" ]; then python3 "$HOJA" /tmp/fp "$TEXTS" "videos/prueba/$OUT/hoja.jpg" motor/web/fonts; fi
    git config user.name "atlas-render"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git add "videos/prueba/$OUT"; git commit -m "$OUT: prueba rápida antes del render completo" || true; git pull --rebase -q && git push || true
    if python3 -c "import json,sys; sys.exit(0 if json.load(open('$J')).get('solo_prueba') else 1)"; then echo "== solo bocetos: listo"; exit 0; fi
  fi
  echo "== fotogramas (Blender, $(nproc) núcleos)"; mkdir -p /tmp/fb
  render /tmp/escena.json /tmp/fb 0 $((FR - 1)) 2>&1 | grep --line-buffered -E "fotograma|Error|Traceback" || true   # avance cada 30 fotogramas
  if python3 -c "import json,sys; sys.exit(0 if 'voz' in json.load(open('$J')) else 1)"; then   # voz de Lydia desde el historial de ElevenLabs
    echo "== voz"; pip install -q requests; python3 motor/voz/voz_render.py "$J" "$TEXTS" "$(python3 -c "print($FR / 30)")"
  fi
  POST=$(python3 -c "import json; print(json.load(open('$J')).get('post', 'motor/blender/post.py'))")   # posprocesado propio del vídeo si lo tiene
  echo "== textos y portada ($POST)"; python "$POST" /tmp/fb "$TEXTS" "portadas/$OUT.jpg" motor/web/fonts
  if python3 -c "import json,sys; sys.exit(0 if json.load(open('$J')).get('mgaudio') else 1)"; then   # música con instrumentos grabados: kit mgaudio (MIT, muestras CC0), versión fija
    echo "== kit de audio"; mkdir -p /tmp/mgrepo && (cd /tmp/mgrepo && git init -q && git remote add origin https://github.com/Vincentwei1021/mg-styles-15.git \
      && git sparse-checkout set --no-cone /lib/audio /LICENSE && git fetch -q --depth 1 --filter=blob:none origin 49052d80bfaf9fa8412cc9710530e5e95a3b8d8c && git checkout -q FETCH_HEAD)
    pip install -q numba==0.66.0 pedalboard==0.9.25 pyloudnorm==0.2.0 soundfile
  fi
  export MUSIC_DUR=$(python3 -c "print($FR / 30)")
  echo "== música y montaje"; bash motor/ci/enc_ci.sh "$MUSIC" "$OUT"
  git config user.name "atlas-render"; git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add "videos/$OUT.mp4" "portadas/$OUT.jpg" motor/ci/ok.txt; [ -f motor/ci/voz_ok.txt ] && git add motor/ci/voz_ok.txt; git commit -m "$OUT: vídeo y portada renderizados con Blender en GitHub Actions"; git pull --rebase -q && git push; echo "== listo"; exit 0
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
