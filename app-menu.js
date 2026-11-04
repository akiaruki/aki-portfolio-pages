// The native details element remains usable by touch and keyboard without JS.
(() => {
  const menu = document.querySelector('header .app-menu');
  if (!menu) return;
  const trigger = menu.querySelector('summary');
  const panel = menu.querySelector('.app-menu-panel');
  const canHover = matchMedia('(hover: hover) and (pointer: fine)');

  menu.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && canHover.matches) menu.open = true;
  });
  menu.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && canHover.matches && !panel.contains(document.activeElement)) menu.open = false;
  });
  menu.addEventListener('focusout', event => {
    if (!menu.contains(event.relatedTarget)) menu.open = false;
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      event.preventDefault();
      menu.open = false;
      trigger.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.contains(event.target)) menu.open = false;
  });
})();
