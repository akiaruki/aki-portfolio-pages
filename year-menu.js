(function initYearMenu(){
if(!window.portfolioReady){window.addEventListener("portfolio-ready",initYearMenu,{once:true});return;}
const $=s=>document.querySelector(s);
// Custom year panel shares the navigation's glass surface. The original select
// remains the single source of options and change events for archive navigation.
const yearSelect=$('#year-select');
const yearPicker=document.createElement('div');yearPicker.className='year-picker';
const yearTrigger=document.createElement('button');yearTrigger.type='button';yearTrigger.className='year-trigger';yearTrigger.id='year-trigger';
yearTrigger.setAttribute('aria-haspopup','listbox');yearTrigger.setAttribute('aria-expanded','false');yearTrigger.setAttribute('aria-controls','year-options');
const yearLabel=document.createElement('span');yearLabel.textContent='All years';
const chevron=document.createElement('span');chevron.className='year-chevron';chevron.setAttribute('aria-hidden','true');
yearTrigger.append(yearLabel,chevron);
const yearList=document.createElement('div');yearList.id='year-options';yearList.className='year-options';yearList.setAttribute('role','listbox');yearList.setAttribute('aria-label','Archive year');yearList.hidden=true;
const yearOptions=Array.from(yearSelect.options).map(option=>{const item=document.createElement('div');item.className='year-option';item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));item.tabIndex=-1;item.dataset.value=option.value;item.textContent=option.textContent;yearList.append(item);return item});
yearSelect.before(yearPicker);yearPicker.append(yearTrigger,yearList);yearSelect.hidden=true;
function updateYearLabel(){yearLabel.textContent=yearSelect.selectedOptions[0].textContent;yearTrigger.setAttribute('aria-label','Archive year: '+yearLabel.textContent);yearOptions.forEach(option=>option.setAttribute('aria-selected',String(option.dataset.value===yearSelect.value)))}
function closeYears(restore=false){yearList.hidden=true;yearTrigger.setAttribute('aria-expanded','false');if(restore)yearTrigger.focus()}
function openYears(index){yearList.hidden=false;yearTrigger.setAttribute('aria-expanded','true');(yearOptions[index??Math.max(0,yearSelect.selectedIndex)]).focus({preventScroll:true})}
function selectYear(option){yearSelect.value=option.dataset.value;updateYearLabel();closeYears(true);yearSelect.dispatchEvent(new Event('change',{bubbles:true}))}
yearTrigger.addEventListener('click',()=>yearList.hidden?openYears():closeYears());
yearTrigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openYears(event.key==='ArrowUp'?yearOptions.length-1:undefined)}});
yearList.addEventListener('click',event=>{const option=event.target.closest('[role="option"]');if(option)selectYear(option)});
yearList.addEventListener('keydown',event=>{const index=yearOptions.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?yearOptions.length-1:(index+(event.key==='ArrowDown'?1:-1)+yearOptions.length)%yearOptions.length;yearOptions[next].focus({preventScroll:true});yearOptions[next].scrollIntoView({block:'nearest'})}else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(index>=0)selectYear(yearOptions[index])}else if(event.key==='Escape'){event.preventDefault();closeYears(true)}else if(event.key==='Tab'){closeYears(true)}});
document.addEventListener('pointerdown',event=>{if(!yearPicker.contains(event.target))closeYears()});
yearPicker.addEventListener('focusout',event=>{if(!yearPicker.contains(event.relatedTarget))closeYears()});
yearSelect.addEventListener('change',updateYearLabel);yearSelect.addEventListener('portfolio-year-sync',updateYearLabel);updateYearLabel();

})();
