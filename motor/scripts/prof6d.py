import asyncio
from playwright.async_api import async_playwright
JS = """() => { const cv = document.querySelector('#stage canvas'); const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  const px = new Uint8Array(4); const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const time = (f) => { sync(); const t0 = performance.now(); f(); sync(); return Math.round(performance.now() - t0); };
  renderAt(20); const R = TB.renderer, S = TB.scene, C = TB.camera; const out = {};
  out.renderOnly = time(() => R.render(S, C));
  TB.shadowU.on.value = 0; out.noShadow = time(() => R.render(S, C)); TB.shadowU.on.value = 1;
  out.programs = R.info.programs.length; out.calls = R.info.render.calls; out.tris = R.info.render.triangles;
  const sz = new (R.getSize.constructor === Function ? Object : Object)(); 
  out.aa = R.getContext().getContextAttributes().antialias;
  return out; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1080,'height':1920})
        await pg.goto('http://127.0.0.1:8765/tb.html'); await pg.wait_for_function('window.READY')
        print(await pg.evaluate(JS))
        await b.close()
asyncio.run(main())
