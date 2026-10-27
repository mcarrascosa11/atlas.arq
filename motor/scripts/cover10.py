import asyncio, sys
from playwright.async_api import async_playwright
async def main(out):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 1080, 'height': 1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/v010.html'); await pg.wait_for_function('window.READY || window.ERR', timeout=120000)
        await pg.evaluate('window.renderCover()'); await pg.screenshot(path=out); await b.close(); print('ok', out)
asyncio.run(main(sys.argv[1]))
