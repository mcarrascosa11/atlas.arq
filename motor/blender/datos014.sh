set -e
# 014 · Vegaviana: edificios del Catastro, encinas y calles (datos/014) -> /tmp/vveg.json -> volúmenes limpios /tmp/escena.json
python3 motor/blender/prep014.py datos/014 /tmp/vveg.json
python3 motor/blender/prep_clean.py "$(pwd)" /tmp/escena.json /tmp/vveg.json
