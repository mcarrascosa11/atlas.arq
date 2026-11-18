# 024: navegador sin pantalla y three.js para dibujar la escena 3D (ciudad esquemática, sin datos externos)
set -e
pip install -q playwright
python -m playwright install --with-deps chromium > /dev/null
(cd motor/web && npm install --no-audit --no-fund --silent)
