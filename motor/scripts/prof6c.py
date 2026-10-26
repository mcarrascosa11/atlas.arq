import asyncio
from playwright.async_api import async_playwright
JS = """() => { const cv = document.querySelector('#stage canvas'); const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  const px = new Uint8Array(4); const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const time = (f) => { sync(); const t0 = performance.now(); f(); sync(); return Math.round(performance.now() - t0); };
  const out = {}; renderAt(20); out.base = time(() => renderAt(20.03));
  const lines = []; TB.scene.traverse(o => { if (o.isLineSegments2) lines.push(o); });
  let nseg = 0; for (const l of lines) nseg += l.geometry.attributes.instanceStart ? l.geometry.attributes.instanceStart.count : 0; out.segments = nseg; out.nlines = lines.length;
  lines.forEach(l => l.visible = false); out.noLines = time(() => renderAt(20.06)); lines.forEach(l => l.visible = true);
  const city = TB.root.getObjectByName('city'); city.visible = false; out.noCity = time(() => renderAt(20.09)); city.visible = true;
  let tris = 0; TB.scene.traverse(o => { if (o.isMesh && !o.isLineSegments2) tris += o.geometry.attributes.position.count / 3; }); out.tris = Math.round(tris);
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920})
        await pg.goto('http://127.0.0.1:8765/tb.html'); await pg.wait_for_function('window.READY')
        print(await pg.evaluate(JS))
        await b.close()
asyncio.run(main())
