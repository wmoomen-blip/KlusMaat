(()=>{
const $=id=>document.getElementById(id);
const wood=['38 × 63','44 × 69','44 × 94','50 × 75','50 × 100'];
const metal=['CW/UW 50','CW/UW 75','CW/UW 100','CW/UW 125'];
const profile=$('w-profile');
function profiles(){const old=profile.value;profile.innerHTML=($('w-type').value==='wood'?wood:metal).map(v=>`<option value="${v}">${v} mm</option>`).join('');if([...profile.options].some(o=>o.value===old))profile.value=old;const method=$('w-method');method.disabled=$('w-type').value!=='wood';}
$('w-type').addEventListener('change',profiles);profiles();
const num=id=>Number($(id).value),ceil=(a,b)=>Math.ceil(a/b);
const electricTypes={socket:'Stopcontact',switch:'Schakelaar',light:'Lichtpunt',feed:'Leidingdoorvoer'};
let points=[];
try{const saved=JSON.parse(localStorage.getItem('klusmaat-wall-points')||'[]');if(Array.isArray(saved))points=saved.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&electricTypes[p.type]);}catch{}
const savePoints=()=>{try{localStorage.setItem('klusmaat-wall-points',JSON.stringify(points))}catch{}};
const editor=$('w-electrical-editor');
const add=document.createElement('div');add.className='card';add.innerHTML='<h3>Stroompunten op de wand</h3><p class="muted">Tik op de tekening om een punt toe te voegen. Sleep een punt om het te verplaatsen. Gebruik de velden voor exacte maatvoering vanaf links en vanaf de vloer.</p><div class="form-grid"><label>Type<select id="w-point-type"><option value="socket">Stopcontact</option><option value="switch">Schakelaar</option><option value="light">Lichtpunt</option><option value="feed">Leidingdoorvoer</option></select></label><label>Vanaf links (mm)<input id="w-point-x" type="number" min="0" value="1200"></label><label>Vanaf vloer (mm)<input id="w-point-y" type="number" min="0" value="300"></label><button class="button primary" id="w-point-add" type="button">Punt toevoegen</button></div><div id="w-point-list"></div>';
editor.append(add);
function refreshList(){const list=$('w-point-list');list.replaceChildren();points.forEach((p,i)=>{const row=document.createElement('div');row.className='row-between';row.style.cssText='padding:9px 0;border-bottom:1px solid #dce4dd;gap:8px;flex-wrap:wrap';const label=document.createElement('span');label.textContent=(i+1)+'. '+electricTypes[p.type];const x=document.createElement('input');x.type='number';x.min='0';x.value=Math.round(p.x);x.style.width='83px';x.setAttribute('aria-label','Afstand links in mm');const y=document.createElement('input');y.type='number';y.min='0';y.value=Math.round(p.y);y.style.width='83px';y.setAttribute('aria-label','Hoogte vanaf vloer in mm');const remove=document.createElement('button');remove.type='button';remove.className='button small outline';remove.textContent='Verwijder';const change=()=>{const width=num('w-width'),height=num('w-height');if(x.value!==''&&y.value!==''&&Number(x.value)>=0&&Number(y.value)>=0&&Number(x.value)<=width&&Number(y.value)<=height){p.x=Number(x.value);p.y=Number(y.value);savePoints();calculate();}};x.addEventListener('change',change);y.addEventListener('change',change);remove.onclick=()=>{points.splice(i,1);savePoints();calculate()};row.append(label,x,y,remove);list.append(row)})}
$('w-point-add').onclick=()=>{const x=num('w-point-x'),y=num('w-point-y');if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>num('w-width')||y>num('w-height')){alert('Punt moet binnen de wand vallen.');return}points.push({x,y,type:$('w-point-type').value});savePoints();calculate()};

const line=(card,name,value)=>{const div=document.createElement('div');div.className='row-between';div.style.cssText='padding:9px 0;border-bottom:1px solid #dce4dd;gap:12px';const a=document.createElement('span');a.textContent=name;const b=document.createElement('strong');b.textContent=value;div.append(a,b);card.append(div)};

// Praktische rechthoekige plaatindeling: per baan, met hergebruik van reststukken.
// Geen automatische verstevigingen. Dit is een zaag-/snijvoorstel, geen constructieve vrijgave.
// Naadposities per materiaal en baan, alleen in geheugen gedurende deze sessie.
const seamOverrides={OSB:{},Gips:{}};
const seamPanelOpen={OSB:false,Gips:false};
function plateLayout(wallW,wallH,plateL,plateW,direction,kerf,minOffcut,stagger,startWidth,overrides){
 const pw=direction==='horizontal'?plateL:plateW,ph=direction==='horizontal'?plateW:plateL;
 const pieces=[];
 for(let y=0,row=0;y<wallH;y+=ph,row++){
  let x=0;
  // De eerste plaatstrook kan handmatig smaller worden gekozen. De overige naden volgen die keuze.
  // Bij verspringing blijft iedere tweede baan beginnen met een halve plaat.
  const custom=Number(startWidth)>0&&Number(startWidth)<pw;
  const firstWidth=stagger==='half'&&row%2===1?pw/2:(custom?Number(startWidth):0);
  let seamIndex=0;
  while(x<wallW){
   const defaultEnd=Math.min(wallW,x+(seamIndex===0&&firstWidth>0?firstWidth:pw));
   const edited=overrides&&overrides[row]&&overrides[row][seamIndex];
   const target=Number(edited);
   const end=edited!==undefined&&Number.isFinite(target)&&target>x+20&&target<=Math.min(wallW,x+pw)?target:defaultEnd;
   const w=end-x;pieces.push({x,y,w,h:Math.min(ph,wallH-y)});x=end;seamIndex++;
   if(pieces.length>2500)return {error:'Te veel plaatdelen voor deze berekening.'};}
 }
 const sheets=[],offcuts=[];let reused=0;
 // Best-fit reststukken, met verlies per zaagsnede. Reststukken worden niet gedraaid.
 for(const piece of [...pieces].sort((a,b)=>b.w*b.h-a.w*a.h)){
  let best=-1,smallest=Infinity;
  for(let i=0;i<offcuts.length;i++){const r=offcuts[i];if(r.w+0.0001>=piece.w&&r.h+0.0001>=piece.h&&r.w*r.h<smallest){best=i;smallest=r.w*r.h}}
  let source;
  if(best>=0){source=offcuts.splice(best,1)[0];reused++}
  else{source={w:pw,h:ph,sheet:sheets.length+1};sheets.push({number:source.sheet,cuts:[]})}
  sheets[source.sheet-1].cuts.push(piece);
  const right=source.w-piece.w-kerf,top=source.h-piece.h-kerf;
  if(right>=minOffcut&&piece.h>=minOffcut)offcuts.push({w:right,h:piece.h,sheet:source.sheet});
  if(top>=minOffcut&&source.w>=minOffcut)offcuts.push({w:source.w,h:top,sheet:source.sheet});
 }
 return {pieces,sheets,offcuts,pw,ph,reused,kerf,stagger};
}

// Bouw een afdrukbare werkmap. Op Android: Afdrukken > Opslaan als PDF.
function openWorkPdf({width,height,spacing,profileName,constructionSvg,constructionCuts,osbLayout,gypLayout,orderLines}){
 const win=window.open('','_blank');
 if(!win){alert('Sta pop-ups toe om de PDF-werkmap te openen.');return}
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const svgText=svg=>{if(!svg)return '';const clone=svg.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','900');clone.removeAttribute('style');return new XMLSerializer().serializeToString(clone)};
 const section=(title,svg,lines)=>'<section class="sheet"><h2>'+esc(title)+'</h2>'+(svg?'<div class="drawing">'+svgText(svg)+'</div>':'')+'<div class="items">'+lines.map(x=>'<div>'+esc(x)+'</div>').join('')+'</div></section>';
 const plate=(label,layout)=>{
  if(!layout||layout.error)return '';
  const svg=[...document.querySelectorAll('#w-results svg')].find(e=>e.getAttribute('aria-label')===label+' plaatindeling');
  return section(label+' – plaatindeling',svg,[`Wand: ${width} × ${height} mm`,`Hele plaat: ${layout.pw} × ${layout.ph} mm`,`Benodigd: ${layout.sheets.length} hele platen`,...layout.pieces.map((x,i)=>`Plaat ${i+1}: ${x.w} × ${x.h} mm · links ${x.x} mm · vanaf vloer ${x.y} mm`)]);
 };
 const html='<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KlusMaat – werkmap</title><style>body{font:14px Arial,sans-serif;color:#1e3026;margin:0;padding:22px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #32664c;padding-bottom:12px}.actions{padding:16px 0}button{background:#276749;color:white;border:0;padding:12px 18px;border-radius:8px;font-size:16px}.sheet{break-before:page;page-break-before:always;padding-top:14px}.sheet:first-of-type{break-before:auto;page-break-before:auto}h1{font-size:23px}h2{font-size:19px;margin-bottom:14px}.drawing svg{width:100%;height:auto;max-height:420px}.items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 20px;margin-top:18px}.items div{padding:5px 0;border-bottom:1px solid #e1e7e2;break-inside:avoid;overflow-wrap:anywhere}.intro{margin:12px 0;color:#53675a}@page{size:A4 portrait;margin:13mm}@media print{body{padding:0}.actions{display:none}.sheet{padding-top:0}.drawing svg{max-height:115mm}header{margin-bottom:14px}.items{font-size:10px;gap:3px 12px}h2{font-size:16px}}</style></head><body><header><h1>KlusMaat – werktekeningen</h1><span>'+new Date().toLocaleDateString('nl-NL')+'</span></header><div class="actions"><button onclick="window.print()">Afdrukken / opslaan als PDF</button></div><p class="intro">Wand '+esc(width)+' × '+esc(height)+' mm · '+esc(profileName)+' · h.o.h. '+esc(spacing)+' mm</p>'+section('1. Constructietekening en zaaglijst',constructionSvg,[`Wand: ${width} × ${height} mm`,`Staanderafstand: h.o.h. ${spacing} mm`,...constructionCuts])+plate('OSB',osbLayout)+plate('Gips',gypLayout)+section('Bestellijst',null,orderLines)+'</body></html>';
 win.document.open();win.document.write(html);win.document.close();win.focus();
}

// Rechtstreekse offline PDF-download: tekeningen + lijsten op A4, zonder Android-printmenu.
async function downloadWorkPdf({width,height,spacing,profileName,constructionSvg,constructionCuts,osbLayout,gypLayout,orderLines}){
 const pageW=900,pageH=1273,margin=48,bottom=pageH-55;
 const pages=[];let canvas,ctx,y;
 const newPage=()=>{canvas=document.createElement('canvas');canvas.width=pageW;canvas.height=pageH;ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas niet beschikbaar');ctx.fillStyle='#fff';ctx.fillRect(0,0,pageW,pageH);ctx.fillStyle='#173b2b';ctx.font='bold 26px Arial';ctx.fillText('KLUSMAAT  |  WERKMAP',margin,65);ctx.strokeStyle='#8cae9b';ctx.beginPath();ctx.moveTo(margin,81);ctx.lineTo(pageW-margin,81);ctx.stroke();y=115;pages.push(canvas)};
 const ensure=h=>{if(y+h>bottom)newPage()};
 const heading=t=>{ensure(65);ctx.fillStyle='#173b2b';ctx.font='bold 24px Arial';ctx.fillText(t,margin,y);y+=39};
 const textLine=t=>{const txt=String(t);ctx.font='17px Arial';const max=pageW-2*margin;let rest=txt;do{ensure(27);let part=rest;if(ctx.measureText(part).width>max){let end=part.length;while(end>1&&ctx.measureText(part.slice(0,end)).width>max)end--;const space=part.lastIndexOf(' ',end);if(space>0)end=space;part=rest.slice(0,end);rest=rest.slice(end).trimStart()}else rest='';ctx.fillStyle='#1c2b24';ctx.fillText(part,margin,y);y+=26}while(rest)};
 const drawSvg=async svg=>{if(!svg)return;const clone=svg.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');const vb=svg.viewBox.baseVal;const sw=vb.width||340,sh=vb.height||230;clone.setAttribute('width',String(sw));clone.setAttribute('height',String(sh));const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);try{const img=new Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('Tekening kan niet worden geladen'));img.src=url});const dw=pageW-2*margin,dh=Math.min(470,dw*sh/sw);ensure(dh+25);ctx.drawImage(img,margin,y,dw,dh);y+=dh+23}finally{URL.revokeObjectURL(url)}};
 const section=async(title,svg,lines)=>{newPage();heading(title);await drawSvg(svg);for(const item of lines)textLine(item)};
 const plate=async(label,layout)=>{if(!layout||layout.error)return;const svg=[...document.querySelectorAll('#w-results svg')].find(e=>e.getAttribute('aria-label')===label+' plaatindeling');await section(label+' - plaatindeling',svg,[`Wand: ${width} x ${height} mm`,`Hele plaat: ${layout.pw} x ${layout.ph} mm`,`Benodigd: ${layout.sheets.length} hele platen`,...layout.pieces.map((p,i)=>`Plaat ${i+1}: ${p.w} x ${p.h} mm | links ${p.x} mm | vloer ${p.y} mm`)])};
 await section('Constructietekening en zaaglijst',constructionSvg,[`Wand: ${width} x ${height} mm`,`Profiel: ${profileName} | h.o.h. ${spacing} mm`,...constructionCuts]);
 await plate('OSB',osbLayout);await plate('Gips',gypLayout);
 await section('Complete bestellijst',null,orderLines);
 // Iedere PDF-pagina is een scherpe JPEG; schrijf een geldige PDF met eigen xref-tabel.
 const encoder=new TextEncoder(),parts=[],offsets=[0];let size=0;
 const push=bytes=>{parts.push(bytes);size+=bytes.length};const ascii=str=>push(encoder.encode(str));
 const objects=[];const obj=body=>{objects.push(body);return objects.length};
 const catalog=obj('');const pagesObj=obj('');const pageRefs=[];
 for(const page of pages){const jpeg=await new Promise((ok,fail)=>page.toBlob(b=>b?ok(b):fail(Error('PDF-afbeelding mislukt')),'image/jpeg',0.87));const bytes=new Uint8Array(await jpeg.arrayBuffer());const imageId=obj({head:`<< /Type /XObject /Subtype /Image /Width ${pageW} /Height ${pageH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`,data:bytes});const content=encoder.encode('q 595 0 0 842 0 0 cm /Im0 Do Q');const contentId=obj({head:`<< /Length ${content.length} >>`,data:content});pageRefs.push(obj(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`))}
 objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
 objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageRefs.map(id=>id+' 0 R').join(' ')}] /Count ${pageRefs.length} >>`;
 ascii('%PDF-1.4\n');
 objects.forEach((o,i)=>{offsets.push(size);ascii(`${i+1} 0 obj\n`);if(typeof o==='string')ascii(o+'\n');else{ascii(o.head+'\nstream\n');push(o.data);ascii('\nendstream\n')}ascii('endobj\n')});
 const start=size;ascii(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`);for(let i=1;i<offsets.length;i++)ascii(String(offsets[i]).padStart(10,'0')+' 00000 n \n');ascii(`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${start}\n%%EOF`);
 const pdf=new Blob(parts,{type:'application/pdf'});const link=document.createElement('a');link.href=URL.createObjectURL(pdf);link.download='KlusMaat-complete-werkmap.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),60000);
}

// Exporteer de actuele SVG-tekening als scherpe PNG, ook op Android Chrome.
function addDrawingDownload(parent,svg,name,details=[]){
 const bar=document.createElement('div');bar.className='wall-download';
 const btn=document.createElement('button');btn.type='button';btn.className='button small outline';btn.textContent='⬇ Download tekening (PNG)';
 const status=document.createElement('span');status.className='muted';
 btn.addEventListener('click',async()=>{
  btn.disabled=true;status.textContent='Afbeelding maken…';
  let url='';
  try{
   const clone=svg.cloneNode(true);
   clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
   const vb=svg.viewBox.baseVal;
   const w=Math.max(1,vb.width||340),h=Math.max(1,vb.height||230);
   // Render the drawing first, then draw the cutting schedule directly on the PNG
   // canvas. This avoids SVG viewBox clipping of text below the original drawing.
   const lines=details.map(item=>String(item));
   const ns='http://www.w3.org/2000/svg';
   const sourceW=Math.max(1,svg.viewBox.baseVal.width||340);
   const sourceH=Math.max(1,svg.viewBox.baseVal.height||230);
   clone.setAttribute('viewBox',`0 0 ${sourceW} ${sourceH}`);
   clone.setAttribute('width',String(sourceW));clone.setAttribute('height',String(sourceH));
   const xml=new XMLSerializer().serializeToString(clone);
   const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});
   url=URL.createObjectURL(blob);
   const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('SVG niet geladen'));img.src=url});
   const pixelW=1800;
   const padding=60;
   const fontSize=34;
   const lineHeight=52;
   const columns=lines.length>30?2:1;
   const rows=Math.ceil(lines.length/columns);
   const drawW=pixelW-2*padding;
   const drawH=Math.ceil(drawW*sourceH/sourceW);
   const footerTop=padding+drawH+70;
   const footerHeight=lines.length?130+rows*lineHeight+70:0;
   const canvas=document.createElement('canvas');
   canvas.width=pixelW;
   canvas.height=padding+drawH+footerHeight+padding;
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas niet beschikbaar');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(img,padding,padding,drawW,drawH);
   if(lines.length){
    ctx.fillStyle='#172b22';
    ctx.strokeStyle='#b9c7bf';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(padding,footerTop-30);ctx.lineTo(pixelW-padding,footerTop-30);ctx.stroke();
    ctx.font='bold 43px Arial, sans-serif';
    ctx.fillText(name==='constructie'?'CONSTRUCTIE – MAATVOERING EN ZAAGLIJST':name.toUpperCase().replace('-PLAATINDELING','')+' – PLAATMATEN EN ZAAG-/SNIJLIJST',padding,footerTop);
    ctx.font=fontSize+'px Arial, sans-serif';
    const split=Math.ceil(lines.length/columns);
    lines.forEach((item,i)=>{
      const col=Math.floor(i/split),row=i%split;
      const x=padding+col*(pixelW/2),y=footerTop+65+row*lineHeight;
      ctx.fillText(item,x,y,pixelW/columns-padding*2);
    });
   }
   const png=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG kon niet worden gemaakt')),'image/png'));
   const link=document.createElement('a');link.href=URL.createObjectURL(png);link.download='KlusMaat-'+name+'.png';
   document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(link.href),30000);
   status.textContent='Download gestart';
  }catch(err){status.textContent='Download mislukt: '+err.message}
  finally{if(url)URL.revokeObjectURL(url);btn.disabled=false}
 });
 bar.append(btn,status);parent.append(bar);
}
function plateSection(parent,label,layout,action,onEdit){
 const heading=document.createElement('h3');heading.textContent=label+' – plaatindeling';heading.style.marginTop='24px';parent.append(heading);
 if(layout.error){const p=document.createElement('p');p.textContent=layout.error;parent.append(p);return}
 line(parent,'Benodigde hele platen',layout.sheets.length+' stuks ('+layout.pw+' × '+layout.ph+' mm)');
 line(parent,'Plaatdelen op maat',layout.pieces.length+' stuks · '+action);
 line(parent,'Hergebruikte reststukken',layout.reused+' stuks');
 // Visueel vooraanzicht gebaseerd op exact dezelfde plaatdelen als de zaaglijst.
 const wallW=Math.max(...layout.pieces.map(p=>p.x+p.w),0);
 const wallH=Math.max(...layout.pieces.map(p=>p.y+p.h),0);
 if(wallW>0&&wallH>0){
  const box=document.createElement('div');box.style.cssText='margin:14px 0;padding:12px;border:1px solid #d7e0d9;border-radius:12px;background:#f8faf8';
  const title=document.createElement('strong');title.textContent='Visuele plaatindeling – vooraanzicht';box.append(title);
  const note=document.createElement('p');note.className='muted';note.style.fontSize='12px';note.textContent='Tik op een plaatdeel voor positie en zaag-/snijmaat. De tekening is op schaal.';box.append(note);
  const ns='http://www.w3.org/2000/svg';const make=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));return e};
  const margin=25,viewW=640,scale=Math.min((viewW-2*margin)/wallW,380/wallH),drawW=wallW*scale,drawH=wallH*scale;
  const svg=make('svg',{viewBox:`0 0 ${Math.ceil(drawW+2*margin)} ${Math.ceil(drawH+2*margin+14)}`,role:'img','aria-label':label+' plaatindeling','preserveAspectRatio':'xMidYMid meet'});svg.style.cssText='display:block;width:100%;max-height:440px;touch-action:pan-y';
  svg.append(make('rect',{x:margin,y:margin,width:drawW,height:drawH,fill:'#fff',stroke:'#64748b','stroke-width':1.5}));
  const selection=document.createElement('p');selection.className='muted';selection.style.cssText='min-height:2em;font-size:13px';selection.textContent='Selecteer een plaatdeel.';
  layout.pieces.forEach((piece,i)=>{
   const x=margin+piece.x*scale,y=margin+(wallH-piece.y-piece.h)*scale,w=piece.w*scale,h=piece.h*scale;
   const group=make('g',{tabindex:'0',role:'button','aria-label':`Deel ${i+1}: ${piece.w} bij ${piece.h} millimeter`});group.style.cursor='pointer';
   group.append(make('rect',{x,y,width:w,height:h,fill:i%2?'#d6e8db':'#e9d8b8',stroke:'#64748b','stroke-width':1}));
   if(w>24&&h>17){const t=make('text',{x:x+w/2,y:y+h/2,'text-anchor':'middle','dominant-baseline':'middle','font-size':Math.min(13,Math.max(8,w/9)),fill:'#263b32'});t.textContent=String(i+1);group.append(t)}
   const show=()=>{selection.textContent=`Deel ${i+1} · ${piece.w} × ${piece.h} mm · links ${piece.x} mm · vanaf vloer ${piece.y} mm`;svg.querySelectorAll('g rect').forEach(r=>r.setAttribute('stroke-width','1'));group.querySelector('rect').setAttribute('stroke-width','3')};
   group.addEventListener('click',show);group.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();show()}});svg.append(group);
  });
  const bottom=make('text',{x:margin+drawW/2,y:margin+drawH+17,'text-anchor':'middle','font-size':12,fill:'#475569'});bottom.textContent=wallW+' mm';svg.append(bottom);
  const side=make('text',{x:12,y:margin+drawH/2,'text-anchor':'middle','font-size':11,fill:'#475569',transform:`rotate(-90 12 ${margin+drawH/2})`});side.textContent=wallH+' mm';svg.append(side);
  box.append(svg,selection);addDrawingDownload(box,svg,label.toLowerCase()+'-plaatindeling',[`Wand: ${wallW} × ${wallH} mm`, `Hele plaat: ${layout.pw} × ${layout.ph} mm`, ...layout.pieces.map((piece,i)=>`Plaat ${i+1}: ${piece.w} × ${piece.h} mm · links ${piece.x} · vloer ${piece.y}`)]);parent.append(box);
 }

 // Naad per baan aanpassen. Deze besturing staat buiten de SVG, zodat tikken op
 // plaatdelen en de oorspronkelijke tekening ongewijzigd blijven werken.
 const seams=document.createElement('details');seams.open=seamPanelOpen[label]===true;seams.addEventListener('toggle',()=>{if(seams.isConnected)seamPanelOpen[label]=seams.open});seams.style.marginTop='12px';
 const seamsTitle=document.createElement('summary');seamsTitle.textContent='Plaatnaden afzonderlijk aanpassen';seams.append(seamsTitle);
 const hint=document.createElement('p');hint.className='muted';hint.textContent='Kies een baan en verander de positie van een verticale naad, gemeten vanaf links. De maximale breedte van het voorafgaande plaatdeel blijft de plaatmaat. Gebruik Herstellen voor de automatische indeling.';seams.append(hint);
 const rows=[...new Set(layout.pieces.map(p=>p.y))].sort((a,b)=>a-b);
 let count=0;
 rows.forEach((y,row)=>{
  const parts=layout.pieces.filter(p=>p.y===y).sort((a,b)=>a.x-b.x);
  parts.slice(0,-1).forEach((piece,index)=>{
   if(++count>150)return;
   const end=piece.x+piece.w;
   const wrap=document.createElement('label');wrap.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;flex-wrap:wrap';
   const name=document.createElement('span');name.textContent='Baan '+(row+1)+' · naad '+(index+1)+' (mm vanaf links)';
   const input=document.createElement('input');input.type='number';input.step='1';input.min=String(Math.ceil(piece.x+21));input.max=String(Math.floor(Math.min(layout.pw+piece.x,wallW)));
   input.value=String(Math.round(end));input.style.width='110px';
   const apply=document.createElement('button');apply.type='button';apply.className='button small';apply.textContent='Toepassen';
   const applyEdit=()=>{const v=Number(input.value);if(input.value.trim()===''||!Number.isFinite(v)||v<=piece.x+20||v>Math.min(layout.pw+piece.x,wallW)){input.setCustomValidity('Vul een naadpositie in tussen '+Math.ceil(piece.x+21)+' en '+Math.floor(Math.min(layout.pw+piece.x,wallW))+' mm');input.reportValidity();return}input.setCustomValidity('');seamPanelOpen[label]=true;onEdit(row,index,v)};
   apply.addEventListener('click',applyEdit);input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();applyEdit()}});
   wrap.append(name,input,apply);seams.append(wrap);
  });
 });
 const reset=document.createElement('button');reset.type='button';reset.className='button small outline';reset.textContent='Alle naden van '+label+' herstellen';reset.addEventListener('click',()=>onEdit(null,null,null));seams.append(reset);
 parent.append(seams);
 const details=document.createElement('details');details.style.marginTop='10px';const summary=document.createElement('summary');summary.textContent='Bekijk zaag-/snijmaten en plaatsing';details.append(summary);
 const list=document.createElement('div');list.style.cssText='max-height:330px;overflow:auto;margin-top:10px';
 layout.pieces.forEach((p,i)=>line(list,'Deel '+(i+1)+' · vanaf links '+p.x+' / vloer '+p.y+' mm',p.w+' × '+p.h+' mm'));
 details.append(list);parent.append(details);
 const used=layout.pieces.reduce((a,p)=>a+p.w*p.h,0),total=layout.sheets.length*layout.pw*layout.ph;
 const info=document.createElement('p');info.className='muted';info.textContent='Niet benut oppervlak circa '+((total-used)/1e6).toFixed(2)+' m² (inclusief snij-/zaagverlies en niet bruikbare stroken). '+(layout.kerf?'Zaagverlies '+layout.kerf+' mm per snede. ':'')+(layout.stagger==='half'?'Afwisselend halve plaat als startdeel. ':'')+'Let op: de voorgestelde naden zijn niet automatisch constructief ondersteund. Controleer staanders, plaatranden, tand-en-groef en bevestiging.';parent.append(info);
}

function editSeam(material,row,index,value){
 if(row===null){seamOverrides[material]={};seamPanelOpen[material]=true;calculate();return}
 if(!seamOverrides[material][row])seamOverrides[material][row]={};
 seamOverrides[material][row][index]=value;
 seamPanelOpen[material]=true;
 calculate();
}
const calcButton=$('w-calculate');
const calcStatus=document.createElement('p');calcStatus.id='w-calc-status';calcStatus.setAttribute('role','status');calcStatus.style.cssText='margin:10px 0;font-weight:600;color:#9a4a12';calcButton.insertAdjacentElement('afterend',calcStatus);
calcButton.addEventListener('click',()=>{
 calcStatus.textContent='Berekening wordt uitgevoerd…';
 try{calculate();
   const result=$('w-results');
   if(result.querySelector('.card'))calcStatus.textContent='Berekening gereed. Het overzicht staat hieronder.';
   else calcStatus.textContent='Controleer de invoer: '+(result.textContent||'onbekende invoerfout');
   result.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){console.error('KlusMaat berekenfout',error);calcStatus.textContent='Berekening mislukt: '+error.message+'. Maak eventueel een schermafbeelding van deze melding.';}
});
function calculate(){
const width=num('w-width'),height=num('w-height'),spacing=num('w-spacing'),stock=num('w-stock'),waste=num('w-waste');
const values=[width,height,spacing,stock,num('w-osb-length'),num('w-osb-width'),num('w-gyp-length'),num('w-gyp-width')];
const starts=[num('w-osb-start'),num('w-gyp-start')];
const el=$('w-results');if(starts.some(v=>!Number.isFinite(v)||v<0)||values.some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(waste)||waste<0||waste>100){el.textContent='Controleer de maten en toeslag.';return}
const openingType=$('w-opening-type').value;
const opening=openingType==='none'?null:{type:openingType,x:num('w-opening-x'),y:num('w-opening-y'),w:num('w-opening-width'),h:num('w-opening-height')};
if(opening&&(![opening.x,opening.y,opening.w,opening.h].every(Number.isFinite)||opening.x<0||opening.y<0||opening.w<=0||opening.h<=0||opening.x+opening.w>width||opening.y+opening.h>height)){
 el.textContent='De opening moet volledig binnen de wand vallen. Controleer de breedte, hoogte en positie.';return;
}
const isWood=$('w-type').value==='wood',between=!isWood||$('w-method').value==='between';
const cross=isWood?Number(profile.value.split(' × ')[0]):0;
// Hartmaten vanaf de buitenzijde links: eerste staander sluit aan op x=0, tweede hart op de ingestelde maat.
const studWidth=isWood?cross:0;
const firstCenter=studWidth/2, lastCenter=width-studWidth/2;
const positions=[firstCenter];
for(let x=spacing;x<lastCenter-0.001;x+=spacing){if(x>firstCenter+0.001)positions.push(x)}
if(lastCenter>positions[positions.length-1]+0.001)positions.push(lastCenter);
// Staanders uitsluitend volgens de ingestelde h.o.h.-maat; geen automatische plaatnaadsteunen.
const osbDirection=$('w-osb').value,osbW=num('w-osb-width'),osbL=num('w-osb-length');
// Keep original h.o.h. grid; add jamb studs independently, even if adjacent.
const jambCenters=opening?[opening.x+studWidth/2,opening.x+opening.w-studWidth/2]:[];
const allPositions=[...positions];
const studLength=between?height-2*cross:height;
const constructionPieces=[];
const beam=(x,y,w,h,kind)=>{if(w>0&&h>0)constructionPieces.push({x,y,w,h,kind})};
if(opening){
 const bottom=opening.y,top=opening.y+opening.h;
 // Existing studs are trimmed at the opening, not shifted off-grid.
 for(const x of positions){
  if(x>opening.x+0.01&&x<opening.x+opening.w-0.01){
   if(bottom>0)beam(x,0,studWidth||4,Math.max(0,bottom-(between?cross:0)),'short');
   if(top<height)beam(x,top,studWidth||4,Math.max(0,height-top-(between?cross:0)),'short');
  }else beam(x,0,studWidth||4,studLength,'full');
 }
 for(const x of jambCenters){if(x>=0&&x<=width)beam(x,0,studWidth||4,studLength,'jamb')}
 beam(opening.x,top,opening.w,studWidth||4,'header');
 if(bottom>0)beam(opening.x,bottom,opening.w,studWidth||4,'sill');
}else for(const x of positions)beam(x,0,studWidth||4,studLength,'full');
const studs=constructionPieces.filter(p=>p.kind==='full'||p.kind==='jamb').length;
if(studLength<=0){el.textContent='Wandhoogte is te klein voor deze regels.';return}
const clearWidth=width-(isWood?cross:0),segmentLengths=positions.slice(1).map((x,i)=>Math.max(0,x-positions[i]-(isWood?cross:0)));
// Plaatnaden leiden niet tot extra regels: platen mogen op maat worden gezaagd/gesneden.
const seamHeights=[];
const nogginCuts=[];
// Deel doorlopende boven- en onderregels uitsluitend op ter plaatse van een staander.
// Een stuiknaad boven een staander moet constructief correct worden verbonden.
const railCuts=[];let railSplitWarning='';
if(between&&width>stock){
 let start=0;
 while(start<width-0.001){
  if(width-start<=stock){railCuts.push(width-start);break}
  const candidates=positions.filter(c=>c>start+1&&c-start<=stock);
  const next=candidates.length?candidates[candidates.length-1]:null;
  if(next===null){railSplitWarning='De gekozen handelslengte is te kort om de horizontale regels op een staander te laten aansluiten. Kies een langere handelslengte of pas de constructie aan.';railCuts.push(width-start);break}
  railCuts.push(next-start);start=next;
 }
}else if(between)railCuts.push(width);
const studCuts=opening?constructionPieces.filter(p=>['full','jamb','short'].includes(p.kind)).map(p=>p.h):Array(studs).fill(between?studLength:height);
const openingCuts=opening?constructionPieces.filter(p=>['header','sill'].includes(p.kind)).map(p=>p.w):[];
const cuts=between?[...studCuts,...railCuts,...railCuts,...openingCuts,...nogginCuts]:[...studCuts,...segmentLengths,...segmentLengths,...openingCuts,...nogginCuts];
const total=cuts.reduce((a,b)=>a+b,0),extra=1+waste/100;
const grouped={};cuts.forEach(x=>{grouped[x]=(grouped[x]||0)+1});
// First-fit decreasing: every individual cut must fit in a stock length.
let bins=[];const oversize=[];
for(const cut of [...cuts].sort((a,b)=>b-a)){
 if(cut>stock){oversize.push(cut);continue}
 let found=bins.findIndex(rem=>rem>=cut);if(found<0)bins.push(stock-cut);else bins[found]-=cut;
}
const kerf=num('w-osb-kerf'),minOffcut=num('w-min-offcut'),stagger=$('w-stagger').value;
if(!Number.isFinite(kerf)||kerf<0||kerf>15||!Number.isFinite(minOffcut)||minOffcut<0){el.textContent='Controleer zaagverlies en reststukmaat.';return}
const area=width*height/1e6,osb=$('w-osb').value,gypsum=$('w-gypsum').value==='yes',ins=$('w-insulation').value;
const card=document.createElement('div');card.className='card';const h=document.createElement('h3');h.textContent='Materiaallijst – '+profile.value+' mm';card.append(h);
line(card,'Oppervlakte wand',area.toFixed(2)+' m²');if(opening){line(card,opening.type==='door'?'Deuropening':'Raamopening',`${opening.w} × ${opening.h} mm · links ${opening.x} mm · onder ${opening.y} mm`);line(card,'Netto wandoppervlak',((width*height-opening.w*opening.h)/1e6).toFixed(2)+' m² (informatief)');const info=document.createElement('p');info.className='muted';info.textContent='Regelwerk rondom de opening is meegenomen in de houtzaaglijst. De plaatindeling en isolatie zijn nog berekend voor de volledige wand.';card.append(info)}line(card,'Staanders',opening?studs+' doorlopende + '+constructionPieces.filter(p=>p.kind==='short').length+' korte staanders':studs+' × '+studLength+' mm');line(card,'Staanderharten vanaf links',positions.map(x=>Math.round(x)).join(' / ')+' mm');line(card,'Horizontale regels',between?railCuts.length+' delen per regel (boven en onder)':segmentLengths.length+' vakken boven en onder');
line(card,'Totale regellengte',(total/1000).toFixed(2)+' m');line(card,'Handelslengtes (zaagindeling)',bins.length+' × '+stock+' mm'+(waste?' + '+waste+'% reserve (zelf toevoegen)':''));
if(ins!=='none')line(card,'Isolatie '+ins,(area*extra).toFixed(2)+' m², '+num('w-ins-thickness')+' mm');
if(osb!=='none')line(card,'OSB (oppervlakte-indicatie, zagen mogelijk)',ceil(area*extra,num('w-osb-length')*num('w-osb-width')/1e6)+' platen');
if(gypsum)line(card,'Gips (oppervlakte-indicatie, snijden mogelijk)',ceil(area*extra,num('w-gyp-length')*num('w-gyp-width')/1e6)+' platen');
const osbLayout=osb!=='none'?plateLayout(width,height,num('w-osb-length'),num('w-osb-width'),osb,kerf,minOffcut,stagger,num('w-osb-start'),seamOverrides.OSB):null;
const plateDrawings=document.createElement('div');
if(osbLayout)plateSection(plateDrawings,'OSB',osbLayout,'zagen',(row,index,value)=>editSeam('OSB',row,index,value));
const gypLayout=gypsum?plateLayout(width,height,num('w-gyp-length'),num('w-gyp-width'),$('w-gyp-direction').value,0,minOffcut,stagger,num('w-gyp-start'),seamOverrides.Gips):null;
if(gypLayout)plateSection(plateDrawings,'Gips',gypLayout,'snijden',(row,index,value)=>editSeam('Gips',row,index,value));
// Bestellijst gebaseerd op de daadwerkelijke zaag- en plaatindeling.
const orderTitle=document.createElement('h3');orderTitle.textContent='Bestellijst';orderTitle.style.marginTop='24px';card.append(orderTitle);
const orderLines=['KLUSMAAT – BESTELLIJST','Wand: '+width+' × '+height+' mm',''];
const addOrder=(name,quantity,unit,detail)=>{line(card,name,quantity+' '+unit+(detail?' · '+detail:''));orderLines.push(name+': '+quantity+' '+unit+(detail?' ('+detail+')':''))};
addOrder(isWood?'Houten regels '+profile.value+' mm':'Metal stud '+profile.value+' mm',bins.length,'stuks','handelslengte '+stock+' mm');
if(oversize.length)orderLines.push('LET OP: '+oversize.length+' zaagdelen passen niet in de handelslengte');
const reserveFactor=1+waste/100;
if(osbLayout&&!osbLayout.error)addOrder('OSB',Math.ceil(osbLayout.sheets.length*reserveFactor),'platen',num('w-osb-length')+' × '+num('w-osb-width')+' mm');
if(gypLayout&&!gypLayout.error)addOrder('Gips',Math.ceil(gypLayout.sheets.length*reserveFactor),'platen',num('w-gyp-length')+' × '+num('w-gyp-width')+' mm');
if(ins!=='none')addOrder('Isolatie '+ins,Math.ceil(area*reserveFactor*100)/100,'m²',num('w-ins-thickness')+' mm dik');
const orderNote=document.createElement('p');orderNote.className='muted';orderNote.textContent='Platen en isolatie zijn inclusief de ingestelde '+waste+'% reserve, afgerond naar hele platen. Regels zijn gebaseerd op de bestaande zaagindeling zonder extra reserve; bevestigingsmiddelen en profielen zijn nog niet meegenomen. Controleer de aantallen voor bestelling.';card.append(orderNote);
const copyOrder=document.createElement('button');copyOrder.type='button';copyOrder.className='button small';copyOrder.textContent='Bestellijst kopiëren';copyOrder.addEventListener('click',async()=>{const content=orderLines.join('\n');try{await navigator.clipboard.writeText(content);copyOrder.textContent='Gekopieerd';}catch{const field=document.createElement('textarea');field.value=content;field.style.cssText='width:100%;height:150px';card.insertBefore(field,copyOrder.nextSibling);field.select();copyOrder.textContent='Selecteer en kopieer de tekst';}});card.append(copyOrder);
const pdfBtn=document.createElement('button');pdfBtn.type='button';pdfBtn.className='button primary';pdfBtn.textContent='🖨 Werkmap bekijken / printen';pdfBtn.style.cssText='display:block;width:100%;margin:22px 0 8px;padding:15px;font-weight:700';pdfBtn.addEventListener('click',()=>{const drawing=card.querySelector('svg');openWorkPdf({width,height,spacing,profileName:profile.value,constructionSvg:drawing,constructionCuts:[...(opening?[`${opening.type==='door'?'Deur':'Raam'}: ${opening.w} x ${opening.h} mm, links ${opening.x} mm, onder ${opening.y} mm`, 'Opening verwerkt in constructiezaaglijst; platen nog zonder uitsparing']:[]),...Object.entries(grouped).sort((a,b)=>Number(b[0])-Number(a[0])).map(([length,count])=>`${count} stuks × ${length} mm`)],osbLayout,gypLayout,orderLines})});
const directPdfBtn=document.createElement('button');directPdfBtn.type='button';directPdfBtn.className='button primary';directPdfBtn.textContent='⬇ Download complete werkmap (PDF)';directPdfBtn.style.cssText='display:block;width:100%;margin:12px 0;padding:15px;font-weight:700';directPdfBtn.addEventListener('click',async()=>{directPdfBtn.disabled=true;directPdfBtn.textContent='PDF wordt gemaakt…';try{const drawing=card.querySelector('svg');await downloadWorkPdf({width,height,spacing,profileName:profile.value,constructionSvg:drawing,constructionCuts:[...(opening?[`${opening.type==='door'?'Deur':'Raam'}: ${opening.w} x ${opening.h} mm, links ${opening.x} mm, onder ${opening.y} mm`, 'Opening verwerkt in constructiezaaglijst; platen nog zonder uitsparing']:[]),...Object.entries(grouped).sort((a,b)=>Number(b[0])-Number(a[0])).map(([length,count])=>`${count} stuks × ${length} mm`)],osbLayout,gypLayout,orderLines});directPdfBtn.textContent='⬇ Download complete werkmap (PDF)'}catch(e){directPdfBtn.textContent='PDF mislukt – opnieuw proberen';alert('PDF downloaden mislukt: '+e.message)}finally{directPdfBtn.disabled=false}});card.append(directPdfBtn);
const cutTitle=document.createElement('h3');cutTitle.textContent='Zaaglijst';cutTitle.style.marginTop='24px';card.append(cutTitle);Object.entries(grouped).sort((a,b)=>Number(b[0])-Number(a[0])).forEach(([length,count])=>line(card,count+' stuks',length+' mm'));
if(between&&railCuts.length>1&&!railSplitWarning){const note=document.createElement('p');note.className='muted';note.textContent='De boven- en onderregel zijn opgedeeld in handelslengtes, met naden ter plaatse van staanders. Verbind de naden constructief correct; niet elke aansluiting is zonder meer geschikt als dragende verbinding.';card.append(note)}
if(railSplitWarning){const note=document.createElement('p');note.style.color='#a33';note.textContent=railSplitWarning;card.append(note)}
if(oversize.length){const warn=document.createElement('p');warn.style.color='#a33';warn.textContent='Let op: '+oversize.length+' staanders of overige delen passen niet in de gekozen handelslengte. Kies een langere handelslengte of ontwerp een constructief geschikte verbinding.';card.append(warn)}
const drawTitle=document.createElement('h3');drawTitle.textContent='Constructietekening (schematisch)';drawTitle.style.marginTop='24px';card.append(drawTitle);
const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 340 230');svg.style.cssText='width:100%;max-height:280px;background:#f5f7f4;border-radius:12px';
const rect=(x,y,w,h,color)=>{const r=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x,y,width:w,height:h,fill:color}))r.setAttribute(k,v);svg.append(r)};
const X=18,Y=18,W=304,H=190,thick=Math.max(3,Math.min(7,cross/height*H));
if(between){rect(X,Y,W,thick,'#ad7b43');rect(X,Y+H-thick,W,thick,'#ad7b43')}
if(opening){
 for(const piece of constructionPieces){
  const xx=X+W*piece.x/width, yy=Y+H*(1-(piece.y+piece.h)/height);
  if(piece.kind==='header'||piece.kind==='sill')rect(xx,yy,Math.max(2,W*piece.w/width),thick,'#ad7b43');
  else rect(Math.max(X,xx-2),yy+(piece.y===0&&between?thick:0),4,Math.max(1,H*piece.h/height-(piece.y===0&&between?thick:0)),'#ad7b43');
 }
}else for(const pos of allPositions){const x=X+W*pos/width;rect(Math.min(X+W-4,Math.max(X,x-2)),Y+(between?thick:0),4,H-(between?2*thick:0),'#ad7b43')}
if(!between){for(let i=0;i<positions.length-1;i++){let x=X+W*positions[i]/width+2,w=W*(positions[i+1]-positions[i])/width-4;rect(x,Y,Math.max(0,w),thick,'#ad7b43');rect(x,Y+H-thick,Math.max(0,w),thick,'#ad7b43')}}
if(opening){
 const ox=X+W*opening.x/width,oy=Y+H*(1-(opening.y+opening.h)/height),ow=W*opening.w/width,oh=H*opening.h/height;
 const cutout=document.createElementNS(ns,'rect');Object.entries({x:ox,y:oy,width:ow,height:oh,fill:'rgba(255,255,255,0.12)',stroke:'#0f766e','stroke-width':2}).forEach(([k,v])=>cutout.setAttribute(k,v));svg.append(cutout);
 const label=document.createElementNS(ns,'text');label.setAttribute('x',String(ox+ow/2));label.setAttribute('y',String(oy+oh/2));label.setAttribute('font-size','9');label.setAttribute('text-anchor','middle');label.setAttribute('fill','#0f766e');label.textContent=opening.type==='door'?'Deur':'Raam';svg.append(label);
}
const makeSVG=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
const warning=document.createElement('p');warning.style.color='#9a4a12';warning.style.fontWeight='600';
const pointCoords=(p)=>({x:X+W*p.x/width,y:Y+H*(1-p.y/height)});
let moving=-1,moved=false;
function svgCoord(ev){const box=svg.getBoundingClientRect();const vb=svg.viewBox.baseVal;return{x:(ev.clientX-box.left)*vb.width/box.width,y:(ev.clientY-box.top)*vb.height/box.height}}
function renderPoints(){svg.querySelectorAll('.w-electric-point').forEach(e=>e.remove());const clashes=[];points.forEach((p,i)=>{const {x,y}=pointCoords(p);const collision=allPositions.some(pos=>Math.abs(pos-p.x)<=Math.max(35,cross/2+25));if(collision)clashes.push(i+1);const g=makeSVG('g',{class:'w-electric-point','data-index':i,style:'cursor:grab;touch-action:none'});g.append(makeSVG('circle',{cx:x,cy:y,r:7,fill:collision?'#f97316':'#2563eb',stroke:'#fff','stroke-width':2}));const txt=makeSVG('text',{x,y:y+3,'text-anchor':'middle','font-size':9,'font-weight':'bold',fill:'#fff'});txt.textContent=i+1;g.append(txt);g.addEventListener('pointerdown',ev=>{ev.stopPropagation();moving=i;moved=false;g.setPointerCapture(ev.pointerId)});g.addEventListener('pointermove',ev=>{if(moving!==i)return;const pt=svgCoord(ev);p.x=Math.round(Math.max(0,Math.min(width,(pt.x-X)*width/W))/5)*5;p.y=Math.round(Math.max(0,Math.min(height,(Y+H-pt.y)*height/H))/5)*5;moved=true;g.querySelector("circle").setAttribute("cx",pointCoords(p).x);g.querySelector("circle").setAttribute("cy",pointCoords(p).y);g.querySelector("text").setAttribute("x",pointCoords(p).x);g.querySelector("text").setAttribute("y",pointCoords(p).y+3)});g.addEventListener('pointerup',()=>{if(moving===i){moving=-1;savePoints();refreshList();renderPoints()}});svg.append(g)});warning.textContent=clashes.length?'Let op: stroompunt(en) '+clashes.join(', ')+' overlappen mogelijk een staander (oranje). Controleer ook leidingen en elektradozen.':'Blauw = stroompunt · bruin = regelwerk. Tik op de tekening om een punt toe te voegen.'}
svg.style.touchAction='none';svg.addEventListener('click',ev=>{if(ev.target.closest('.w-electric-point'))return;const pt=svgCoord(ev);if(pt.x<X||pt.x>X+W||pt.y<Y||pt.y>Y+H)return;points.push({x:Math.round((pt.x-X)*width/W/5)*5,y:Math.round((Y+H-pt.y)*height/H/5)*5,type:$('w-point-type').value});savePoints();calculate()});
const t=document.createElementNS(ns,'text');t.setAttribute('x','170');t.setAttribute('y','223');t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.textContent=width+' mm × '+height+' mm · h.o.h. '+spacing+' mm';svg.append(t);card.append(svg);card.append(warning);renderPoints();refreshList();addDrawingDownload(card,svg,'constructie',[`Wand: ${width} × ${height} mm`, ...(opening?[`${opening.type==='door'?'Deur':'Raam'}: ${opening.w} × ${opening.h} mm · links ${opening.x} mm · onder ${opening.y} mm`, 'Opening verwerkt in constructiezaaglijst; platen nog zonder uitsparing']:[]), `Staanderafstand: h.o.h. ${spacing} mm`, ...Object.entries(grouped).sort((a,b)=>Number(b[0])-Number(a[0])).map(([length,count])=>`${count} stuks × ${length} mm`)]);
const note=document.createElement('p');note.className='muted';note.textContent='Er worden geen extra staanders of dwarsregels voor plaatnaden toegevoegd. OSB kan gezaagd en gips kan gesneden worden; een praktische plaatindeling met reststukhergebruik wordt getoond; controleer snijverlies, voegverspringing en plaatranden. Controleer plaatranden, bevestiging, aansluitingen en verankering. Staanderhart 2 ligt op de ingestelde h.o.h.-maat gemeten vanaf de buitenzijde links; de eerste en laatste staander sluiten aan op de wanduiteinden. De houtzaagindeling houdt nog geen rekening met zaagbladverlies; bij metal stud kunnen CW-staanders een montagekorting vereisen.';card.append(note);if(plateDrawings.childElementCount){const plateHeading=document.createElement('h3');plateHeading.textContent='Plaatindeling – OSB en gips';plateHeading.style.marginTop='24px';card.append(plateHeading,plateDrawings)}card.append(pdfBtn);el.replaceChildren(card);
try{localStorage.setItem('klusmaat-wall-draft',JSON.stringify(Object.fromEntries([...document.querySelectorAll('#wall-form input,#wall-form select')].map(x=>[x.id,x.value]))))}catch{}
}
try{const saved=JSON.parse(localStorage.getItem('klusmaat-wall-draft')||'null');if(saved){if(saved['w-type'])$('w-type').value=saved['w-type'];profiles();Object.entries(saved).forEach(([id,value])=>{if($(id))$(id).value=value})}}catch{}
refreshList();
})();
