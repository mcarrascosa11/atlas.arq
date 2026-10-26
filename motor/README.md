# Motor de render de atlas

Vídeos verticales 1080×1920 a 30 fps dibujados con three.js (cámara ortográfica, estilo lámina: papel #F2F1EC, tinta #1A1B20, bermellón #E2401C, Space Grotesk 700 / Space Mono 400) y capturados con Playwright + Chromium (SwiftShader).

## Puesta en marcha en un contenedor nuevo
1. `cd motor/web && npm install` (instala three, three-bvh-csg y three-mesh-bvh en las versiones de package.json).
2. Servidor local: `cd motor/web && python3 -m http.server 8765` (las escenas cargan JSON y texturas por HTTP).
3. Playwright con el Chromium del entorno (`/opt/pw-browsers/chromium-*/chrome-linux/chrome`, flags `--use-angle=swiftshader --enable-unsafe-swiftshader`).
4. Las rutas de los scripts apuntan a `/root/teatro/...`: copiar `motor/web` a `/root/teatro/web`, `motor/scripts/*` a `/root/teatro/` y `motor/audio/*` a `/root/teatro/audio/`, o ajustar rutas.

## Piezas
- `web/lib.js`: utilidades (fillMat con sombreado por normal y rayado, lineMat/segs con grosores de línea, prism, extrusiones, edgesOf, merge, viewToWorld).
- Cada vídeo es un HTML + JS de escena que expone `window.shot(o)` (fotograma suelto para bocetos), `window.renderAt(t)` (línea de tiempo) y `window.renderCover()` (portada con la plantilla de número 302 px).
- Último vídeo y plantilla más completa: `web/mar2.html` + `web/mar2.js` (009 Gimnasio Maravillas): sección calcada de la original, construcción por fases (excavar, muro, pistas, pilares, cerchas una a una, salas, cubierta, niños), axonometría explotada por capas, plano de corte móvil, vista de abajo arriba, planta tipo Nolli del Catastro (mar_ctx.png) y volumetría del entorno desde el WFS INSPIRE del Catastro (mar_ctx3d.json), cámara en movimiento continuo.
- `scripts/render*.py`: renderizan fotogramas (`python3 renderXX.py inicio fin`), `scripts/shot*.py`: fotogramas clave, `scripts/cover*.py`: portada, `scripts/enc*.sh`: montaje ffmpeg a dos pasadas 2300 kb/s + AAC 128 k.
- `audio/music*.py`: música original sintetizada con numpy/scipy por buses (sin saturación), normalizada después a −14 LUFS con `volume` + `alimiter=limit=0.89:level=false`.

## Volumetría del entorno (Catastro, sin límite de parcelas)
Enlace WFS por recuadro en UTM 30N (EPSG:25830), p. ej.:
`https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=wfs&version=2&request=getfeature&typenames=BU.BUILDINGPART&bbox=XMIN,YMIN,XMAX,YMAX&srsname=EPSG::25830`
Las coordenadas se pasan de lat/lon a UTM con pyproj. Cada BuildingPart trae la huella y `numberOfFloorsAboveGround` (altura ≈ 3 m por planta).
