import fs from 'node:fs';
fs.mkdirSync('public',{recursive:true});
for(const name of ['index.html','style.css','app.js','regions.json','snapshots.json'])fs.copyFileSync(name,'public/'+name);
fs.mkdirSync('netlify/functions',{recursive:true});
fs.copyFileSync('api.mjs','netlify/functions/api.mjs');
