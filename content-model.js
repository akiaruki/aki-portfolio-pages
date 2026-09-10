/* Shared content rules. Existing content.js files remain compatible. */
(function(root){
  const copyFields = {
    siteLabel:['Site label','Photographs & field notes'],
    heroEyebrow:['Hero small heading','A collection of quiet things'],
    heroNote:['Hero supporting text','Photographs from the natural world.\nA little closer. A little slower.'],
    featuredLabel:['Featured photo label','Selected photograph'],
    archiveLink:['Archive link','Wander through'],
    japaneseNote:['Small Japanese note','自然の中で、立ち止まる。'],
    archiveTitle:['Archive heading','Collected along the way'],
    archiveEyebrow:['Archive small heading','The photographic archive'],
    aboutLabel:['About small heading','A note from アキ'],
    journalNav:['Journal navigation label','Journal'],
    journalEyebrow:['Journal small heading','Not everything becomes a photograph'],
    journalTitle:['Journal heading','Notes from\nout there.'],
    journalNote:['Journal supporting text','Loose thoughts, written down\nbefore they disappear.'],
    backToTop:['Footer link','Back to the beginning'],
    collectionsTitle:['Collections heading','Small bodies of work'],
    collectionsNote:['Collections supporting text','Photographs in conversation with one another.'],
    sampleNotice:['Sample-content notice','Sample photography courtesy of Unsplash. Journal text is illustrative.']
  };
  const text=(v,label,max=2000)=>{if(typeof v!=='string'||v.length>max)throw Error(`${label} must be plain text, at most ${max} characters.`);return v};
  const safePath=v=>typeof v==='string'&&(/^(https?:)\/\//i.test(v)||/^(?:photos\/)[a-zA-Z0-9._-]+$/i.test(v));
  function normalizeBase(input){
    if(!input||typeof input!=='object'||!Array.isArray(input.photos)||!Array.isArray(input.journal))throw Error('Choose a collection with photographs and journal entries.');
    if(input.photos.length>2000||input.journal.length>2000)throw Error('A collection can contain up to 2,000 photographs and 2,000 notes.');
    const out={name:text(input.name??'アキ','Name',100),intro:text(input.intro??'','Hero text'),about:text(input.about??'','About',10000),copy:{},photos:[],journal:[]};
    for(const [key,[label,fallback]]of Object.entries(copyFields))out.copy[key]=text(input.copy?.[key]??fallback,label);
    const ids=new Set();
    out.photos=input.photos.map((p,i)=>{
      if(!p||typeof p!=='object')throw Error(`Photograph ${i+1} is invalid.`);
      const id=text(p.id??`photo-${i+1}`,'Photograph ID',150);
      if(!id||ids.has(id))throw Error('Every photograph must have a unique ID.');ids.add(id);
      const result={id};for(const key of ['title','place','date','src','alt','credit','source'])result[key]=text(p[key]??'',`Photograph ${i+1}: ${key}`);
      if(result.src&&!safePath(result.src))throw Error(`Photograph ${i+1}: use photos/filename.jpg or an HTTP(S) image URL.`);
      if(result.source&&!/^https?:\/\//i.test(result.source))throw Error(`Photograph ${i+1}: credit links must use HTTP or HTTPS.`);
      result.year=Number(p.year);if(!Number.isInteger(result.year)||result.year<1800||result.year>2200)throw Error(`Photograph ${i+1}: enter a year between 1800 and 2200.`);
      result.shape=['wide','landscape','portrait'].includes(p.shape)?p.shape:'landscape';return result;
    });
    out.featuredId=ids.has(input.featuredId)?input.featuredId:out.photos[0]?.id??null;
    out.journal=input.journal.map((entry,i)=>{if(!entry||typeof entry!=='object')throw Error(`Journal entry ${i+1} is invalid.`);return {date:text(entry.date??'','Journal date',10),title:text(entry.title??'','Journal title'),body:text(entry.body??'','Journal note',50000)}});
    return out;
  }
  function validateBase(input){const out=normalize(input);out.photos.forEach((p,i)=>{if(!p.title.trim()||!p.src||!p.alt.trim())throw Error(`Photograph ${i+1}: add a title, image, and image description.`)});out.journal.forEach((j,i)=>{const d=new Date(j.date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(j.date)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==j.date||!j.title.trim())throw Error(`Journal entry ${i+1}: add a title and a valid date.`)});return out;}
  function parse(raw){return normalize(JSON.parse(raw.trim().replace(/^window\.PORTFOLIO\s*=\s*/,'').replace(/;\s*$/,'')));}
  function serialize(input){return 'window.PORTFOLIO = '+JSON.stringify(validate(input),null,2).replace(/</g,'\\u003c')+';\n';}
  function list(value,label){if(!Array.isArray(value)||value.length>2000)throw Error(label+' must be a list of at most 2,000 items.');return value;}
  function realDate(value){const d=new Date(value+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
  function tags(value){return list(value??[],'Tags').map(v=>text(v,'Tag',80)).slice(0,30);}
  function normalize(input){
    const out=normalizeBase(input);out.schemaVersion=3;
    out.photos=out.photos.map((p,i)=>({...p,capturedOn:text(input.photos[i].capturedOn??'','Photo date',10),story:text(input.photos[i].story??'','Photo story',20000),tags:tags(input.photos[i].tags),sample:input.photos[i].sample===true}));
    const photoIds=new Set(out.photos.map(p=>p.id));
    function refs(value,label,max=2000){const result=list(value,label).map(v=>text(v,label,150));if(result.length>max)throw Error(label+' supports at most '+max+' photographs.');if(new Set(result).size!==result.length)throw Error(label+' contains duplicate photographs.');if(result.some(id=>!photoIds.has(id)))throw Error(label+' refers to a missing photograph.');return result;}
    out.showcaseIds=input.schemaVersion>=3?refs(input.showcaseIds??[],'Showcase'):out.featuredId?[out.featuredId]:[];
    out.featuredId=out.showcaseIds[0]??null;
    function groups(source,kind){const ids=new Set();return list(source,kind).map((entry,i)=>{if(!entry||typeof entry!=='object')throw Error(kind+' entry is invalid.');const id=text(entry.id??kind+'-'+(i+1),kind+' ID',150);if(!id||ids.has(id))throw Error(kind+' IDs must be unique.');ids.add(id);const item={id,title:text(entry.title??'',kind+' title'),description:text(entry.description??'',kind+' description',50000),photoIds:refs(entry.photoIds??[],kind+' '+(i+1),kind==='Post'?9:2000),published:entry.published===true,sample:entry.sample===true,tags:tags(entry.tags)};if(kind==='Post'){item.date=text(entry.date??'','Post date',10);item.location=text(entry.location??'','Post location');}else{item.subtitle=text(entry.subtitle??'','Collection subtitle');item.coverId=text(entry.coverId??item.photoIds[0]??'','Cover photo ID',150);if(item.coverId&&!item.photoIds.includes(item.coverId))throw Error('A collection cover must belong to that collection.');}return item;})}
    out.posts=groups(input.posts??[],'Post');
    const legacyCollections=input.schemaVersion>=3?[]:out.photos.length?[{id:'preserved-gallery',title:'Earlier gallery',description:'Photographs preserved from the previous collection.',photoIds:out.photos.map(p=>p.id),coverId:out.featuredId??out.photos[0].id,published:true}]:[];
    out.collections=groups(input.collections??legacyCollections,'Collection');
    out.journal=out.journal.map((j,i)=>({...j,id:text(input.journal[i].id??'note-'+(i+1),'Journal ID',150),published:input.journal[i].published!==false,sample:input.journal[i].sample===true}));
    if(new Set(out.journal.map(j=>j.id)).size!==out.journal.length)throw Error('Journal IDs must be unique.');
    return out;
  }
  function validate(input){const out=validateBase(input);for(const photo of out.photos)if(photo.capturedOn&&!realDate(photo.capturedOn))throw Error('Enter a valid date for '+photo.title+'.');for(const post of out.posts){if(post.date&&!realDate(post.date))throw Error('Enter a valid date for '+(post.title||'your post')+'.');if(post.published&&(!post.title.trim()||!realDate(post.date)||post.photoIds.length<1))throw Error('A visible post needs a title, date, and 1–9 photographs.');}for(const collection of out.collections)if(collection.published&&(!collection.title.trim()||!collection.photoIds.length||!collection.coverId))throw Error('A visible collection needs a title, photographs, and a cover.');return out;}
  function removePhoto(content,id){content.photos=content.photos.filter(p=>p.id!==id);content.showcaseIds=content.showcaseIds.filter(value=>value!==id);content.featuredId=content.showcaseIds[0]??null;for(const group of [...content.posts,...content.collections]){group.photoIds=group.photoIds.filter(value=>value!==id);if(group.coverId===id)group.coverId=group.photoIds[0]??'';if(!group.photoIds.length)group.published=false;}}
  const api={copyFields,normalize,validate,parse,serialize,safePath,realDate,removePhoto};root.PortfolioContent=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
