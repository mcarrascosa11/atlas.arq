# Kit de audio mgaudio (github.com/Vincentwei1021/mg-styles-15, licencia MIT; muestras VCSL, CC0), fijado a una versión concreta.
# En GitHub lo descarga run.sh en /tmp/mgrepo; aquí solo se carga y se filtra el índice de muestras a las que trae el repositorio.
import os, sys, json
ROOT = os.environ.get('MGAUDIO_DIR', '/tmp/mgrepo/lib/audio'); sys.path.insert(0, ROOT)
import mgaudio as mg
from mgaudio import samples as _S
_IDX = {k: [i for i in v if os.path.exists(os.path.join(_S.ROOT, i['file']))] for k, v in json.load(open(os.path.join(_S.ROOT, 'index.json'))).items()}
_S._index = lambda: _IDX     # el índice cita más muestras de las que hay en el repositorio: se usan solo las presentes
