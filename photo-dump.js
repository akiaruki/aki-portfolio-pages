(() => {
  'use strict';
  const section = document.getElementById('photo-dump');
  if (!section) return;

  // Keep this deliberately separate from PORTFOLIO's post/photo references:
  // older editors may publish that data without knowing about Dump.
  // Limit paths to a dedicated same-origin directory and never accept URLs,
  // encoded segments, traversals, markup, or scriptable SVG images.
  const pathPattern = /^photo-dump-media\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|avif|gif|mp4|webm)$/i;
  const datePattern = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
  const source = Array.isArray(window.AKI_PHOTO_DUMP) ? window.AKI_PHOTO_DUMP : [];
  const seenIds = new Set();
  const entries = source.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(entry.id) || seenIds.has(entry.id)) return [];
    if (typeof entry.src !== 'string' || !pathPattern.test(entry.src) || typeof entry.addedAt !== 'string' || !datePattern.test(entry.addedAt)) return [];
    const millis = Date.parse(entry.addedAt);
    if (!Number.isFinite(millis) || new Date(millis).toISOString().slice(0, 19) !== entry.addedAt.slice(0, 19)) return [];
    seenIds.add(entry.id);
    return [{ id: entry.id, src: entry.src, addedAt: entry.addedAt, millis, index, pinned: entry.pinned===true, hashtags:Array.isArray(entry.hashtags)?entry.hashtags.filter(x=>typeof x==='string'&&/^[\p{L}\p{N}_]{1,80}$/u.test(x)).slice(0,30):[], alt: typeof entry.alt === 'string' ? entry.alt.slice(0, 500) : '', caption: typeof entry.caption === 'string' ? entry.caption.slice(0, 5000) : '' }];
  }).sort((a, b) => Number(b.pinned)-Number(a.pinned) || b.millis - a.millis || a.index - b.index);

  const heading = document.createElement('div');
  heading.className = 'section-heading';
  const title = document.createElement('h2');
  title.id = 'photo-dump-title';
  title.textContent = 'Dump';
  const label = document.createElement('span');
  label.className = 'eyebrow';
  label.textContent = 'Photographs';
  heading.append(title, label);
  const grid = document.createElement('div');
  grid.className = 'photo-dump-grid';
  const empty = document.createElement('p');
  empty.className = 'photo-dump-empty';
  empty.textContent = 'Photographs added to Dump will appear here.';
  const viewAll = document.createElement('a');
  viewAll.className = 'story-link photo-dump-view-all';
  viewAll.href = '#photo-dump';
  viewAll.textContent = 'View Dump ↗';
  section.append(heading, grid, empty, viewAll);

  const viewer = document.createElement('dialog');
  viewer.className = 'photo-dump-viewer';
  viewer.setAttribute('aria-label', 'Dump photograph viewer');
  const viewerHeader = document.createElement('div');
  viewerHeader.className = 'photo-dump-viewer-header';
  const count = document.createElement('span');
  count.setAttribute('aria-live', 'polite');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close ×';
  close.setAttribute('aria-label', 'Close photograph');
  viewerHeader.append(count, close);
  let image = document.createElement('img');
  const detail = document.createElement('div'); detail.className = 'photo-dump-viewer-body';
  const writing = document.createElement('aside'); writing.className = 'photo-dump-viewer-writing'; writing.setAttribute('aria-label', 'Photo writing');
  const writingLabel = document.createElement('span'); writingLabel.className = 'eyebrow'; writingLabel.textContent = 'Dump';
  const caption = document.createElement('p'); caption.className = 'photo-dump-viewer-caption';
  writing.append(writingLabel, caption); detail.append(image, writing);
  const controls = document.createElement('div');
  controls.className = 'photo-dump-viewer-controls';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.textContent = '← Previous';
  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = 'Next →';
  controls.append(previous, next);
  viewer.append(viewerHeader, detail, controls);
  document.body.append(viewer);

  let current = 0;
  let displayed = [];
  let lastFocus = null;
  function show(index) {
    if (!displayed.length) return;
    current = (index + displayed.length) % displayed.length;
    const item = displayed[current];
    const replacement=document.createElement(/\.(mp4|webm)$/i.test(item.src)?'video':'img');
    if(replacement.tagName==='VIDEO'){replacement.controls=true;replacement.muted=true;replacement.loop=true;replacement.playsInline=true;replacement.preload='metadata';replacement.className='portfolio-video';replacement.setAttribute('aria-label',item.alt||'Dump video');}else replacement.alt=item.alt||'Dump photograph';
    replacement.src=item.src;image.replaceWith(replacement);image=replacement;
    caption.textContent = item.caption;
    writing.querySelectorAll('.hashtag-list').forEach(el=>el.remove());
    const tags=document.createElement('div');tags.className='hashtag-list';item.hashtags.forEach(tag=>{const b=document.createElement('button');b.type='button';b.className='hashtag';b.dataset.tag=tag;b.textContent='#'+tag;tags.append(b)});writing.append(tags);
    caption.hidden = !item.caption.trim();
    count.textContent = (current + 1) + ' / ' + displayed.length;
    previous.hidden = next.hidden = displayed.length < 2;
  }
  close.addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target !== viewer) return; const rect = viewer.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close(); });
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
  });
  viewer.addEventListener('close', () => { if(image.tagName==='VIDEO')image.pause(); lastFocus?.focus({ preventScroll: true }); });

  function render() {
    if (viewer.open) viewer.close();
    const isFull = location.hash === '#photo-dump' || location.hash === '#dump';
    section.classList.toggle('photo-dump-full', isFull);
    displayed = isFull ? entries : [...entries].sort((a,b)=>b.millis-a.millis || a.index-b.index).slice(0,9);
    grid.replaceChildren();
    displayed.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'photo-dump-tile';
      button.dataset.tags=entry.hashtags.join(',');
      button.setAttribute('aria-label', entry.alt ? 'View media: ' + entry.alt : 'View media ' + (index + 1));
      const thumbnail = document.createElement(/\.(mp4|webm)$/i.test(entry.src)?'video':'img');
      if(thumbnail.tagName==='VIDEO'){thumbnail.muted=true;thumbnail.loop=true;thumbnail.playsInline=true;thumbnail.preload='metadata';thumbnail.className='portfolio-video';}
      thumbnail.src = entry.src;
      thumbnail.alt = entry.alt;
      if(thumbnail.tagName==='IMG'){thumbnail.loading = 'lazy';thumbnail.decoding = 'async';}
      button.append(thumbnail);
      if(entry.hashtags.length){const tags=document.createElement('span');tags.className='dump-tags';tags.textContent=entry.hashtags.map(x=>'#'+x).join(' ');button.append(tags);}
      button.addEventListener('click', () => {
        lastFocus = button;
        show(index);
        viewer.showModal();
        close.focus({ preventScroll: true });
      });
      grid.append(button);
    });
    empty.hidden = displayed.length > 0;
    viewAll.hidden = isFull || entries.length === 0;
  }
  window.addEventListener('hashchange', render);
  render();
})();
