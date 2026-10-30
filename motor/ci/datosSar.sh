set -e
# 015: genera motor/web/vsar.json (planos del TFG y mapa) y motor/web/vsar3d.json (maqueta de 1960 con relieve) desde datos/sarnago
pip install -q ezdxf trimesh rtree networkx shapely scipy
mkdir -p /tmp/wa && (cd /tmp/wa && npm pack world-atlas@2.0.2 --silent && tar xzf world-atlas-2.0.2.tgz)
python3 motor/scripts/sar_extrae.py "$(pwd)" /tmp/wa/package/countries-50m.json
python3 motor/scripts/sar_glb.py "$(pwd)"
