import asyncio, sys, os, time
from playwright.async_api import async_playwright
# uso: python3 lyon_bocetos.py CARPETA_SALIDA 22.6,26.2,29.2  (servidor: cd motor/web && python3 -m http.server 8765)
async def main(outdir, times):
    os.makedirs(outdir, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'])
        pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
        pg.on('console', lambda m: print('console:', m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/lyon.html')
        t0 = time.time()
        await pg.wait_for_function('window.READY || window.ERR', timeout=240000)
        err = await pg.evaluate('window.ERR')
        if err: print('ERR', err); return
        print('init', round(time.time() - t0, 1), 's')
        for t in times:
            await pg.evaluate(f'window.renderAt({t})')
            await pg.screenshot(path=f'{outdir}/lyon_{t:05.1f}.png')
            print('ok', t, flush=True)
        await b.close()
asyncio.run(main(sys.argv[1], [float(x) for x in sys.argv[2].split(',')]))
