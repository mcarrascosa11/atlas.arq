import asyncio, os, time, sys
from playwright.async_api import async_playwright
OUT='/root/teatro/frames9b'; FPS=30; DUR=57.0
a=int(sys.argv[1]) if len(sys.argv)>1 else 0; b=int(sys.argv[2]) if len(sys.argv)>2 else int(DUR*FPS)
async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
            args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await br.new_page(viewport={'width':1080,'height':1920})
        await pg.goto('http://127.0.0.1:8765/mar2.html')
        await pg.wait_for_function('window.READY || window.ERR', timeout=240000)
        t0=time.time(); n=0
        for i in range(a,b):
            f=f'{OUT}/{i:05d}.jpg'
            if os.path.exists(f): continue
            await pg.evaluate(f'window.renderAt({i/FPS})')
            await pg.screenshot(path=f+'.tmp.jpg', type='jpeg', quality=93)
            os.replace(f+'.tmp.jpg', f); n+=1
            if n%50==0: print(i, round((time.time()-t0)/n,2),'s/frame', flush=True)
        await br.close()
    print('DONE', flush=True)
asyncio.run(main())
