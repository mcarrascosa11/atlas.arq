import asyncio, sys, time, subprocess, os
from playwright.async_api import async_playwright
async def main(times, outdir, prefix='k'):
    os.makedirs(outdir, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
            args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
        pg = await b.new_page(viewport={'width':1080,'height':1920})
        pg.on('console', lambda m: print('console:', m.text) if m.type in ('error','warning') else None)
        await pg.goto('http://127.0.0.1:8765/mar2.html')
        t0=time.time()
        await pg.wait_for_function('window.READY || window.ERR', timeout=240000)
        err = await pg.evaluate('window.ERR')
        if err: print('ERR', err); return
        print('init', round(time.time()-t0,1),'s')
        for t in times:
            t1=time.time()
            await pg.evaluate(f'window.renderAt({t})')
            await pg.screenshot(path=f'{outdir}/{prefix}_{t:05.1f}.png')
            print(t, round(time.time()-t1,2),'s', flush=True)
        await b.close()
times=[float(x) for x in sys.argv[2].split(',')]
asyncio.run(main(times, sys.argv[1]))
