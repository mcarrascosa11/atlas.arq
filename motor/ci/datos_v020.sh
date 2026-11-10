# 020: navegador sin pantalla y three.js para dibujar la escena 3D, y el entorno de la plaza de Olavide preparado desde OpenStreetMap
set -e
pip install -q playwright
python -m playwright install --with-deps chromium > /dev/null
(cd motor/web && npm install --no-audit --no-fund --silent)
python3 motor/scripts/v020_build.py .
