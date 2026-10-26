import asyncio, json
from playwright.async_api import async_playwright
T='¿Por qué se llaman Torres Blancas si es una sola torre gris?'
S=[
 dict(name='01', tg=[0,43,0], z=57, az=28, el=6, towerH=1e6, kick='006 · MADRID, 1961–1969', title=T),
 dict(name='02', tg=[0,22,0], z=48, az=20, el=28, towerH=34, plan=True, kick='01 · 1961', sub='Madrid, 1961. Juan Huarte encarga a Sáenz de Oiza una torre de viviendas en la avenida de América.'),
 dict(name='03', tg=[0,0,0], z=33, az=0, el=89, towerH=-5, plan=True, kick='02 · LA PLANTA', sub='Una planta en cruz, sin esquinas: cada vivienda se abre a terrazas curvas.'),
 dict(name='04', tg=[0,36,0], z=34, az=-46, el=12, towerH=1e6, kick='03 · CIUDAD JARDÍN VERTICAL', sub='Oiza la plantea como una ciudad jardín vertical: terrazas apiladas alrededor de troncos de hormigón.'),
 dict(name='05', tg=[0,70,0], z=24, az=-20, el=22, towerH=1e6, kick='04 · LA CORONACIÓN', sub='Arriba, dos plantas para los vecinos y una piscina en la azotea.'),
 dict(name='06', tg=[-24,38,0], z=72, az=22, el=12, towerH=1e6, ghost=True, ghostOp=1, kick='05 · EL NOMBRE', sub='Proyectó dos torres gemelas de 20 plantas. Solo obtuvo licencia para una, y la dejó subir hasta 23.'),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920}); pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('http://127.0.0.1:8765/tb.html'); await pg.wait_for_function('window.READY', timeout=60000)
        for s in S:
            s.setdefault('sh', 110)
            await pg.evaluate(f"(() => {{ const o = {json.dumps(s)}; window.shot(o); document.getElementById('title').style.opacity = o.title ? 1 : 0; document.getElementById('sub').style.opacity = o.sub ? 1 : 0; document.getElementById('pimg').style.display = 'none'; document.getElementById('stage').style.opacity = 1; }})()")
            await pg.screenshot(path=f'/tmp/kf6/b2_{s["name"]}.png')
        await b.close()
asyncio.run(main())
