import asyncio, json
from playwright.async_api import async_playwright
T='¿Por qué se llaman Torres Blancas si es una sola torre gris?'
S=[
 dict(name='01', az=28, el=6, z=57, tg=[0,43,0], sh=90, kick='006 · MADRID, 1961–1969', title=T),
 dict(name='02', az=20, el=72, z=36, tg=[0,30,0], sh=90, planimg=True, kick='01 · LA PLANTA', sub='Una planta en cruz, sin esquinas: cada vivienda se abre a terrazas curvas.', labels=[]),
 dict(name='03', az=-30, el=22, z=50, tg=[0,48,0], sh=90, kick='02 · CIUDAD JARDÍN VERTICAL', sub='Oíza la plantea como una ciudad jardín vertical: terrazas apiladas alrededor de troncos de hormigón.'),
 dict(name='04', az=40, el=30, z=40, tg=[0,66,0], sh=90, kick='03 · LA CORONACIÓN', sub='Arriba, dos plantas para los vecinos y una piscina entre los troncos.'),
 dict(name='05', az=25, el=22, z=80, tg=[-22,36,0], sh=140, ghost=True, kick='04 · EL NOMBRE', sub='Proyectó dos torres gemelas. El Ayuntamiento solo dio licencia para una, y más alta.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/tb.html'); await pg.wait_for_function('window.READY || window.ERR', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf/tb_{s["name"]}.png')
        await b.close()
asyncio.run(main())
