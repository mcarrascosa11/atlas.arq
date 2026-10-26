import asyncio, json
from playwright.async_api import async_playwright
S=[
 dict(name='01', planView=True, tg=[0,0,70], z=430, az=0, el=89, kick='05 · EL BARRIO', sub='Los bloques no van en retícula: se agrupan alrededor de patios, con caminos, jardines y servicios en el centro.'),
 dict(name='02', tg=[0,0,0], z=330, az=35, el=30, kick='05 · EL BARRIO', sub='Los bloques no van en retícula: se agrupan alrededor de patios, con caminos, jardines y servicios en el centro.'),
 dict(name='03', red=True, tg=[-10,0,-60], z=150, az=35, el=30, kick='05 · EL BARRIO', sub='El mismo bloque de paneles, repetido y agrupado en patios.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/barrio.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf9/bb_{s["name"]}.png')
        await b.close()
asyncio.run(main())
