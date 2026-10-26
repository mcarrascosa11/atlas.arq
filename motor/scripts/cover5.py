import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920})
        await pg.goto('http://127.0.0.1:8765/torre2.html'); await pg.wait_for_function('window.READY || window.ERR')
        await pg.evaluate("document.body.classList.add('cover'); window.COVER=true; renderAt(13)")
        await pg.screenshot(path='/root/teatro/portada5.png')
        await b.close()
asyncio.run(main())
