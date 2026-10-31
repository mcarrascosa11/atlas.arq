# Lista de voces de español de España en la biblioteca de ElevenLabs (con la clave guardada como secreto en GitHub).
# Deja datos/voz/voces_es_ES.json y datos/voz/voces_es_ES.md con nombre, descripción y enlace a la muestra de cada voz.
import os, json, requests
K = os.environ.get('ELEVENLABS_API_KEY', ''); os.makedirs('datos/voz', exist_ok=True)
log = open('datos/voz/registro.txt', 'w')
if not K: log.write('sin clave: el secreto ELEVENLABS_API_KEY no llega al render\n'); raise SystemExit(0)
H = {'xi-api-key': K}; voces = {}
for q in ({'language': 'es', 'locale': 'es-ES'}, {'language': 'es', 'accent': 'peninsular'}, {'language': 'es', 'accent': 'castilian'}, {'language': 'es', 'search': 'españa'}, {'language': 'es', 'search': 'spain'}):
    for page in range(3):
        r = requests.get('https://api.elevenlabs.io/v1/shared-voices', headers=H, params={**q, 'page_size': 100, 'page': page}, timeout=60)
        log.write(f'{q} página {page}: {r.status_code}\n')
        if r.status_code != 200: log.write(r.text[:300] + '\n'); break
        d = r.json(); vs = d.get('voices', [])
        for v in vs:
            langs = v.get('verified_languages') or []
            es_es = any((l.get('locale') or '').lower() in ('es-es',) for l in langs) or any(k in (v.get('accent') or '').lower() for k in ('peninsular', 'castil', 'spain', 'españa', 'iberian'))
            if es_es: voces[v['voice_id']] = {k: v.get(k) for k in ('voice_id', 'public_owner_id', 'name', 'gender', 'age', 'accent', 'descriptive', 'use_case', 'category', 'description', 'preview_url', 'cloned_by_count', 'usage_character_count_1y', 'free_users_allowed')}
        if not d.get('has_more'): break
L = sorted(voces.values(), key=lambda v: -(v.get('usage_character_count_1y') or v.get('cloned_by_count') or 0))
json.dump(L, open('datos/voz/voces_es_ES.json', 'w'), ensure_ascii=False, indent=1)
with open('datos/voz/voces_es_ES.md', 'w') as f:
    for v in L[:40]: f.write(f"- {v['name']} · {v.get('gender')} · {v.get('age')} · {v.get('accent')} · {v.get('use_case')} · usos {v.get('usage_character_count_1y')} · gratis {v.get('free_users_allowed')}\n  {(v.get('description') or '')[:160]}\n  muestra: {v.get('preview_url')}\n")
log.write(f'voces de España: {len(L)}\n')
