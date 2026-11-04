/* Public, in-page introductions for the four Aki apps. */
(() => {
  const root = document.getElementById('projects-showcase');
  if (!root) return;
  const assetPrefix = location.pathname.startsWith('/portfolio/') ? '../' : '';
  const apps = [
    { name: 'Aki Studio', subtitle: 'Photo editing', image: 'aki-studio/favicon-app.png', introduction: 'Aki Studio is a photo editor with Looks, color grading and tools for adjusting your photographs.' },
    { name: 'Aki Camera', subtitle: 'Camera & video', image: 'aki-camera/app-icon.png', introduction: 'Aki Camera brings camera capture, video recording and Aki Looks together for everyday photography.' },
    { name: 'Aki Gazette', subtitle: 'Layouts & design', image: 'aki-gazette/favicon-app.png', introduction: 'Aki Gazette is a creative workspace for arranging photographs, words and artwork into photo stories and graphics.' },
    { name: 'Aki Moments', subtitle: 'Video editing', image: 'aki-moments/moments-icon.png', introduction: 'Aki Moments is a video editor for combining clips, photographs, sound, text and animated chalk artwork.' }
  ];
  const heading = document.createElement('div');
  heading.className = 'section-heading';
  const title = document.createElement('h2');
  title.id = 'projects-showcase-title';
  title.textContent = 'My Mobile Apps';
  heading.append(title);
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Projects';
  heading.append(eyebrow);
  root.setAttribute('aria-labelledby', title.id);
  const grid = document.createElement('div');
  grid.className = 'project-showcase-grid';
  apps.forEach((app, index) => {
    const article = document.createElement('article');
    article.className = 'project-showcase-item';
    const button = document.createElement('button');
    button.className = 'project-showcase-button';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `project-introduction-${index}`);
    const image = document.createElement('img');
    image.className = 'project-showcase-icon';
    image.src = assetPrefix + app.image;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    const name = document.createElement('span');
    name.className = 'project-showcase-name';
    name.textContent = app.name;
    const subtitle = document.createElement('span');
    subtitle.className = 'project-showcase-subtitle';
    subtitle.textContent = app.subtitle;
    button.append(image, name, subtitle);
    const introduction = document.createElement('p');
    introduction.className = 'project-showcase-introduction';
    introduction.id = `project-introduction-${index}`;
    introduction.hidden = true;
    introduction.textContent = app.introduction;
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      introduction.hidden = expanded;
    });
    article.append(button, introduction);
    grid.append(article);
  });
  root.replaceChildren(heading, grid);
})();
