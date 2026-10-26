import asyncio, json
from playwright.async_api import async_playwright
T='¿Pudo la URSS acabar con la falta de vivienda en diez años?'
LEN=64; DEP=12
S=[
 dict(name='09', tg=[0,20,-64], z=118, az=90, el=16, wave=True, kick='08 · ¿A DÓNDE FUERON?', sub='Primero se levanta el edificio nuevo en el mismo distrito, los vecinos se mudan gratis a un piso de igual tamaño y después se derriba el viejo.'),
 dict(name='01', tg=[0,8,0], z=36, az=32, el=18, kick='007 · URSS, 1957', title=T),
 dict(name='02', tg=[0,10,-4], z=34, az=28, el=22, hideHero=True, building=True, crane=True, kick='01 · 1957', sub='En 1957 la URSS promete acabar con la falta de vivienda en diez o doce años.'),
 dict(name='03', tg=[-2,6,4], z=14, az=24, el=16, hideHero=True, building=True, crane=True, kick='02 · EL MÉTODO', sub='Paneles de hormigón hechos en fábrica y montados en obra, planta a planta.'),
 dict(name='04', tg=[0,8,0], z=30, az=40, el=10, kick='03 · CINCO PLANTAS', sub='Cinco plantas: el máximo para no tener que poner ascensor.', dims=[[[LEN/2+3,0,DEP/2],[LEN/2+3,13.5,DEP/2],'5 plantas',70]]),
 dict(name='05', tg=[-LEN/2+16*1+6,6,0], z=14, az=18, el=55, cut=6.9, flat=True, kick='04 · EL PISO', sub='Pisos de unos 50 m², con la cocina y el baño mínimos.'),
 dict(name='06', tg=[0,6,0], z=125, az=30, el=40, district=True, services=True, kick='05 · LA REPETICIÓN', sub='El mismo bloque, repetido barrio tras barrio. El primero, Cheriómushki, en Moscú, a partir de 1956.'),
 dict(name='08', tg=[20,0,0], z=150, az=90, el=88, district=True, services=True, walk=True, kick='06 · EL MICRODISTRITO', sub='Para 5.000–10.000 vecinos: colegio, dos guarderías, tienda, comedor, club y zonas de juego. El tráfico, por fuera.', labels=[[[0,9.6,0],'COLEGIO'],[[61,6.4,0],'GUARDERÍA'],[[-61,6.4,0],'GUARDERÍA'],[[110,4.2,0],'TIENDA'],[[106,4.2,20],'COMEDOR · CLUB'],[[-6,0,46],'JUEGOS']]),
 dict(name='07', tg=[0,6,0], z=110, az=30, el=38, district=True, reno=True, kick='06 · HOY', sub='En 2017 Moscú aprueba derribar 5.175 edificios de esa época: casi un millón de vecinos.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/ussr.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in [x for x in S if x['name']=='09']:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf7/u_{s["name"]}.png')
        await b.close()
asyncio.run(main())
