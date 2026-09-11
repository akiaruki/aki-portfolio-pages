/* Public exhibition, evolved from the original gallery and lightbox. */
(async function(){
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let raw=window.PORTFOLIO,overrides={},previewTarget=null;
if(location.hash==='#studio-preview'&&window.opener){
  const draft=await new Promise(resolve=>{const timeout=setTimeout(()=>resolve(null),4000);function receive(event){if(event.source!==window.opener||event.data?.type!=='aki-preview-data')return;if(location.origin!=='null'&&event.origin!==location.origin)return;clearTimeout(timeout);window.removeEventListener('message',receive);resolve(event.data)}window.addEventListener('message',receive);window.opener.postMessage({type:'aki-preview-ready'},location.origin==='null'?'*':location.origin)});
  if(draft){raw=draft.content;overrides=draft.images||{};previewTarget=draft.target;const note=document.createElement('p');note.className='preview-notice';note.textContent='Studio preview · unsaved content · not published';document.body.prepend(note)}
}
let data;try{data=PortfolioContent.normalize(raw)}catch(error){$('#featured').textContent='This collection could not be opened. Please check the content file in the studio.';return}
const photos=data.photos,photoMap=new Map(photos.map(p=>[p.id,p]));
const safeURL=value=>{if(!value)return '';try{const url=new URL(value,location.href);return ['http:','https:','file:'].includes(url.protocol)?url.href:''}catch{return ''}};
const imageURL=p=>typeof overrides[p.id]==='string'&&overrides[p.id].startsWith('blob:')?overrides[p.id]:safeURL(p.src);
const formatDate=value=>{if(!PortfolioContent.realDate(value))return value;return new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})};
const sampleLabel=item=>item.sample?'<span class="sample-label">Sample</span>':'';
function photoMarkup(p,{featured=false,framed=false,index=0}={}){return `<figure class="${featured?'featured-figure':escape(p.shape)+' reveal'} ${framed?'glass-frame':''}"><button class="photo-button" data-photo="${photos.indexOf(p)}" aria-label="View ${escape(PortfolioContent.photoTitle(p)||'photograph')}"><img src="${escape(imageURL(p))}" alt="${escape(p.alt||PortfolioContent.photoTitle(p)||'Photograph')}" ${featured?'fetchpriority="high"':'loading="lazy"'} decoding="async"></button><figcaption><div><h3>${escape(PortfolioContent.photoTitle(p))}</h3>${p.place?`<p>${escape(p.place)}</p>`:''}</div><span class="photo-number">${String(index+1).padStart(2,'0')}</span></figcaption></figure>`}
document.querySelectorAll('.wordmark,.signature').forEach(el=>{el.textContent=data.name;if(el.tagName==='A')el.setAttribute('aria-label',data.name+' home')});
$('#intro').textContent=data.intro;$('#intro').style.whiteSpace='pre-line';$('#about-copy').textContent=data.about;
const copyTargets={siteLabel:'.header-label,footer>span',heroEyebrow:'.opening-text>.eyebrow',heroNote:'.intro-note',japaneseNote:'.japanese',archiveTitle:'#archive-title',archiveEyebrow:'#photographs .section-heading>.eyebrow',aboutLabel:'.about>.eyebrow',journalEyebrow:'.journal-heading>.eyebrow',journalTitle:'.journal-heading>h2',journalNote:'.journal-heading>p',sampleNotice:'.demo-note',collectionsTitle:'#collections-title',collectionsNote:'.collections-note'};
for(const [key,selector]of Object.entries(copyTargets))document.querySelectorAll(selector).forEach(el=>el.textContent=data.copy[key]);
function linkText(selector,text,arrow){const el=$(selector);el.replaceChildren(document.createTextNode(text+' '));const span=document.createElement('span');span.textContent=arrow;span.setAttribute('aria-hidden','true');el.append(span)}
linkText('.journal-link',data.copy.journalNav,'↗');linkText('footer>a:last-of-type',data.copy.backToTop,'↑');

document.title=data.name+' — '+data.copy.siteLabel;
const showcase=data.showcaseIds.map(id=>photoMap.get(id));
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
function renderShowcase(){
 if(!showcase.length){$('#featured').innerHTML='<div class="showcase-empty"><p>The first photographs will find their place here.</p></div>';return;}
 $('#featured').innerHTML='<p class="sr-only" id="showcase-help">Scroll horizontally, swipe, or use Left and Right Arrow keys to explore. Select a photograph to enlarge it.</p><div class="showcase-track" role="region" aria-label="Selected photographs" aria-describedby="showcase-help" tabindex="0">'+showcase.map((p,i)=>
 '<figure class="featured-figure" role="group" aria-label="Photograph '+(i+1)+' of '+showcase.length+'"><button class="photo-button" data-photo="'+photos.indexOf(p)+'" aria-label="View '+escape(PortfolioContent.photoTitle(p)||'photograph')+'"><img src="'+escape(imageURL(p))+'" alt="'+escape(p.alt||PortfolioContent.photoTitle(p)||'Photograph')+'" draggable="false" '+(i===0?'fetchpriority="high"':'loading="lazy"')+' decoding="async"></button></figure>'
 ).join('')+'</div>';
 const track=$('.showcase-track'),frames=[...track.children];
 // A duplicate first frame lets the final slide continue forward before an invisible reset.
 const loopFrame=frames.length>1?frames[0].cloneNode(true):null;
 if(loopFrame){loopFrame.setAttribute('aria-hidden','true');loopFrame.querySelector('button').tabIndex=-1;loopFrame.querySelector('img').loading='eager';track.append(loopFrame);}
 const displayFrames=loopFrame?[...frames,loopFrame]:frames;
 const nearest=()=>displayFrames.reduce((best,frame,i)=>Math.abs(frame.offsetLeft-track.scrollLeft)<Math.abs(displayFrames[best].offsetLeft-track.scrollLeft)?i:best,0)%frames.length;
 track.addEventListener('scroll',()=>{if(loopFrame&&track.clientWidth&&Math.abs(track.scrollLeft-loopFrame.offsetLeft)<1){track.scrollTo({left:0,behavior:'instant'});}},{passive:true});
 function advanceShowcase(){const index=nearest();if(index===frames.length-1&&loopFrame)track.scrollTo({left:loopFrame.offsetLeft,behavior:motion()});else go(index+1);}

 function fitMobileShowcase(){
  if(!matchMedia('(max-width:760px)').matches||!track.clientWidth)return;
  const img=frames[nearest()]?.querySelector('img');if(!img?.naturalWidth)return;
  const height=Math.min(track.clientWidth*img.naturalHeight/img.naturalWidth,window.innerHeight*.65);
  track.style.setProperty('--showcase-mobile-height',height+'px');
 }
 let sizeFrame=0;function scheduleShowcaseSize(){cancelAnimationFrame(sizeFrame);sizeFrame=requestAnimationFrame(fitMobileShowcase);}
 frames.forEach(frame=>frame.querySelector('img').addEventListener('load',scheduleShowcaseSize));
 track.addEventListener('scroll',scheduleShowcaseSize,{passive:true});window.addEventListener('resize',scheduleShowcaseSize);
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(scheduleShowcaseSize).observe(track);
 scheduleShowcaseSize();
 function go(index,focus=false){index=Math.max(0,Math.min(frames.length-1,index));if(focus)frames[index].querySelector('button').focus({preventScroll:true});track.scrollTo({left:frames[index].offsetLeft,behavior:motion()});}
 if(frames.length>1){
  const navigation=document.createElement('div');navigation.className='showcase-dots';navigation.setAttribute('role','group');navigation.setAttribute('aria-label','Choose a Showcase photograph');
  const dots=frames.map((frame,i)=>{const dot=document.createElement('button');dot.type='button';dot.className='showcase-dot';dot.setAttribute('aria-label','Show photograph '+(i+1)+': '+(PortfolioContent.photoTitle(showcase[i])||''));dot.addEventListener('click',()=>go(i));navigation.append(dot);return dot;});
  track.after(navigation);
  function syncDots(){const index=nearest();dots.forEach((dot,i)=>{if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});}
  track.addEventListener('scroll',syncDots,{passive:true});window.addEventListener('resize',syncDots);syncDots();
  navigation.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const current=dots.indexOf(document.activeElement),index=Math.max(0,Math.min(dots.length-1,event.key==='Home'?0:event.key==='End'?dots.length-1:current+(event.key==='ArrowRight'?1:-1)));dots[index].focus({preventScroll:true});go(index);});
 }
 track.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?frames.length-1:nearest()+(event.key==='ArrowRight'?1:-1);go(index,true);});
 // Touch and trackpads use native scrolling. Only a deliberate mouse drag is handled.
 let drag=null,suppressClick=false;
 track.addEventListener('pointerdown',event=>{suppressClick=false;if(event.pointerType==='mouse'&&event.button===0)drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:track.scrollLeft,moving:false};});
 track.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id||!(event.buttons&1))return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.moving){if(Math.abs(dx)<8)return;if(Math.abs(dy)>Math.abs(dx)){drag=null;return;}drag.moving=true;track.classList.add('is-dragging');track.setPointerCapture(event.pointerId);}event.preventDefault();track.scrollLeft=drag.left-dx;});
 function finishDrag(event){if(!drag||event.pointerId!==drag.id)return;const moved=drag.moving;drag=null;track.classList.remove('is-dragging');if(track.hasPointerCapture(event.pointerId))track.releasePointerCapture(event.pointerId);if(moved){suppressClick=true;go(nearest());}}
 track.addEventListener('pointerup',finishDrag);track.addEventListener('pointercancel',finishDrag);
 track.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){suppressClick=false;event.preventDefault();event.stopPropagation();}},true);
 track.addEventListener('dragstart',event=>event.preventDefault());

 if(frames.length>1){
  const host=$('#featured'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let timer=0,paused=reduced.matches,hovering=false,holding=false,focused=false;
  const pause=document.createElement('button');pause.type='button';pause.className='showcase-playback';
  function label(){pause.textContent='';pause.dataset.paused=String(paused);pause.setAttribute('aria-label',paused?'Play Showcase slideshow':'Pause Showcase slideshow');}
  function blocked(){return paused||hovering||holding||focused||document.hidden||!track.getClientRects().length||!!document.querySelector('dialog[open]');}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(!blocked())advanceShowcase();schedule();},5000);}
  pause.addEventListener('click',()=>{paused=!paused;label();schedule();});
  host.querySelector('.showcase-dots').append(pause);label();
  host.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;schedule();}});
  host.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){hovering=false;schedule();}});
  host.addEventListener('pointerdown',()=>{holding=true;schedule();});
  function release(){if(holding){holding=false;schedule();}}
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  host.addEventListener('focusin',()=>{focused=host.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');schedule();});
  host.addEventListener('focusout',()=>{focused=false;schedule();});
  host.addEventListener('keydown',schedule);host.addEventListener('click',schedule);track.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{holding=false;schedule();});window.addEventListener('hashchange',schedule);
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',schedule));
  reduced.addEventListener('change',()=>{paused=reduced.matches;label();schedule();});schedule();
 }
 wireImageErrors(track);
}
renderShowcase();
document.addEventListener('contextmenu',event=>{if(event.target instanceof HTMLImageElement&&event.target.closest('#featured,#archive,#collection-wall,#story-content,#lightbox'))event.preventDefault();});
const posts=data.posts.filter(p=>p.published).sort((a,b)=>b.date.localeCompare(a.date));
const years=[...new Set(posts.map(p=>Number(p.date.slice(0,4))).filter(Number.isFinite))].sort((a,b)=>b-a);
function postPhotos(items){return '<div class="post-photos">'+items.map((p,i)=>photoMarkup(p,{index:i})).join('')+'</div>';}
function arrangePostPhotos(root){root.querySelectorAll('.post-photos img').forEach(img=>{const size=()=>{if(img.naturalWidth)(img.closest('.photo-block')||img.closest('figure')).dataset.narrow=String(img.naturalWidth/img.naturalHeight<=1.05);};if(img.complete)size();else img.addEventListener('load',size,{once:true});});}
function composedContent(item){if(item.composition==='split')return '<div class="split-entry"><div class="split-photo-stack post-photos">'+item.photoIds.map(id=>'<div class="content-block photo-block" data-align="full">'+photoMarkup(photoMap.get(id),{index:item.photoIds.indexOf(id)})+'</div>').join('')+'</div>'+(item.description?'<div class="split-writing"><p class="post-excerpt story-introduction">'+escape(item.description)+'</p></div>':'')+'</div>';return '<div class="post-photos composed-content">'+PortfolioContent.layoutFor(item).map((block,i)=>{if(block.key==='text')return item.description?'<div class="content-block writing-block" data-align="'+block.align+'"><p class="post-excerpt story-introduction">'+escape(item.description)+'</p></div>':'';const p=photoMap.get(block.key.slice(6));return '<div class="content-block photo-block" data-align="'+block.align+'">'+photoMarkup(p,{index:item.photoIds.indexOf(p.id)})+'</div>';}).join('')+'</div>';}
function postSummary(post){const items=post.photoIds.map(id=>photoMap.get(id));return `<article class="post-summary reveal" data-post-id="${escape(post.id)}"><div class="post-summary-text"><p class="eyebrow"><time datetime="${escape(post.date)}">${escape(formatDate(post.date))}</time> ${sampleLabel(post)}</p>${post.title.trim()?`<h3><a href="#post/${encodeURIComponent(post.id)}">${escape(post.title)}</a></h3>`:''}${post.location?`<p class="story-location">${escape(post.location)}</p>`:''}</div>${composedContent(post)}<a class="story-link" href="#post/${encodeURIComponent(post.id)}">Open post <span aria-hidden="true">↗</span></a></article>`;}

for(const year of years){const option=document.createElement('option');option.value=year;option.textContent=year;$('#year-select').append(option);}
const collections=data.collections.filter(c=>c.published);
const photographsDestination=$('.header-label').getAttribute('href'),collectionsDestination=$('nav .collections-link').getAttribute('href');
$('#view-all-photographs').setAttribute('href',photographsDestination);$('#view-all-collections').setAttribute('href',collectionsDestination);
let overviewHash=location.hash.startsWith('#post/')?photographsDestination:location.hash.startsWith('#collection/')?collectionsDestination:location.hash;
let renderedMode=null;
function renderOverview(){
 const view=overviewHash==='#collections'?'collections':overviewHash==='#journal'?'journal':overviewHash==='#photographs'||/^#year-/.test(overviewHash)?'posts':'home';
 document.body.dataset.view=view;
 $('.opening').hidden=view!=='home';$('.about').hidden=view!=='home';$('#photographs').hidden=!['home','posts'].includes(view);$('#collections').hidden=view!=='collections';$('#journal').hidden=view!=='journal';
 document.querySelectorAll('header nav a').forEach(link=>{if(link.hash===(view==='posts'?'#photographs':'#'+view))link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});

 const allPosts=overviewHash===photographsDestination||/^#year-[0-9]{4}$/.test(overviewHash),allCollections=overviewHash===collectionsDestination;
 const mode=String(allPosts)+String(allCollections);
 if(mode!==renderedMode){
  renderedMode=mode;
  const visiblePosts=allPosts?posts:posts.slice(0,6);
  $('#archive').innerHTML=years.map(year=>{const entries=visiblePosts.filter(post=>Number(post.date.slice(0,4))===year);return entries.length?'<section class="year-section" id="year-'+year+'" aria-label="Posts from '+year+'" tabindex="-1"><div class="year-marker">'+year+'<small>'+entries.length+' '+(entries.length===1?'entry':'entries')+'</small></div><div class="year-gallery post-feed">'+entries.map(postSummary).join('')+'</div></section>':'';}).join('')||'<p class="quiet-empty">The journey starts here. New photographic entries will appear as they are made.</p>';
  $('#view-all-photographs').hidden=allPosts||posts.length<=6;
  $('#collection-wall').innerHTML=(allCollections?collections:collections.slice(0,3)).map((collection,i)=>{const p=photoMap.get(collection.coverId);return '<article class="collection-preview reveal"><a class="collection-frame" href="#collection/'+encodeURIComponent(collection.id)+'" aria-label="Explore '+escape(collection.title)+'">'+(p?'<img src="'+escape(imageURL(p))+'" alt="'+escape(p.alt||PortfolioContent.photoTitle(p)||'Photograph')+'" loading="lazy" decoding="async">':'')+'</a><div class="collection-caption"><div><p class="eyebrow">Collection '+String(i+1).padStart(2,'0')+' '+sampleLabel(collection)+'</p><h3><a href="#collection/'+encodeURIComponent(collection.id)+'">'+escape(collection.title)+'</a></h3>'+(collection.subtitle?'<p>'+escape(collection.subtitle)+'</p>':'')+'</div><a class="glass-control" href="#collection/'+encodeURIComponent(collection.id)+'" aria-label="Explore '+escape(collection.title)+'">↗</a></div></article>';}).join('')||'<p class="quiet-empty">A space for photographs that belong together.</p>';
  $('#view-all-collections').hidden=allCollections||collections.length<=3;
  for(const host of [$('#archive'),$('#collection-wall')]){wireImageErrors(host);arrangePostPhotos(host);reveal(host);}
 }
 $('#year-select').value=/^#year-[0-9]{4}$/.test(overviewHash)?overviewHash.slice(6):'';
 $('#year-select').dispatchEvent(new Event('portfolio-year-sync'));
}
renderOverview();
$('#year-select').addEventListener('change',event=>{const hash=event.target.value?'#year-'+event.target.value:photographsDestination;if(location.hash===hash)route();else location.hash=hash;});
const journal=data.journal.filter(j=>j.published).sort((a,b)=>b.date.localeCompare(a.date));
$('#journal-entries').innerHTML=journal.map((entry,i)=>`<details class="journal-entry reveal" ${i===0?'open':''}><summary><time datetime="${escape(entry.date)}">${escape(formatDate(entry.date))} ${entry.sample?'· Sample':''}</time><h3>${escape(entry.title)}</h3></summary><p class="entry-body" style="text-align:${entry.textAlign||'left'}">${escape(entry.body)}</p></details>`).join('')||'<p class="quiet-empty">A few thoughts will find their way here soon.</p>';
$('.demo-note').hidden=![...showcase,...posts,...collections,...journal].some(item=>item.sample);
let active=0,viewerPhotos=showcase,storyPhotos=[],previousFocus=null;
const dialog=$('#lightbox'),story=$('#story-view');
function showPhoto(index){if(!viewerPhotos.length)return;active=(index+viewerPhotos.length)%viewerPhotos.length;const p=viewerPhotos[active];$('#lightbox-image').src=imageURL(p);$('#lightbox-image').alt=p.alt||PortfolioContent.photoTitle(p)||'Photograph';$('#lightbox-title').textContent=PortfolioContent.photoTitle(p)||'Photograph';$('#lightbox-meta').textContent=[p.place,p.sample?'Sample photograph':p.capturedOn?formatDate(p.capturedOn):p.date?[p.date,p.year].filter(Boolean).join(' '):''].filter(Boolean).join(' · ');$('#lightbox-story').textContent=p.story;$('#lightbox-story').hidden=!p.story;$('#lightbox-count').textContent=`${String(active+1).padStart(2,'0')} / ${String(viewerPhotos.length).padStart(2,'0')}`;$('#lightbox-credit').innerHTML=p.credit?`Photograph by ${p.source?`<a href="${escape(safeURL(p.source))}" target="_blank" rel="noopener noreferrer">${escape(p.credit)} ↗</a>`:escape(p.credit)}`:'';$('.previous').hidden=$('.next').hidden=viewerPhotos.length<2;dialog.scrollTop=0;}
document.addEventListener('click',event=>{const button=event.target.closest('[data-photo]');if(!button)return;const p=photos[Number(button.dataset.photo)];const feedPost=button.closest('[data-post-id]');viewerPhotos=button.closest('#story-view')?storyPhotos:feedPost?data.posts.find(post=>post.id===feedPost.dataset.postId).photoIds.map(id=>photoMap.get(id)):showcase;if(!viewerPhotos.includes(p))viewerPhotos=[p];previousFocus=button;showPhoto(viewerPhotos.indexOf(p));dialog.showModal()});
$('.close').addEventListener('click',()=>dialog.close());$('.previous').addEventListener('click',()=>showPhoto(active-1));$('.next').addEventListener('click',()=>showPhoto(active+1));dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(active-1)}if(e.key==='ArrowRight'){e.preventDefault();showPhoto(active+1)}});dialog.addEventListener('close',()=>previousFocus?.focus({preventScroll:true}));
function openStory(kind,id,allowDraft=false){const item=(kind==='post'?data.posts:data.collections).find(item=>item.id===id&&(allowDraft||item.published));if(!item)return;storyPhotos=item.photoIds.map(id=>photoMap.get(id));$('#story-content').className=kind==='post'?'magazine':'collection-exhibition';$('#story-content').innerHTML=`<div class="story-heading"><p class="eyebrow">${kind==='post'?escape(formatDate(item.date)):'A collection'} ${sampleLabel(item)}</p><h1 id="story-title"${item.title.trim()?'':' class="sr-only"'}>${escape(item.title||'Post')}</h1>${item.subtitle?`<p class="story-subtitle">${escape(item.subtitle)}</p>`:''}${item.location?`<p class="story-location">${escape(item.location)}</p>`:''}</div>${composedContent(item)}<p class="story-end">${storyPhotos.length} photographs · ${escape(data.name)}</p>`;if(!story.open)story.showModal();story.scrollTop=0;wireImageErrors(story);arrangePostPhotos(story);reveal(story);$('.story-close').focus({preventScroll:true});}
function closeStory(restore=true){if(dialog.open)dialog.close();if(story.open)story.close();if(restore&&(location.hash.startsWith('#post/')||location.hash.startsWith('#collection/')))history.replaceState(null,'',location.pathname+location.search+overviewHash);}
$('.story-close').addEventListener('click',()=>closeStory());story.addEventListener('cancel',event=>{event.preventDefault();closeStory();});$('.story-toolbar .wordmark').addEventListener('click',()=>closeStory());
function route(){
 const match=location.hash.match(/^#(post|collection)\/(.+)$/);
 if(match){try{openStory(match[1],decodeURIComponent(match[2]));}catch{closeStory();}}
 else{
  if(story.open)closeStory(false);overviewHash=location.hash;renderOverview();
  if(/^#(?:photographs|collections|journal|year-\d{4})$/.test(overviewHash)){const target=document.getElementById(overviewHash.slice(1));requestAnimationFrame(()=>{target?.focus({preventScroll:true});if(overviewHash==='#photographs')window.scrollTo({top:0,behavior:'instant'});else target?.scrollIntoView({behavior:motion()});});}
 }
}
document.querySelectorAll('header .posts-link').forEach(link=>link.addEventListener('click',event=>{if(location.hash==='#photographs'){event.preventDefault();window.scrollTo({top:0,behavior:'instant'});}}));
window.addEventListener('hashchange',route);route();if(previewTarget)openStory(previewTarget.kind,previewTarget.id,true);
function wireImageErrors(root){root.querySelectorAll('img').forEach(img=>{img.addEventListener('error',()=>{img.classList.add('failed-image');img.alt='Photograph unavailable — '+img.alt},{once:true})})}
function reveal(root){if(!('IntersectionObserver'in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.body.classList.add('motion-ready');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.06});root.querySelectorAll('.reveal').forEach(el=>observer.observe(el))}
wireImageErrors(document);reveal(document);window.portfolioReady=true;window.dispatchEvent(new Event('portfolio-ready'));
})();
