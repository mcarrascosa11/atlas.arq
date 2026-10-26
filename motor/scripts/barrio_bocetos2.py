import asyncio, json
from playwright.async_api import async_playwright
S=[
 dict(name='V_plan', ds='A', planView=True, tg=[0,0,70], z=430, az=0, el=89, kick='05 · EL MICRODISTRITO', sub='Microdistrito V de Nóvye Cheriómushki: el barrio entero, construido de una vez con los mismos bloques.'),
 dict(name='V_axo', ds='A', tg=[0,0,0], z=330, az=35, el=30, kick='05 · EL MICRODISTRITO', sub='Microdistrito V de Nóvye Cheriómushki: el barrio entero, construido de una vez con los mismos bloques.'),
 dict(name='9_plan', ds='B', planView=True, labels=True, tg=[0,0,40], z=470, az=0, el=89, kick='06 · LOS SERVICIOS', sub='El modelo, el barrio n.º 9: colegio, guarderías, comedor, tiendas y cine entre las viviendas.'),
 dict(name='9_axo', ds='B', labels=True, tg=[10,0,10], z=320, az=35, el=30, kick='06 · LOS SERVICIOS', sub='El modelo, el barrio n.º 9: colegio, guarderías, comedor, tiendas y cine entre las viviendas.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/barrio.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf9/bb2_{s["name"]}.png')
        await b.close()
asyncio.run(main())
