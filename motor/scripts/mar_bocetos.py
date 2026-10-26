import asyncio, json
from playwright.async_api import async_playwright
T='¿Cómo se mete un gimnasio debajo del patio de un colegio?'
S=[
 dict(name='01', show='btrk', clipZ=-20, tg=[13,12,-24], z=36, az=26, el=15, kick='009 · MADRID, 1960–1962', title=T),
 dict(name='02', show='', slope=True, dim=True, clipZ=-12.5, tg=[13,13,-16], z=38, az=24, el=24, kick='01 · EL SOLAR', sub='Un solar con 12 metros de desnivel entre dos calles.'),
 dict(name='03', show='btr', clipZ=-20, tg=[13,9,-24], z=20, az=18, el=12, kick='03 · LA ESTRUCTURA', sub='Cerchas de acero de 20 metros de luz, cada 6 metros. Entre ellas, colgadas, las salas.'),
 dict(name='04', show='btrk', tg=[8,14,-26], z=46, az=-34, el=30, kick='04 · EL PATIO', sub='Y encima, el patio: la cubierta sigue la calle de arriba.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/mar.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in S:
            await pg.evaluate(f'window.shot({json.dumps(s)})'); await pg.screenshot(path=f'/tmp/kf12/m_{s["name"]}.png')
        await b.close()
asyncio.run(main())
