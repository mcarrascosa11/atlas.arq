# Música para versiones en otro idioma: extrae tal cual el audio de un vídeo ya publicado (job.json → "audio_de"),
# para que la versión traducida suene exactamente igual que la original. uso (lo llama enc_ci.sh): audio_de_video.py SALIDA.wav
import json, os, subprocess, sys
ROOT = os.environ.get('GITHUB_WORKSPACE', os.getcwd())
src = json.load(open(f'{ROOT}/motor/ci/job.json'))['audio_de']
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{ROOT}/{src}', '-vn', '-ac', '2', '-ar', '44100', sys.argv[1]], check=True)
print('audio tomado de', src)
