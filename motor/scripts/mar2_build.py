import asyncio, json
from playwright.async_api import async_playwright
cam = dict(tg=[12,11,-24], z=46, az=40, el=26)
S=[dict(name=f'b{i}', show='btrk', t=4.0, build=b, **cam) for i, b in enumerate([0.0, 1.0, 1.7, 2.6, 3.6, 4.9, 6.0, 6.9, 7.6, 9.5])]
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await br.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/mar2.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf14/{s["name"]}.png')
        await br.close()
asyncio.run(main())
