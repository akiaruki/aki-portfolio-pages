(() => {
  'use strict';
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.main-nav');
  const closeMenu = (restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('is-open');
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  matchMedia('(min-width: 761px)').addEventListener('change', () => closeMenu());

  const previews = {
    looks: 'Aki Studio Adaptive Looks interface with look collections, thumbnails and strength control',
    curves: 'Aki Studio Curves interface with RGB, individual color channels and precise point controls',
    color: 'Aki Studio Color Mixer interface with color selection, hue and saturation controls',
    tools: 'Aki Studio toolkit with Crop, Develop, Curves, mixers, Detail, effects and finishing tools'
  };
  const tabs = [...document.querySelectorAll('[data-preview]')];
  const previewImage = document.querySelector('#interface-preview');
  const previewPanel = document.querySelector('#interface-panel');
  const showPreview = (tab, focus = false) => {
    for (const button of tabs) {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    previewImage.src = `assets/app-${tab.dataset.preview}.webp`;
    previewImage.alt = previews[tab.dataset.preview];
    previewPanel.setAttribute('aria-labelledby', tab.id);
    if (focus) tab.focus();
  };
  tabs.forEach(tab => {
    tab.addEventListener('click', () => showPreview(tab));
    tab.addEventListener('keydown', event => {
      let index = tabs.indexOf(tab);
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') index = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') index = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault();
      showPreview(tabs[index], true);
    });
  });

  let revealObserver;
  const configureReveals = () => {
    revealObserver?.disconnect();
    const enabled = !motionQuery.matches && 'IntersectionObserver' in window;
    document.documentElement.classList.toggle('motion', enabled);
    if (!enabled) return;
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }, {threshold: .08});
    document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => revealObserver.observe(el));
  };
  configureReveals();

  // CSS perspective remains a static, fully rendered scene without WebGL.
  // Only one coalesced frame is scheduled per pointer event; there is no idle loop.
  const stage = document.querySelector('.product-stage');
  if (!motionQuery.matches && !navigator.connection?.saveData) {
    import('./hero3d.js').then(module => module.mountPhone(stage)).catch(() => {});
  }
  const pointerQuery = matchMedia('(hover: hover) and (pointer: fine)');
  const connection = navigator.connection;
  let stageVisible = false, pendingFrame = 0, point = null;
  const canAnimate = () => !stage.classList.contains('webgl-ready') && !motionQuery.matches && pointerQuery.matches && !connection?.saveData && (!navigator.hardwareConcurrency || navigator.hardwareConcurrency > 2) && stageVisible && !document.hidden;
  const resetStage = () => {
    cancelAnimationFrame(pendingFrame); pendingFrame = 0; point = null;
    stage.style.setProperty('--tilt-x', '0deg');
    stage.style.setProperty('--tilt-y', '0deg');
  };
  const drawStage = () => {
    pendingFrame = 0;
    if (!canAnimate() || !point) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (point.x - rect.left) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (point.y - rect.top) / rect.height * 2 - 1));
    stage.style.setProperty('--tilt-x', `${(-y * 3).toFixed(2)}deg`);
    stage.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`);
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    stageVisible = entries[0].isIntersecting;
    if (!stageVisible) resetStage();
  }).observe(stage);
  stage.addEventListener('pointermove', event => {
    if (!canAnimate()) return;
    point = {x:event.clientX, y:event.clientY};
    if (!pendingFrame) pendingFrame = requestAnimationFrame(drawStage);
  }, {passive:true});
  stage.addEventListener('pointerleave', resetStage, {passive:true});
  document.addEventListener('visibilitychange', resetStage);
  motionQuery.addEventListener('change', () => {resetStage(); configureReveals();});
  pointerQuery.addEventListener('change', resetStage);
  connection?.addEventListener('change', resetStage);
})();
