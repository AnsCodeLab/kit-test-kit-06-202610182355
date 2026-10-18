// Copy button for InstallCommand. Hooks every [data-install] block on the page.
const COPIED = 'Copied';

function selectText(el: Element): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

async function copy(text: string, source: Element): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    selectText(source);
    return document.execCommand('copy');
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-install]')) {
  const code = root.querySelector('code')!;
  const button = root.querySelector('button')!;
  const status = root.querySelector('[data-status]')!;
  const label = button.textContent;
  let timer: number | undefined;
  button.hidden = false;
  button.addEventListener('click', async () => {
    const ok = await copy(code.textContent!.trim(), code);
    if (!ok) selectText(code);
    status.textContent = ok ? 'Command copied to clipboard.' : 'Copy failed. The command is selected, press Ctrl+C to copy it.';
    button.textContent = ok ? COPIED : label;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      button.textContent = label;
    }, 2500);
  });
}
