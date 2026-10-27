# Fotogramas JPEG repartidos entre varios navegadores y portada en JPG, según motor/ci/job.json (page, frames, fps, out)
import asyncio, json, os, sys, time
from multiprocessing import Process
from playwright.async_api import async_playwright
ROOT = os.environ.get('GITHUB_WORKSPACE', os.getcwd()); JOB = json.load(open(f'{ROOT}/motor/ci/job.json'))
OUT = '/tmp/frames'; W = int(os.environ.get('NAVEGADORES', 3)); N = int(os.environ.get('NFRAMES', JOB['frames'])); FPS = JOB['fps']
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']; EXE = os.environ.get('CHROME') or None
async def page(p):
    br = await p.chromium.launch(executable_path=EXE, args=ARGS)
    pg = await br.new_page(viewport={'width': 1080, 'height': 1920})
    await pg.goto(f"http://127.0.0.1:8765/{JOB['page']}")
    await pg.wait_for_function('window.READY || window.ERR', timeout=300000)
    err = await pg.evaluate('window.ERR')
    if err: raise SystemExit('ERR ' + str(err))
    return br, pg
async def frames(k):
    async with async_playwright() as p:
        br, pg = await page(p); t0 = time.time(); n = 0
        for i in range(k, N, W):
            f = f'{OUT}/{i:05d}.jpg'
            if os.path.exists(f): continue
            await pg.evaluate(f'window.renderAt({i / FPS})')
            await pg.screenshot(path=f + '.tmp.jpg', type='jpeg', quality=93); os.replace(f + '.tmp.jpg', f); n += 1
            if n % 100 == 0: print('navegador', k, 'fotograma', i, round((time.time() - t0) / n, 2), 's/fotograma', flush=True)
        await br.close()
async def cover():
    async with async_playwright() as p:
        br, pg = await page(p)
        await pg.evaluate('window.renderCover()'); await pg.screenshot(path='/tmp/portada.png'); await br.close()
    from PIL import Image
    os.makedirs(f'{ROOT}/portadas', exist_ok=True)
    Image.open('/tmp/portada.png').convert('RGB').save(f"{ROOT}/portadas/{JOB['out']}.jpg", quality=92); print('portada ok', flush=True)
def run(k): asyncio.run(frames(k))
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); asyncio.run(cover())
    ps = [Process(target=run, args=(k,)) for k in range(W)]
    for q in ps: q.start()
    for q in ps: q.join()
    missing = [i for i in range(N) if not os.path.exists(f'{OUT}/{i:05d}.jpg')]
    print('fotogramas que faltan:', len(missing), flush=True); sys.exit(1 if missing or any(q.exitcode for q in ps) else 0)
