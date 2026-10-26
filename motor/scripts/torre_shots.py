import asyncio, json
from playwright.async_api import async_playwright
S=[
 dict(name='01', upto=0, footprint=True, az=200, el=30, z=40, tg=[2,6,4], kick='005 · ZARAGOZA, 1504', title='¿Por qué Zaragoza derribó su torre inclinada?', labels=[[[9,1.3,6],'PLAZA DE SAN FELIPE']]),
 dict(name='02', upto=19, az=200, el=32, z=40, tg=[0,10,0], kick='01 · 1504', sub='Una torre de reloj para la ciudad: ladrillo y aljez, sobre una estrella de 16 puntas.'),
 dict(name='03', upto=80.5, az=200, el=20, z=62, tg=[0,40,0], kick='01 · 1504–1512', sub='Unos 80 m. La obra más alta de Zaragoza durante dos siglos.', dims=[[[8,0,-8],[8,80,-8],'≈80 m','#E2401C',0,60]]),
 dict(name='04', upto=80.5, az=0, el=6, z=50, tg=[0,40,0], plaza=False, accents=True, kick='02 · EL DESPLOME', sub='Recta 10 pies, se inclina hasta los 210 y el remate vuelve a subir vertical.', dims=[[[0,10,7],[2.6,10,7],'≈2,6 m','#E2401C',0,0]], labels=[[[0,1.4,0],'10 PIES'],[[2.6,58.5,0],'210 PIES']]),
 dict(name='05', upto=80.5, az=215, el=26, z=62, tg=[0,40,0], kick='03 · 1741 / 1892', sub='Medida en 1741 y otra vez en 1892: el desplome apenas había cambiado.', dims=[[[0,58.5,0],[2.6,58.5,0],'2,6 m','#E2401C',0,60]]),
 dict(name='06', upto=46, az=200, el=26, z=46, tg=[0,22,0], kick='04 · 1892–1893', sub='En 1892 el Ayuntamiento acuerda derribarla. Sus ladrillos acaban en cimientos de casas nuevas.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920})
        pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/torre.html'); await pg.wait_for_function('window.READY || window.ERR', timeout=60000)
        print(await pg.evaluate('window.ERR || "ok"'))
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf/torre_{s["name"]}.png')
        await b.close()
asyncio.run(main())
