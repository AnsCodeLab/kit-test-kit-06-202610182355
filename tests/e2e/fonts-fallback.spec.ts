import { test, expect } from '@playwright/test';

// Fallback metrics test. The fallback faces in fonts.css stand in for the web fonts until they load; if their
// widths or line boxes differ, the swap moves text. Measured at 100 px so the system font's hinted advance
// rounding at small sizes (a platform effect, not a CSS property) does not hide the real ratio.
const SAMPLE = 'The CLI and the skills, MIT licensed. Run it with npx @anscodelab/coding-agent-kit. Pro Pack planned. 0123456789 Quickstart, measuring effectiveness: the three-layer evidence model.';

test.skip(({ viewport }) => viewport?.width !== 1440, 'font metrics do not depend on the viewport');

async function measure(page: import('@playwright/test').Page, family: string, weight: number) {
  return page.evaluate(
    async ([fam, w, text]) => {
      await document.fonts.load(`${w} 100px ${fam}`);
      const s = document.createElement('span');
      s.style.cssText = `position:absolute;white-space:nowrap;line-height:normal;font:${w} 100px ${fam}`;
      s.textContent = text;
      document.body.append(s);
      const r = s.getBoundingClientRect();
      s.remove();
      return { width: r.width, height: r.height };
    },
    [family, weight, SAMPLE] as const,
  );
}

const faces = [
  { name: 'Hanken Grotesk', fallback: 'Hanken Grotesk Fallback', weight: 400, widthTol: 0.01 },
  // The fallback is a single regular face, so bold text is synthesised: a looser bound.
  { name: 'Hanken Grotesk', fallback: 'Hanken Grotesk Fallback', weight: 740, widthTol: 0.02 },
  { name: 'JetBrains Mono', fallback: 'JetBrains Mono Fallback', weight: 400, widthTol: 0.005 },
];

for (const f of faces) {
  test(`${f.fallback} matches ${f.name} at weight ${f.weight}`, async ({ page }) => {
    await page.goto('/404.html', { waitUntil: 'networkidle' });
    const real = await measure(page, `'${f.name}'`, f.weight);
    const fb = await measure(page, `'${f.fallback}'`, f.weight);
    expect(Math.abs(fb.width - real.width) / real.width, `width ${fb.width} vs ${real.width}`).toBeLessThanOrEqual(f.widthTol);
    expect(Math.abs(fb.height - real.height) / real.height, `line box ${fb.height} vs ${real.height}`).toBeLessThanOrEqual(0.005);
  });
}
