// Runs INSIDE the page (Playwright page.evaluate) at a phone viewport. Self-contained: it is serialised with
// toString(), so it must not use anything from this file's scope. Returns plain data:
//   { innerWidth, scrollWidth, overflowX, clipped: [{kind, selector, text, detail}], clippedTotal }
// kind "clipped"   an element with overflow hidden or clip whose content is wider than the box, with text inside
// kind "offscreen" an element with its own text that extends past the right edge of the viewport and is not inside a
//                  deliberate horizontal scroller (overflow auto or scroll) or an element that already clips it
// At most 10 entries are returned (clippedTotal says how many exist).
module.exports = function mobileFacts() {
  const MAX = 10;
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const out = [];
  let total = 0;

  const visible = (el, cs, r) => cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"], [hidden]');
  const ownText = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  // Right edge of the element's own text (a block's box can stay inside the viewport while its text runs past it).
  const textRight = (el) => {
    let right = 0;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const rc of range.getClientRects()) right = Math.max(right, rc.right);
    }
    return right;
  };
  const allText = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const selectorOf = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.body && parts.length < 3; n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(`${s}#${n.id}`); break; }
      const cls = Array.from(n.classList).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      parts.unshift(s);
    }
    return parts.join(' > ').slice(0, 80);
  };
  const clipsX = (cs) => cs.overflowX === 'hidden' || cs.overflowX === 'clip';
  const scrollsX = (cs) => cs.overflowX === 'auto' || cs.overflowX === 'scroll';
  const add = (kind, el, text, detail) => {
    total++;
    if (out.length < MAX) out.push({ kind, selector: selectorOf(el), text: text.slice(0, 40), detail });
  };

  const clippers = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (!visible(el, cs, r)) continue;
    if (clipsX(cs) && el.scrollWidth > el.clientWidth + 1 && allText(el)) {
      clippers.add(el);
      add('clipped', el, allText(el), `content ${el.scrollWidth} px in a ${el.clientWidth} px box`);
    }
  }
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (!visible(el, cs, r) || cs.position === 'fixed') continue;
    const text = ownText(el);
    const right = Math.max(r.right, text ? textRight(el) : 0);
    if (!text || right <= vw + 1) continue;
    let covered = false;
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (scrollsX(pcs) || clippers.has(p) || (clipsX(pcs) && p.getBoundingClientRect().right <= vw + 1)) { covered = true; break; }
    }
    if (!covered) add('offscreen', el, text, `right edge at ${Math.round(right)} px, viewport ${vw} px`);
  }

  return {
    innerWidth: vw,
    scrollWidth: Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0),
    overflowX: Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0) > vw,
    clipped: out,
    clippedTotal: total,
  };
};
