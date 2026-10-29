# 012: regenera motor/web/v012.json con los datos ya descargados en datos/012 (IGN, BD TOPO V3)
set -euo pipefail
python "$GITHUB_WORKSPACE/motor/scripts/v012_build.py" "$GITHUB_WORKSPACE/datos/012" "$GITHUB_WORKSPACE/motor/web/v012.json"
