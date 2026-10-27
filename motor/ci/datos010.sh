# 010: descarga los datos públicos y genera motor/web/zgz10.json y motor/web/lyon10.json con scripts/v010_build.py
set -euo pipefail
mkdir -p /tmp/d010 && cd /tmp/d010
C='https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=wfs&version=2&request=getfeature&typenames=BU.BUILDINGPART&srsname=EPSG::25830&bbox='
i=1
for b in 673162,4614132,673762,4614732 673762,4614132,674362,4614732 673162,4613532,673762,4614132 673762,4613532,674362,4614132; do
  curl -sSfL --retry 5 --retry-delay 10 -A "Mozilla/5.0" -o zgz$i.gml "$C$b"
  n=$(grep -o "<bu-ext2d:BuildingPart " zgz$i.gml | wc -l); echo "Catastro recuadro $i: $n partes"
  [ "$n" -ge 100 ] || { echo "ERROR: el Catastro no devolvió edificios en el recuadro $i"; head -c 600 zgz$i.gml; exit 1; }
  i=$((i+1))
done
G='https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&SRSNAME=EPSG:2154&BBOX=840600,6515870,842570,6518710,EPSG:2154&OUTPUTFORMAT=application/json&COUNT=5000&TYPENAMES='
curl -sSfL --retry 5 --retry-delay 10 -o edif.json "${G}BDTOPO_V3:batiment"
curl -sSfL --retry 5 --retry-delay 10 -o agua.json "${G}BDTOPO_V3:surface_hydrographique"
python -c "import json; d=json.load(open('edif.json')); a=json.load(open('agua.json')); print('BD TOPO:', len(d['features']), 'edificios,', len(a['features']), 'superficies de agua'); assert len(d['features']) > 2500 and len(a['features']) > 3"
python "$GITHUB_WORKSPACE/motor/scripts/v010_build.py" zgz1.gml zgz2.gml zgz3.gml zgz4.gml edif.json agua.json
