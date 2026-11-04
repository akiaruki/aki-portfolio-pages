(() => {
  const host = document.getElementById('journal-preview-window');
  if (!host || !window.PORTFOLIO || !window.PortfolioContent) return;
  let data;
  try { data = window.PortfolioContent.normalize(window.PORTFOLIO); } catch (_) { return; }
  const entries = data.journal.filter(entry => entry.published).sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
  if (!entries.length) { const empty = document.createElement('p'); empty.className = 'journal-preview-empty'; empty.textContent = 'Journal entries will appear here.'; host.replaceChildren(empty); return; }
  host.replaceChildren(...entries.map(entry => {
    const link = document.createElement('a'); link.className = 'journal-preview-item'; link.href = '#journal';
    const time = document.createElement('time'); time.dateTime = entry.date;
    time.textContent = window.PortfolioContent.realDate(entry.date) ? new Date(entry.date + 'T12:00:00').toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}) : entry.date;
    const body = document.createElement('p'); body.textContent = entry.body.length > 180 ? entry.body.slice(0,177).trimEnd() + '…' : entry.body;
    link.append(time,body); return link;
  }));
})();
