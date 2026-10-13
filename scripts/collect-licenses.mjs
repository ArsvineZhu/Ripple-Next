import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root=path.resolve(import.meta.dirname,'..');
const project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const seen=new Set(), licenses=[];
function find(name, origin) {
  let cursor=origin;
  while(true) {
    const candidate=path.join(cursor,'node_modules',name,'package.json');
    if(fs.existsSync(candidate))return path.dirname(candidate);
    const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;
  }
  try { let file=createRequire(path.join(origin,'package.json')).resolve(name);let cursor=path.dirname(file);
    while(path.dirname(cursor)!==cursor){const candidate=path.join(cursor,'package.json');if(fs.existsSync(candidate)&&JSON.parse(fs.readFileSync(candidate,'utf8')).name===name)return cursor;cursor=path.dirname(cursor);}
  }catch{}
  return null;
}
function visit(name, origin) {
  const folder=find(name,origin);if(!folder)return;
  const pkg=JSON.parse(fs.readFileSync(path.join(folder,'package.json'),'utf8'));
  const id=`${pkg.name}@${pkg.version}`;if(seen.has(id))return;seen.add(id);
  const files=fs.readdirSync(folder).filter(file=>/^(licen[sc]e|copying|notice)(\.|$)/i.test(file)&&fs.statSync(path.join(folder,file)).isFile());
  const text=files.map(file=>fs.readFileSync(path.join(folder,file),'utf8')).join('\n\n');
  let url=typeof pkg.repository==='string'?pkg.repository:pkg.repository?.url??pkg.homepage??'';
  url=url.replace(/^git\+/,'').replace(/^git:\/\//,'https://').replace(/\.git$/,'');if(!url.startsWith('https://'))url='';
  licenses.push({id,name:pkg.name,version:pkg.version,license:typeof pkg.license==='string'?pkg.license:pkg.license?.type??'See notices',url,text:text||`License: ${pkg.license??'See upstream distribution'}`});
  for(const dependency of Object.keys({...pkg.dependencies,...pkg.optionalDependencies}))visit(dependency,folder);
}
for(const name of Object.keys({...project.dependencies,...project.devDependencies}))visit(name,root);
for(const [name,folder] of [['LeonardSEO/liquid-glass-react','leonard'],['rdev/liquid-glass-react','rdev']])licenses.push({id:name,name,version:folder==='leonard'?'b857e5c':'ac48eab',license:'MIT',url:`https://github.com/${name}`,text:fs.readFileSync(path.join(root,'src/renderer/components/liquidGlass/vendor',folder,'LICENSE'),'utf8')});
const chromium=path.join(root,'node_modules/electron/dist/LICENSES.chromium.html');
if(fs.existsSync(chromium)) {
  const folder=path.join(root,'out/license-assets');fs.mkdirSync(folder,{recursive:true});fs.copyFileSync(chromium,path.join(folder,'LICENSES.chromium.html'));
  licenses.push({id:'Chromium',name:'Chromium and embedded components',version:'Electron distribution',license:'Multiple',url:'https://www.chromium.org/',text:'',format:'html'});
}
licenses.sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version));
const output=path.join(root,'src/assets/third-party/licenses.json');fs.writeFileSync(output,JSON.stringify(licenses,null,2)+'\n');
console.log(`Collected ${licenses.length} license records (${fs.statSync(output).size} bytes)`);
