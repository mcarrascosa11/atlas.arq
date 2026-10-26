import asyncio, json
from playwright.async_api import async_playwright
S=[
 dict(name='xa_final', xa=True, show='btrk', t=6.0, tg=[15,25,-26], z=53, az=40, el=28, kick='009 · GIMNASIO MARAVILLAS · DE LA SOTA, 1962'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/mar.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf13/{s["name"]}.png')
        await b.close()
asyncio.run(main())
