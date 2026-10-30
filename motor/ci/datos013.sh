set -e
# 013: genera motor/web/v013.json desde datos/013 (OSM y relieve ya descargados en el repo)
pip install -q matplotlib
python3 motor/scripts/v013_build.py "$(pwd)"
