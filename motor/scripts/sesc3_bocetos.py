import asyncio, json
from playwright.async_api import async_playwright
T='¿Por qué Lina Bo Bardi no derribó la fábrica?'
def m(x, y): return [(x-900)/10.67, 0.2, (y-950)/10.67]
S=[
 dict(name='01', tg=[30,14,-20], z=110, az=35, el=26, kick='008 · SÃO PAULO, 1977–1986', title=T),
 dict(name='02', tg=[0,6,15], z=82, az=35, el=28, cross=True, kick='02 · LA DECISIÓN', sub='El SESC compra la fábrica para hacer un centro de ocio para los trabajadores. Lo lógico era derribarla.'),
 dict(name='03', plan=True, tg=[25,0,-5], z=170, az=0, el=89, kick='04 · LA CALLE', sub='No la cierra: la abre. La planta baja es un suelo público que sigue la calle hacia dentro.', labels=[[m(230,1300),'RUA CLÉLIA'],[m(900,1640),'RUA BARÃO DO BANANAL']]),
 dict(name='05', tg=[66,22,-38], z=36, az=-6, el=12, kick='06 · EL DEPORTE', sub='Huecos irregulares con celosía roja y ocho pasarelas en abanico hasta la torre de vestuarios.'),
 dict(name='04', tg=[62,24,-38], z=58, az=40, el=16, kick='06 · EL DEPORTE', sub='Lo que no cabía en las naves, la piscina y las pistas, lo apila en dos torres unidas por pasarelas.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/sesc3.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf11/s_{s["name"]}.png')
        await b.close()
asyncio.run(main())
