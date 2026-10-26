import asyncio, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920})
        await pg.goto('http://127.0.0.1:8765/tb.html'); await pg.wait_for_function('window.READY')
        r = await pg.evaluate("""() => { const out = {}; const t0 = performance.now(); renderAt(21); out.full = performance.now() - t0;
          const t1 = performance.now(); renderAt(21.03); out.full2 = performance.now() - t1; return out; }""")
        print(r)
        await pg.screenshot(path='/tmp/kf6/x.png'); t=time.time(); await pg.screenshot(path='/tmp/kf6/x.png'); print('shot', round(time.time()-t,2))
        await b.close()
asyncio.run(main())
