(() => {
  const button = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-navigation');
  if (!button || !nav) return;
  document.documentElement.classList.add('js');
  const close = () => {
    nav.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
  };
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-expanded') === 'true') { close(); return; }
    nav.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Close navigation');
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
})();
