// Replay button for ReplayScene. The scene is complete and still without this script; the button only
// restarts the CSS timeline, and only while the visitor allows motion.
const motion = matchMedia('(prefers-reduced-motion: no-preference)');

for (const root of document.querySelectorAll<HTMLElement>('[data-replay]')) {
  const button = root.querySelector<HTMLButtonElement>('button')!;
  const sync = () => {
    button.hidden = !motion.matches;
  };
  sync();
  motion.addEventListener('change', sync);
  button.addEventListener('click', () => {
    root.classList.add('is-reset');
    void root.offsetWidth;
    root.classList.remove('is-reset');
  });
}
