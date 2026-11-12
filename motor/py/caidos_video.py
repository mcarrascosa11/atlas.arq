# 021 · Monumento a los Caídos · fotogramas de la escena 3D (motor/web/v021.html, three.js) capturados con un navegador sin pantalla.
# Encaja en el modo «python» del render: deja PNG numerados y los títulos los pone después post019.py.
# uso: python3 caidos_video.py -- ESCENA_JSON(no se usa) CARPETA F0 F1 [PORCENTAJE]   (F0 puede ser una lista: 45,142,...)
import asyncio, os, sys, subprocess, time, socket
from multiprocessing import Process
PAGE = 'v021.html'; FPS = 30
argv = sys.argv[sys.argv.index('--') + 1:]; OUT = argv[1]; os.makedirs(OUT, exist_ok=True)
FRAMES = [int(x) for x in argv[2].split(',')] if ',' in argv[2] else list(range(int(argv[2]), int(argv[3]) + 1))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); WEB = os.path.join(ROOT, 'motor', 'web')
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']; NAV = int(os.environ.get('NAVEGADORES', 3))
async def trabajo(k, port):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=ARGS); pg = await br.new_page(viewport={'width': 1080, 'height': 1920})
        await pg.goto(f'http://127.0.0.1:{port}/{PAGE}'); await pg.wait_for_function('window.READY || window.ERR', timeout=300000)
        err = await pg.evaluate('window.ERR')
        if err: raise SystemExit('ERR ' + str(err))
        t0 = time.time(); n = 0
        for f in FRAMES[k::NAV]:
            await pg.evaluate(f'window.renderAt({f / FPS})'); await pg.screenshot(path=f'{OUT}/{f:05d}.tmp.png'); os.replace(f'{OUT}/{f:05d}.tmp.png', f'{OUT}/{f:05d}.png'); n += 1
            if k == 0 and (n % 30 == 0 or len(FRAMES) <= 15): print(f'fotograma {min(n * NAV, len(FRAMES))}/{len(FRAMES)} · {time.time() - t0:.0f} s', flush=True)
        await br.close()
def lanza(k, port): asyncio.run(trabajo(k, port))
if __name__ == '__main__':
    if not os.path.exists(os.path.join(WEB, 'v021.json')): subprocess.run([sys.executable, os.path.join(ROOT, 'motor', 'scripts', 'v021_build.py'), ROOT], check=True)
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=WEB, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
    try:
        ps = [Process(target=lanza, args=(k, port)) for k in range(min(NAV, len(FRAMES)))]
        for q in ps: q.start()
        for q in ps: q.join()
    finally: srv.terminate()
    falta = [f for f in FRAMES if not os.path.exists(f'{OUT}/{f:05d}.png')]
    print('Error: faltan fotogramas', len(falta)) if falta else print('vídeo ok', len(FRAMES)); sys.exit(1 if falta or any(q.exitcode for q in ps) else 0)
