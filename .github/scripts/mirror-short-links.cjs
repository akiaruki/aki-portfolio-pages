'use strict';
// Only previously recorded files may be changed or removed at the destination.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [sourceArg, targetArg] = process.argv.slice(2);
if (!sourceArg || !targetArg) throw Error('Usage: node mirror-short-links.cjs SOURCE ROOT_PAGES');
const source = path.resolve(sourceArg), target = path.resolve(targetArg);
const appDirs = ['aki-studio', 'aki-camera', 'aki-gazette', 'aki-moments'];
const portfolioFiles = ['index.html','portfolio-icon.svg','app.js','app-menu.js','content-model.js','content.js','year-menu.js','portfolio.css','palette.css','exhibition.css','style.css','aki-landing.css','home-showcase.css','home-showcase.js','project-showcase.css','project-showcase.js','photo-dump.css','photo-dump.js','photo-dump-data.js'];
const manifestName = 'portfolio/.aki-mirror-manifest.json';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const allowed = name => /^(?:portfolio|aki-studio|aki-camera|aki-gazette|aki-moments)\/[A-Za-z0-9._ /-]+$/.test(name) && !name.split('/').some(p=>p==='.' || p==='..' || !p);
function targetFile(name) {
  if (!allowed(name)) throw Error('Unsafe mirror path: '+name);
  const parts = name.split('/');
  for (let i=1;i<=parts.length;i++) {
    const part = path.join(target,...parts.slice(0,i));
    try { if (fs.lstatSync(part).isSymbolicLink()) throw Error('Destination contains a symbolic link: '+name); }
    catch (error) { if (error.code!=='ENOENT') throw error; }
  }
  return path.join(target,...parts);
}
const output = new Map();
function addFile(from,name) {
  if (!allowed(name) || name===manifestName || output.has(name)) throw Error('Invalid or repeated source path: '+name);
  if (!fs.lstatSync(from).isFile()) throw Error('Source is not a regular file: '+from);
  let data=fs.readFileSync(from);
  if (name.endsWith('.html')) {
    let html=data.toString('utf8');
    html=html.replaceAll('https://akiaruki.github.io/aki-portfolio-pages/aki-','https://akiaruki.github.io/aki-')
      .replaceAll('https://akiaruki.github.io/aki-portfolio-pages/','https://akiaruki.github.io/portfolio/');
    if (name==='portfolio/index.html') html=html.replace(/(href=["'])aki-(studio|camera|gazette|moments)\//g,'$1../aki-$2/');
    else if (appDirs.some(dir=>name.startsWith(dir+'/'))) html=html.replace(/(href=)(["'])\.\.\/\2/g,'$1$2../portfolio/$2').replaceAll('../aki-landing.css','../portfolio/aki-landing.css');
    data=Buffer.from(html);
  }
  output.set(name,data);
}
function addTree(from,prefix) {
  if (!fs.existsSync(from) || !fs.lstatSync(from).isDirectory()) throw Error('Missing source directory: '+from);
  for (const entry of fs.readdirSync(from,{withFileTypes:true})) {
    if (entry.isSymbolicLink()) throw Error('Source contains a symbolic link: '+entry.name);
    const child=path.join(from,entry.name), name=prefix+'/'+entry.name;
    if (entry.isDirectory()) addTree(child,name);
    else if (entry.isFile()) addFile(child,name);
    else throw Error('Unsupported source entry: '+child);
  }
}
for (const name of portfolioFiles) addFile(path.join(source,name),'portfolio/'+name);
addTree(path.join(source,'photos'),'portfolio/photos');
if (fs.existsSync(path.join(source,'photo-dump-media'))) addTree(path.join(source,'photo-dump-media'),'portfolio/photo-dump-media');
for (const dir of appDirs) addTree(path.join(source,dir),dir);
const manifestPath=targetFile(manifestName);
let previous={};
if (fs.existsSync(manifestPath)) {
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if (manifest.version!==1 || !manifest.files || Array.isArray(manifest.files) || typeof manifest.files!=='object') throw Error('Invalid previous mirror manifest.');
  previous=manifest.files;
  for (const [name,hash] of Object.entries(previous)) if (!allowed(name) || name===manifestName || !/^[a-f0-9]{64}$/.test(hash)) throw Error('Unsafe previous mirror manifest.');
}
// Preflight every existing owned destination before making any changes.
for (const name of new Set([...Object.keys(previous),...output.keys()])) {
  const file=targetFile(name);
  if (!fs.existsSync(file)) continue;
  if (!fs.statSync(file).isFile()) throw Error('Destination path is not a file: '+name);
  const current=digest(fs.readFileSync(file)), desired=output.has(name)?digest(output.get(name)):null;
  if (current!==previous[name] && current!==desired) throw Error('Destination has an independently changed file: '+name);
}
// GitHub Pages must serve names beginning with an underscore. Preserve an existing file.
const noJekyll=path.join(target,'.nojekyll');
let createNoJekyll=false;
try {
  if (!fs.lstatSync(noJekyll).isFile()) throw Error('The existing .nojekyll is not a regular file.');
} catch (error) {
  if (error.code!=='ENOENT') throw error;
  createNoJekyll=true;
}
for (const name of Object.keys(previous)) if (!output.has(name)) {const file=targetFile(name);if(fs.existsSync(file)) fs.unlinkSync(file);}
for (const [name,data] of output) {const file=targetFile(name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
if (createNoJekyll) fs.writeFileSync(noJekyll,'',{flag:'wx'});
const hashes=Object.fromEntries([...output].sort(([a],[b])=>a.localeCompare(b)).map(([name,data])=>[name,digest(data)]));
fs.mkdirSync(path.dirname(manifestPath),{recursive:true});
fs.writeFileSync(manifestPath,JSON.stringify({version:1,files:hashes},null,2)+'\n');
console.log('Prepared '+output.size+' public files; unrelated destination files were preserved.');
