import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920})
        await pg.goto('http://127.0.0.1:8765/index.html'); await pg.wait_for_function('window.READY || window.ERR')
        print(await pg.evaluate(sys.argv[1]))
        await b.close()
asyncio.run(main())
