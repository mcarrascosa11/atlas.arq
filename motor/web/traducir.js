// Versiones en otro idioma de las escenas antiguas sin tocarlas: tras cada fotograma cambia los textos visibles
// (título, subtítulo, rótulo de capítulo y rótulos del dibujo) según un diccionario {original: traducción}.
// Se engancha justo cuando la escena avisa de que está lista (window.READY), antes de que se pida el primer fotograma.
export function traducir(DIC, opciones = {}) {
  const ancho = (n) => n.length * 21 + 20;            // mismo cálculo que las escenas para el fondo de los rótulos
  const cambia = () => {
    for (const id of ['title', 'sub', 'kicker']) { const el = document.getElementById(id); if (el && DIC[el.textContent] !== undefined) el.textContent = DIC[el.textContent]; }
    document.querySelectorAll('#ov text').forEach((n) => {
      const nuevo = DIC[n.textContent]; if (nuevo === undefined) return;
      const r = n.previousElementSibling;                // rótulo con fondo de papel: se ensancha el fondo al nuevo texto
      if (r && r.tagName === 'rect' && n.getAttribute('text-anchor') === 'end') { const x = parseFloat(n.getAttribute('x')), w = ancho(nuevo); r.setAttribute('width', w); r.setAttribute('x', x - w + 8); }
      n.textContent = nuevo; });
  };
  let listo = false;
  Object.defineProperty(window, 'READY', { configurable: true, get: () => listo, set: (v) => {
    if (v && !window.__traducido) { const ra = window.renderAt; window.renderAt = (t) => { const r = ra(t); cambia(); return r; }; window.__traducido = true;
      if (!window.renderCover) window.renderCover = () => { window.renderAt(opciones.portada_t ?? 0); document.body.classList.add('cover'); };   // escenas antiguas sin portada propia
    }
    listo = v; } });
}
