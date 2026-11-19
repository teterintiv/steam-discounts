import fs from 'node:fs';
fs.mkdirSync('public',{recursive:true});
for(const name of ['index.html','style.css','app.js','regions.json','snapshots.json'])fs.copyFileSync(name,'public/'+name);
fs.mkdirSync('netlify/functions',{recursive:true});
for(const name of ['api.mjs','server.mjs'])fs.copyFileSync(name,'netlify/functions/'+name);
