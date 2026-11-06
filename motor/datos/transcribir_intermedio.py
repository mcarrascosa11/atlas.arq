# Descarga el audio de un vídeo de laSexta y lo transcribe con Whisper en GitHub Actions (que sí tiene acceso a la web).
# La transcripción se sube CIFRADA: el repositorio es público y el texto de un programa de televisión no se puede republicar.
# Solo la clave privada (fuera del repositorio) puede descifrarla. El registro de pasos sí va en claro, sin contenido del programa.
import subprocess, sys, os, glob
D = 'datos/intermedio'; os.makedirs(D, exist_ok=True)
URL = 'https://www.lasexta.com/programas/el-intermedio/pedro-arrojo-doctor-fisica-denuncia-opacidad-centros-datos-imponen-silencio-absoluto-paises_202611056aed037cd3bddc0868a6c579.html'
LOG = open(f'{D}/registro.txt', 'w')
def log(s): print(s, flush=True); LOG.write(str(s) + '\n'); LOG.flush()
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '-U', 'yt-dlp', 'faster-whisper'], check=False)
for intento in (['--geo-bypass-country', 'ES'], []):
    r = subprocess.run([sys.executable, '-m', 'yt_dlp', *intento, '-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '-o', '/tmp/intermedio.%(ext)s', URL], capture_output=True, text=True)
    log(f'yt-dlp {intento} -> {r.returncode}'); log(r.stdout[-1500:]); log(r.stderr[-2500:])
    if glob.glob('/tmp/intermedio.mp3'): break
f = glob.glob('/tmp/intermedio.mp3')
if not f: log('SIN AUDIO: no se pudo descargar'); sys.exit(0)
from faster_whisper import WhisperModel
m = WhisperModel('small', device='cpu', compute_type='int8')
segs, info = m.transcribe(f[0], language='es', vad_filter=True, beam_size=5)
lineas = [f'[{int(s.start) // 60:02d}:{int(s.start) % 60:02d}] {s.text.strip()}' for s in segs]
open('/tmp/t.txt', 'w').write('\n'.join(lineas) + '\n')
log(f'transcrito: {len(lineas)} fragmentos, {info.duration:.0f} s de audio')
PUB = '''-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA5V2KTla2bFWTpdg1cU9I
MH4kcDPJ2tICeR0hW5fnKx1UX7iA+G1QpbHgMbK6g1tmlu5OWurfVfEqKUg/iTTF
UP1BqDKJHoI9J6faCKA49ocwI+g4kQqbgxX3tjUtd2lN+6jrAj2xsnFBrNF1VLkx
f32B56iya8gLHXae//Jfp+Dd6l1+bEuCJyoFcc3Wuu6TR7kvm3AMfBWQkSDWX/bC
2hYxSltfQj80Ya0mnSaWN6MaciUoJWEvzdd/k7O9n6RxyS8i2xvBeuFwsiRCoX4v
oeLTKmjUilxoTVeOkqoXQeZ35gDsBhCd8gGLzp0P334KA/LPUE+kxxpVZrwsdsxf
yqTXjTe3N3L4fi5cUPgHGBc6Ig+s30/cmHlToOlNcVFJrd5KKv1dd/07NwC+LH7T
VK4bbiOEGSfQPxKcxXt8sobMg1X/C8DaAz2vYjgeEBopwFVDCmW4CCa6ZUiZr41y
yhp052bBwpuwVKhXSIZloDzCu+fVJDAhkgT4UrGgqEVDAgMBAAE=
-----END PUBLIC KEY-----'''
open('/tmp/pub.pem', 'w').write(PUB + '\n')
subprocess.run('openssl rand -hex 32 > /tmp/k.txt', shell=True, check=True)
subprocess.run(f'openssl enc -aes-256-cbc -pbkdf2 -salt -in /tmp/t.txt -out {D}/transcripcion.enc -pass file:/tmp/k.txt', shell=True, check=True)
subprocess.run(f'openssl pkeyutl -encrypt -pubin -inkey /tmp/pub.pem -pkeyopt rsa_padding_mode:oaep -in /tmp/k.txt -out {D}/clave.enc', shell=True, check=True)
log('cifrado ok')
