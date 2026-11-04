(() => {
  'use strict';
  const seenLinks=new WeakSet(), spotifyCache=new Map();
  function decorateLink(link){
    let url;try{url=new URL(link.href);if(!['http:','https:'].includes(url.protocol))return;}catch{return;}
    const domain=url.hostname.toLowerCase();let provider=domain.replace(/^www\./,'');
    let videoId='';if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(domain)){videoId=url.searchParams.get('v')||url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1]||'';}
    else if(domain==='youtu.be')videoId=url.pathname.slice(1).split('/')[0];
    if(!/^[A-Za-z0-9_-]{11}$/.test(videoId))videoId='';
    const spotify=domain==='open.spotify.com'&&url.pathname.match(/^\/(?:intl-[A-Za-z-]+\/)?(track|album|artist|playlist|episode|show)\/([A-Za-z0-9]{22})(?:\/|$)/);
    const label=document.createElement('span');label.className='link-card-copy';const name=document.createElement('strong');name.textContent=videoId?'YouTube':spotify?'Spotify':provider;const address=document.createElement('span');address.className='link-card-address';address.textContent=url.href;label.append(name,address);link.replaceChildren(label);
    function thumbnail(src){const image=document.createElement('img');image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>image.remove();image.src=src;link.prepend(image);}
    if(videoId)thumbnail('https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg');
    if(spotify){const canonical='https://open.spotify.com/'+spotify[1]+'/'+spotify[2];let request=spotifyCache.get(canonical);if(!request){request=fetch('https://open.spotify.com/oembed?url='+encodeURIComponent(canonical),{credentials:'omit',referrerPolicy:'no-referrer'}).then(r=>r.ok?r.json():null).catch(()=>null);spotifyCache.set(canonical,request);}request.then(meta=>{if(!meta||!link.isConnected)return;if(typeof meta.title==='string'&&meta.title.trim())name.textContent=meta.title.slice(0,300);try{const img=new URL(meta.thumbnail_url);if(img.protocol==='https:'&&img.hostname==='i.scdn.co')thumbnail(img.href);}catch{}});}
  }
  function discoverLinks(){document.querySelectorAll('a.external-post-link').forEach(link=>{if(!seenLinks.has(link)){seenLinks.add(link);decorateLink(link);}});}
  const observed = new WeakSet();
  const canPlay = video => !document.hidden && !video.closest('[hidden]') && (!video.closest('dialog') || video.closest('dialog').open);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
    if (isIntersecting && canPlay(target)) target.play().catch(()=>{}); else target.pause();
  }), {threshold: .1}) : null;
  function discoverVideos() {
    document.querySelectorAll('video.portfolio-video').forEach(video => {
      if (observed.has(video)) return; observed.add(video);
      if (observer) observer.observe(video); else if (canPlay(video)) video.play().catch(()=>{});
    });
  }
  const sections = [
    ['photographs','[data-post-id]'], ['collections','[data-collection-id]'],
    ['journal','[data-journal-id]'], ['photo-dump','.photo-dump-tile']
  ];
  let active = new Map();
  function filter(section, selector, selected) {
    section.querySelectorAll(selector).forEach(item => {
      const matches = !selected || (item.dataset.tags || '').split(',').some(tag => tag.toLocaleLowerCase() === selected.toLocaleLowerCase());
      const container = item.closest('.home-post-item') || item;
      container.hidden = !matches;
    });
    section.querySelectorAll('.year-section').forEach(group => {group.hidden = ![...group.querySelectorAll('[data-post-id]')].some(item=>!item.hidden);});
    section.querySelectorAll('.hashtag-filter button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.tag === selected)));
  }
  function buildFilters() {
    sections.forEach(([id,selector])=>{
      const section=document.getElementById(id); if(!section) return;
      let bar=section.querySelector(':scope > .hashtag-filter');
      if(bar)bar.remove();
      const names=[...new Set([...section.querySelectorAll(selector)].flatMap(item=>(item.dataset.tags||'').split(',').filter(Boolean)))];
      if (!names.length) return;
      bar=document.createElement('div');bar.className='hashtag-filter';bar.setAttribute('aria-label','Filter by hashtag');
      const make=(label,value)=>{const b=document.createElement('button');b.type='button';b.dataset.tag=value;b.textContent=label;return b;};
      bar.append(make('All',''));names.forEach(name=>bar.append(make('#'+name,name)));
      const heading=section.querySelector('.section-heading, .journal-heading');if(heading)heading.after(bar);else section.prepend(bar);
      filter(section,selector,active.get(id)||'');
    });
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button[data-tag]');if(!button)return;
    const dialog=button.closest('.photo-dump-viewer');const section=dialog?document.getElementById('photo-dump'):button.closest('#photographs,#collections,#journal,#photo-dump');if(!section)return;
    const config=sections.find(([id])=>id===section.id);if(!config)return;
    if(dialog)dialog.close();
    const selected=button.dataset.tag||'';active.set(section.id,selected);if(selected&&document.body.dataset.view==='home'){location.hash=section.id==='photographs'?'#photographs':section.id==='photo-dump'?'#photo-dump':'#'+section.id;return;}filter(section,config[1],selected);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video.portfolio-video').forEach(video=>video.pause());else document.querySelectorAll('video.portfolio-video').forEach(video=>{const rect=video.getBoundingClientRect();if(canPlay(video)&&rect.bottom>0&&rect.top<innerHeight)video.play().catch(()=>{});});});
  document.addEventListener('close',event=>{if(event.target instanceof HTMLDialogElement)event.target.querySelectorAll('video').forEach(video=>video.pause());},true);
  const mo=new MutationObserver(()=>{discoverVideos();discoverLinks();});mo.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('portfolio-ready',()=>{buildFilters();discoverVideos();});
  window.addEventListener('hashchange',()=>{requestAnimationFrame(()=>{buildFilters();discoverVideos();});});
  buildFilters();discoverVideos();discoverLinks();
})();
