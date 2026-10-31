# Prueba de voz: Vegaviana entera narrada con Lydia (ElevenLabs, español de España). Misma imagen, textos y música que el vídeo publicado.
# Guarda cada frase (mp3 + marcas de tiempo por carácter) para reutilizarla sin gastar créditos, y monta videos/pruebas014/T6_lydia.mp4.
import os, sys, json, base64, subprocess, wave, numpy as np, requests
def sh(*a): subprocess.run(list(a), check=True)
if os.environ.get('GITHUB_ACTIONS'): sh('sudo', 'apt-get', 'install', '-y', '-qq', 'ffmpeg'); sh(sys.executable, '-m', 'pip', 'install', '-q', 'scipy')
OUT = 'videos/pruebas014'; CACHE = f'{OUT}/voz_lydia'; os.makedirs(CACHE, exist_ok=True); LOG = open(f'{CACHE}/registro.txt', 'w')
K = os.environ.get('ELEVENLABS_API_KEY', ''); VOZ = 'SDVJaMLoJa7wc3s2sn7d'                      # Lydia · peninsular · divulgativa
if not K: LOG.write('sin clave\n'); raise SystemExit(0)
BEATS = [0, 2.6, 5.6, 8.8, 12.0, 15.0, 18.0, 21.0, 24.5, 27.5, 30.0]
VA = ['¿La solución a la vivienda es construir pueblos enteros?', 'Ya se probó en los años cincuenta.', 'Casi trescientos pueblos, para cincuenta y cinco mil familias.', 'Mientras, millones dejaban su pueblo.', 'Todo gira en torno a la plaza: la iglesia y el ayuntamiento.',
      'Casas encaladas, muchas con cubierta a un agua.', 'Casa, corral y cuadra. Y cinco años de tutela.', 'Las fincas de la reforma agraria vuelven a sus dueños.', 'En los sesenta el plan se frena. El éxodo sigue.', '¿Es la solución construir pueblos enteros?']
SR = 44100; voz = np.zeros(int(SR * 30), np.float32); spans = []
for i, txt in enumerate(VA):
    f = f'{CACHE}/{i:02d}.mp3'
    if not os.path.exists(f):
        r = requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{VOZ}/with-timestamps', params={'output_format': 'mp3_44100_128'}, headers={'xi-api-key': K},
                          json={'text': txt, 'model_id': 'eleven_multilingual_v2', 'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True}}, timeout=120)
        LOG.write(f'{i} {r.status_code} {len(txt)} caracteres\n')
        if r.status_code != 200: LOG.write(r.text[:400] + '\n'); raise SystemExit(0)
        d = r.json(); open(f, 'wb').write(base64.b64decode(d['audio_base64'])); json.dump(d.get('alignment'), open(f'{CACHE}/{i:02d}.json', 'w'), ensure_ascii=False)
    slot = BEATS[i + 1] - BEATS[i] - 0.2
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
    tempo = min(1.25, max(1.0, dur / slot))                                                          # si no cabe en su escena, se acelera un poco sin cambiar el tono
    sh('ffmpeg', '-y', '-v', 'error', '-i', f, '-af', f'atempo={tempo:.3f},aresample={SR}', '-ac', '1', f'/tmp/l{i}.wav')
    w = wave.open(f'/tmp/l{i}.wav'); s = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    a = int((BEATS[i] + 0.1) * SR); b = min(len(voz), a + len(s)); voz[a:b] += s[:b - a]; spans.append((BEATS[i] + 0.1, b / SR)); LOG.write(f'  {dur:.2f} s -> tempo {tempo:.2f}\n')
voz /= max(1e-6, np.abs(voz).max()); voz *= 0.9
sh('python3', 'motor/blender/music014.py', '/tmp/m14.wav')
w = wave.open('/tmp/m14.wav'); M = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32) / 32768; MSR = w.getframerate()
from scipy.signal import resample_poly
vz = resample_poly(voz, MSR, SR).astype(np.float32)[:len(M)] if MSR != SR else voz[:len(M)]; vz = np.pad(vz, (0, len(M) - len(vz)))
t = np.arange(len(M)) / MSR; g = np.ones(len(M), np.float32)
for a, b in spans: g = np.minimum(g, np.clip(1 - 0.62 * np.minimum(np.clip((t - a + 0.15) / 0.15, 0, 1), np.clip((b + 0.25 - t) / 0.25, 0, 1)), 0.38, 1))
mix = M * g[:, None] * 0.8 + vz[:, None]; mix /= max(1e-6, np.abs(mix).max()); mix *= 0.89
w2 = wave.open('/tmp/mixL.wav', 'wb'); w2.setnchannels(2); w2.setsampwidth(2); w2.setframerate(MSR); w2.writeframes((mix * 32767).astype(np.int16).tobytes()); w2.close()
sh('ffmpeg', '-y', '-v', 'error', '-i', 'videos/014_vegaviana.mp4', '-i', '/tmp/mixL.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-shortest', f'{OUT}/T6_lydia.mp4')
LOG.write('ok T6_lydia.mp4\n')
