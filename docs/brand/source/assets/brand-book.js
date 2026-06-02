/* MENTORMATCH brand book — interações */
(function () {
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {

    // injeta marcas onde houver data-mark
    document.querySelectorAll('[data-mark]').forEach(el => {
      const fn = el.getAttribute('data-mark');
      const size = +el.getAttribute('data-size') || 64;
      const ink = el.getAttribute('data-ink') || undefined;
      const accent = el.getAttribute('data-accent') || undefined;
      if (mm[fn]) el.innerHTML = mm[fn]({ size, ink, accent });
    });

    // scroll-spy nav
    const links = [...document.querySelectorAll('.nav-links a')];
    const sections = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
    const spy = () => {
      const y = window.scrollY + 120;
      let cur = sections[0];
      sections.forEach(s => { if (s.offsetTop <= y) cur = s; });
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + (cur && cur.id)));
    };
    window.addEventListener('scroll', spy, { passive: true }); spy();

    // nav background on scroll
    const nav = document.querySelector('.topnav');
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40), { passive: true });

    // reveal on scroll — aplica estilos inline (robusto contra qualquer cascata)
    const reveals = [...document.querySelectorAll('.reveal:not(.in)')];
    const showEl = (el) => { el.classList.add('in'); };
    const checkReveal = () => {
      const vh = window.innerHeight;
      for (let i = reveals.length - 1; i >= 0; i--) {
        const el = reveals[i];
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > -40) { showEl(el); reveals.splice(i, 1); }
      }
    };
    window.addEventListener('scroll', checkReveal, { passive: true });
    window.addEventListener('resize', checkReveal);
    checkReveal();
    setTimeout(checkReveal, 200);

    // copy de cor
    document.querySelectorAll('.swatch[data-hex]').forEach(sw => {
      sw.addEventListener('click', () => {
        const hex = sw.getAttribute('data-hex');
        navigator.clipboard && navigator.clipboard.writeText(hex);
        const tag = sw.querySelector('.sw-copied');
        if (tag){ tag.classList.add('show'); setTimeout(() => tag.classList.remove('show'), 1100); }
      });
    });

    // tabs de direção de símbolo
    const dirBtns = [...document.querySelectorAll('.dir-tab')];
    const dirPanels = [...document.querySelectorAll('.dir-panel')];
    dirBtns.forEach(b => b.addEventListener('click', () => {
      dirBtns.forEach(x => x.classList.remove('active'));
      dirPanels.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.querySelector('#dir-' + b.dataset.dir).classList.add('active');
    }));

  });
})();
