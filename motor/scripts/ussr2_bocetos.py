import asyncio, json
from playwright.async_api import async_playwright
T='¿Pudo la URSS acabar con la falta de vivienda en diez años?'
S=[
 dict(name='01', show=['komm'], tg=[0,0,0], z=19, az=0, el=89, kick='007 · URSS, 1956', title=T),
 dict(name='02', show=['komm'], tg=[0,0,0], z=19, az=0, el=89, kick='01 · EL PUNTO DE PARTIDA', sub='En los años cincuenta se vivía con unos 5 m² por persona. Muchas familias compartían piso: una habitación por familia, cocina y baño comunes.'),
 dict(name='03', show=['flat'], tg=[0,0,0], z=8, az=0, el=89, kick='02 · LA PROMESA', sub='En 1957 la URSS promete un piso para cada familia: dos habitaciones, cocina y baño propios.'),
 dict(name='04', show=['hero','trees'], tg=[0,8,0], z=34, az=35, el=30, kick='03 · EL BLOQUE', sub='Ese piso, repetido en bloques de cinco plantas de paneles hechos en fábrica.'),
 dict(name='05', show=['hero','many','trees'], tg=[0,0,0], z=170, az=35, el=30, kick='04 · EL RITMO', sub='De 41 millones de m² construidos en 1956 a 82,8 millones en 1960: el doble en cuatro años.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/ussr2.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf9/b_{s["name"]}.png')
        await b.close()
asyncio.run(main())
