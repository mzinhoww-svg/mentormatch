/* =========================================================================
   MENTORMATCH — Sistema de Símbolos
   Marca vencedora "A Corrente" + 5 territórios de exploração.
   Cada função devolve uma string SVG. Use mm.corrente({size, ink, accent}).
   ========================================================================= */
(function (global) {
  const TAU = Math.PI * 2;

  // helper: ponto polar em torno de (cx,cy)
  function pol(cx, cy, r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  // helper: arco aberto entre dois ângulos (graus, sentido horário)
  function arc(cx, cy, r, a0, a1) {
    const [x0, y0] = pol(cx, cy, r, a0);
    const [x1, y1] = pol(cx, cy, r, a1);
    const large = (((a1 - a0) % 360) + 360) % 360 > 180 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  const f = (n) => (+n).toFixed(2);

  /* ---------- MARCA VENCEDORA: A CORRENTE ---------- */
  function corrente(o = {}) {
    const s = o.size || 64;
    const ink = o.ink || '#14100D';
    const accent = o.accent || '#FF4A1C';
    const w = o.weight || 9;
    // dois braços de corrente girando em torno de um nó central:
    // duas partes (mentor + mentorado), uma só circulação.
    const arm = `M 50 15 C 71 17, 81 35, 69 51 C 62 61, 53 58, 51 50`;
    return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" fill="none" aria-label="MentorMatch" role="img" class="mm-mark">
      <path d="${arm}" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>
      <path d="${arm}" stroke="${accent}" stroke-width="${w}" stroke-linecap="round" transform="rotate(180 50 50)"/>
      <circle cx="50" cy="50" r="${w*0.66}" fill="${ink}"/>
    </svg>`;
  }

  /* ---------- TERRITÓRIO 1 · FLUXO (corrente, base do vencedor) ---------- */
  function fluxo(o = {}) { return corrente(o); }

  /* ---------- TERRITÓRIO 2 · ABERTURA (aperture / íris) ---------- */
  function abertura(o = {}) {
    const s = o.size || 64, ink = o.ink || '#14100D', accent = o.accent || '#FF4A1C';
    let blades = '';
    for (let i = 0; i < 6; i++) {
      const a = i * 60;
      const [x0, y0] = pol(50, 50, 12, a);
      const [x1, y1] = pol(50, 50, 38, a + 36);
      blades += `<path d="M ${f(x0)} ${f(y0)} A 38 38 0 0 1 ${f(x1)} ${f(y1)}" stroke="${i===0?accent:ink}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
    }
    return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" fill="none" class="mm-mark">${blades}<circle cx="50" cy="50" r="4.5" fill="${accent}"/></svg>`;
  }

  /* ---------- TERRITÓRIO 3 · MULTIPLICAÇÃO (filotaxia / Fibonacci) ---------- */
  function multiplicacao(o = {}) {
    const s = o.size || 64, ink = o.ink || '#14100D', accent = o.accent || '#FF4A1C';
    const golden = Math.PI * (3 - Math.sqrt(5));
    let dots = '';
    const N = 64;
    for (let i = 0; i < N; i++) {
      const r = 4.4 * Math.sqrt(i);
      const a = i * golden;
      const x = 50 + r * Math.cos(a), y = 50 + r * Math.sin(a);
      const rad = 1.1 + (i / N) * 2.6;
      const col = i < 4 ? accent : ink;
      const op = 0.35 + 0.65 * (i / N);
      dots += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${col}" opacity="${f(op)}"/>`;
    }
    return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" class="mm-mark">${dots}</svg>`;
  }

  /* ---------- TERRITÓRIO 4 · CATALISADOR (gravity assist / estilingue) ---------- */
  function catalisador(o = {}) {
    const s = o.size || 64, ink = o.ink || '#14100D', accent = o.accent || '#FF4A1C';
    // trajetória que entra reta, curva ao redor de um corpo, sai acelerada
    const path = `M 14 78 C 30 64, 34 40, 50 40 C 66 40, 64 60, 78 48 C 86 41, 88 30, 88 22`;
    return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" fill="none" class="mm-mark">
      <circle cx="50" cy="46" r="9" fill="${ink}"/>
      <path d="${path}" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="88" cy="22" r="5" fill="${accent}"/>
    </svg>`;
  }

  /* ---------- TERRITÓRIO 5 · REDE (trama / tecido) ---------- */
  function rede(o = {}) {
    const s = o.size || 64, ink = o.ink || '#14100D', accent = o.accent || '#FF4A1C';
    // constelação assimétrica + uma corrente que circula por ela
    const pts = [[22,34],[46,18],[74,30],[80,60],[50,80],[24,62]];
    const order = [0,1,2,3,4,5,0];
    let path = '';
    order.forEach((idx,i) => { path += (i===0?'M':'L') + ` ${pts[idx][0]} ${pts[idx][1]} `; });
    const chord = `<line x1="${pts[2][0]}" y1="${pts[2][1]}" x2="${pts[5][0]}" y2="${pts[5][1]}" stroke="${ink}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`;
    let nodes = '';
    pts.forEach((p,i) => { nodes += `<circle cx="${p[0]}" cy="${p[1]}" r="${i===0?5.6:4}" fill="${i===0?accent:ink}"/>`; });
    return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" fill="none" class="mm-mark"><path d="${path}" stroke="${ink}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>${chord}${nodes}</svg>`;
  }

  /* ---------- LOCKUP (símbolo + wordmark) ---------- */
  function lockup(o = {}) {
    const h = o.size || 30;
    const ink = o.ink || '#14100D';
    const accent = o.accent || '#FF4A1C';
    const mark = corrente({ size: h * 1.18, ink, accent });
    const fs = h * 0.92;
    return `<span class="mm-lockup" style="display:inline-flex;align-items:center;gap:${h*0.34}px">
      ${mark}
      <span style="font-family:var(--sans);font-weight:700;font-size:${fs}px;letter-spacing:-0.035em;color:${ink};line-height:1">
        Mentor<span style="color:${ink};font-weight:500">match</span>
      </span>
    </span>`;
  }

  global.mm = { corrente, fluxo, abertura, multiplicacao, catalisador, rede, lockup };
})(window);
