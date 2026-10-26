import asyncio, json
from playwright.async_api import async_playwright
T='¿Por qué Lina Bo Bardi no derribó la fábrica?'
S=[
 dict(name='01', sh=140, az=-38, el=30, z=92, tg=[-8,18,-40], kick='006 · SÃO PAULO, 1977–1986', title=T),
 dict(name='02', sh=260, az=20, el=55, z=200, tg=[0,0,-10], kick='01 · POMPÉIA', sub='Pompéia, zona oeste de São Paulo: un barrio obrero.', labels=[[[0,0,-20],'SESC POMPÉIA'],[[-120,2,86],'RUA CLÉLIA'],[[80,20,-150],'POMPÉIA · ZONA OESTE']], show=dict(towers=False, walk=False, deck=False)),
 dict(name='03', sh=150, az=30, el=34, z=70, tg=[0,6,15], kick='02 · 1938', sub='Cuando cierra, el SESC la recibe para hacer un centro de ocio. Lo lógico era derribarla.', show=dict(towers=False, walk=False, deck=False, cross=True)),
 dict(name='04', sh=120, az=10, el=34, z=40, tg=[0,4,52], kick='03 · LA CALLE', sub='Desde la acera de la rua Clélia, un portón abierto da paso a una calle sin coches.', labels=[[[9,0,86],'RUA CLÉLIA']], show=dict(flow=True)),
 dict(name='05', sh=120, az=-28, el=42, z=42, tg=[-4,2,40], cut=4.5, kick='04 · POR DENTRO', sub='Los vecinos ya usaban las naves; ella las llena de biblioteca, talleres, restaurante y teatro.', show=dict(inside=True, flow=True)),
 dict(name='06', sh=110, az=-42, el=18, z=58, tg=[2,30,-86], kick='05 · LAS TORRES', sub='El deporte no cabe en las naves: lo apila en dos torres unidas por pasarelas en el aire.', labels=[[[-6,70,-104],'DEPÓSITO']]),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920})
        pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/sesc.html'); await pg.wait_for_function('window.READY || window.ERR', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf/sesc_{s["name"]}.png')
        await b.close()
asyncio.run(main())
