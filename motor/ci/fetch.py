# Descarga datos públicos listados en motor/ci/job.json ("fetch": [{"url", "out"}]) y deja un registro; no falla si alguno no responde
import json, os, time, urllib.request
ROOT = os.environ.get('GITHUB_WORKSPACE', os.getcwd()); JOB = json.load(open(f'{ROOT}/motor/ci/job.json'))
log = []
for it in JOB['fetch']:
    out = f"{ROOT}/{it['out']}"; os.makedirs(os.path.dirname(out), exist_ok=True); ok = False
    for k in range(4):
        try:
            req = urllib.request.Request(it['url'], headers={'User-Agent': 'atlas-render/1.0 (github.com/mcarrascosa11/atlas.arq)'})
            with urllib.request.urlopen(req, timeout=180) as r: data = r.read()
            open(out, 'wb').write(data); log.append(f"ok {len(data)} B  {it['out']}"); ok = True; break
        except Exception as e:
            err = str(e)[:200]; time.sleep(8 * (k + 1))
    if not ok: log.append(f"FALLO {it['out']}: {err}")
os.makedirs(os.path.dirname(f"{ROOT}/{JOB['log']}"), exist_ok=True)
open(f"{ROOT}/{JOB['log']}", 'w').write('\n'.join(log) + '\n'); print('\n'.join(log))
