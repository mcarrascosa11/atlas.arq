import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        pg = await b.new_page(viewport={'width':1640,'height':856})
        await pg.goto('http://127.0.0.1:8765/banner2.html'); await pg.wait_for_function('window.READY', timeout=30000); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/root/teatro/atlas_banner2.png')
        await b.close()
asyncio.run(main())
