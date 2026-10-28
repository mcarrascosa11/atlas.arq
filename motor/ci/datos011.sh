# 011: regenera motor/web/v011.json con los datos ya descargados en datos/011 (OpenStreetMap y relieve Terrarium)
set -euo pipefail
pip install -q matplotlib
python "$GITHUB_WORKSPACE/motor/scripts/v011_build.py" "$GITHUB_WORKSPACE/datos/011" "$GITHUB_WORKSPACE/motor/web/v011.json"
