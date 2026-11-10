'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd();
const files=['index.html'];
function walk(dir){for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=dir+'/'+entry.name;if(entry.isDirectory())walk(name);else if(entry.isFile()&&name.endsWith('.html'))files.push(name);}}
for(const dir of ['aki-studio','aki-camera','aki-gazette','aki-moments'])walk(dir);
assert.equal(files.length,18,'All old HTML pages must be redirects');
for(const file of files){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 const relative=file==='index.html'?'portfolio/':file.replace(/index\.html$/,'');
 const target='https://akiaruki.github.io/'+relative;
 assert.ok(html.includes('<link rel="canonical" href="'+target+'">'),file+' canonical');
 assert.ok(html.includes('<meta http-equiv="refresh" content="0;url='+target+'">'),file+' immediate redirect');
 assert.ok(html.includes('<a href="'+target+'">Continue to the current page</a>'),file+' fallback');
 assert.ok(!/<script\b/i.test(html),file+' must not require JavaScript');
 assert.ok(Buffer.byteLength(html)<2000,file+' must not contain the retired landing page');
}
assert.ok(!fs.existsSync(path.join(root,'.github/workflows/mirror-short-links.yml')),'The retired mirror must not overwrite maintained pages');
assert.ok(!fs.existsSync(path.join(root,'.github/scripts/mirror-short-links.cjs')),'The retired copy helper must not be maintained');
console.log('Verified '+files.length+' old HTML redirects and retirement of the old mirror.');
