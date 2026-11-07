const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORAGE_KEY="klusmaat-v01";
const defaults=[
 {id:crypto.randomUUID(),type:"Gemelamineerd spaanplaat",name:"Wit 18 mm",length:2800,width:2070,thickness:18,price:65,grain:"length",tongueGroove:"none",edgeCorrection:0},
 {id:crypto.randomUUID(),type:"MDF",name:"MDF 18 mm",length:2440,width:1220,thickness:18,price:35,grain:"none",tongueGroove:"none",edgeCorrection:0},
 {id:crypto.randomUUID(),type:"OSB",name:"OSB 12 mm",length:2440,width:1220,thickness:12,price:22,grain:"none",tongueGroove:"none",edgeCorrection:0},
 {id:crypto.randomUUID(),type:"OSB",name:"OSB veer-en-groef 12 mm",length:2440,width:610,thickness:12,price:18,grain:"none",tongueGroove:"long",edgeCorrection:0},
 {id:crypto.randomUUID(),type:"Multiplex",name:"Berken multiplex 18 mm",length:2440,width:1220,thickness:18,price:59,grain:"length",tongueGroove:"none",edgeCorrection:0}
];
let state=loadState();
function loadState(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY));return {materials:Array.isArray(v?.materials)?v.materials:defaults,projects:Array.isArray(v?.projects)?v.projects:[]}}catch{return {materials:defaults,projects:[]}}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function money(n){return new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(n)}
function num(id){return Number($(id).value)}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2100)}
function showTab(id){$$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));$$(".panel").forEach(p=>p.classList.toggle("active",p.id===id));window.scrollTo({top:0,behavior:"smooth"})}
$$(".tab").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.go)));
function renderMaterials(){
 $("#material-list").innerHTML=state.materials.map(m=>`<article class="item-card"><div class="row-between"><div><strong>${esc(m.name)}</strong><p>${esc(m.type)} · ${m.length} × ${m.width} × ${m.thickness} mm<br>${m.grain==="length"?"Nerf: lengte":m.grain==="width"?"Nerf: breedte":"Geen nerfrichting"} · Veer/groef: ${m.tongueGroove==="none"?"nee":m.tongueGroove}</p></div><div style="text-align:right"><b>${money(m.price||0)}</b><br><button class="danger" data-delete="${m.id}">Verwijderen</button></div></div></article>`).join("")||'<p class="muted">Nog geen materialen.</p>';
 $$("[data-delete]").forEach(b=>b.addEventListener("click",()=>{state.materials=state.materials.filter(m=>m.id!==b.dataset.delete);save();renderMaterials();renderMaterialOptions();toast("Materiaal verwijderd")}));
}
function renderMaterialOptions(){
 const select=$("#c-material"),old=select.value;
 select.innerHTML=state.materials.map(m=>`<option value="${m.id}">${esc(m.name)} · ${m.length}×${m.width}</option>`).join("");
 if(state.materials.some(m=>m.id===old))select.value=old;
 const planner=$("#p-material");
 if(planner){
  const pold=planner.value;
  planner.innerHTML=state.materials.map(m=>`<option value="${m.id}">${esc(m.name)} · ${m.length}×${m.width}</option>`).join("");
  if(state.materials.some(m=>m.id===pold))planner.value=pold;
 }
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("#material-form").addEventListener("submit",e=>{
 e.preventDefault();
 const m={id:crypto.randomUUID(),type:$("#m-type").value,name:$("#m-name").value.trim(),length:num("#m-length"),width:num("#m-width"),thickness:num("#m-thickness"),price:num("#m-price"),grain:$("#m-grain").value,tongueGroove:$("#m-tg").value,edgeCorrection:num("#m-edge")};
 if(!m.name||![m.length,m.width,m.thickness].every(x=>x>0)){toast("Controleer de materiaalgegevens");return}
 state.materials.push(m);save();renderMaterials();renderMaterialOptions();e.target.reset();toast("Materiaal toegevoegd");
});
$("#export-data").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});download(blob,"klusmaat-backup.json")});
$("#import-data").addEventListener("change",async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data.materials))throw Error();state={materials:data.materials,projects:Array.isArray(data.projects)?data.projects:[]};save();renderMaterials();renderMaterialOptions();toast("Back-up geïmporteerd")}catch{toast("Dit back-upbestand is niet geldig")}e.target.value=""});
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
function cabinetParts(){
 const W=num("#c-width"),H=num("#c-height"),D=num("#c-depth"),T=num("#c-thickness"),N=Math.floor(num("#c-dividers")),S=Math.floor(num("#c-shelves")),construction=$("#c-construction").value;
 if(![W,H,D,T].every(x=>x>0)||N<0||S<0)throw Error("Vul geldige kastmaten in.");
 const between=construction==="between",innerW=W-2*T,innerH=H-2*T;
 if(innerW<=0||innerH<=0)throw Error("De kastmaten zijn te klein voor deze plaatdikte.");
 const parts=[
  {name:"Zijwand",length:H,width:D,count:2,edge:["front"]},
  {name:"Bovenblad",length:between?innerW:W,width:D,count:1,edge:["front"]},
  {name:"Bodem",length:between?innerW:W,width:D,count:1,edge:["front"]}
 ];
 if(N)parts.push({name:"Tussenwand",length:innerH,width:D,count:N,edge:["front"]});
 const bays=N+1,shelfWidth=(innerW-N*T)/bays;
 if(S)parts.push({name:$("#c-shelf-type").value==="fixed"?"Vaste legplank":"Verstelbare legplank",length:shelfWidth,width:D-20,count:S*bays,edge:["front"]});
 if($("#c-back").checked){const bt=num("#c-back-thickness");let bl=W,bh=H;if($("#c-back-type").value==="inset"){bl=innerW;bh=innerH}parts.push({name:"Achterwand",length:bh,width:bl,count:1,thickness:bt,edge:[]})}
 return parts;
}
$("#calculate-cabinet").addEventListener("click",()=>{
 try{
  const parts=cabinetParts(),total=parts.reduce((s,p)=>s+p.length*p.width*p.count/1e6,0),count=parts.reduce((s,p)=>s+p.count,0);
  const mat=state.materials.find(m=>m.id===$("#c-material").value);
  const thickness=num("#c-thickness");
  const html=`<article class="item-card"><div class="stats"><div class="stat"><b>${count}</b><small>Onderdelen</small></div><div class="stat"><b>${total.toFixed(2).replace(".",",")}</b><small>m² plaatoppervlak</small></div><div class="stat"><b>${mat?esc(mat.name):"—"}</b><small>Materiaal</small></div></div><h3>Onderdelenlijst</h3>${parts.map(p=>`<div class="part-row"><span><b>${esc(p.name)}</b><br>${p.length} × ${p.width} × ${p.thickness||thickness} mm</span><b>${p.count} st.</b></div>`).join("")}<p class="muted">Controleer verbindingen, speling, sponningen en exacte achterwandmaat vóór productie. De berekening is een uitgangspunt, geen productietekening.</p><button class="button primary full" id="send-cutlist">Open onderdelen in zaaglijst</button></article>`;
  $("#cabinet-result").innerHTML=html;
  $("#send-cutlist").addEventListener("click",()=>{$("#cut-input").value=parts.map(p=>`${p.name},${p.length},${p.width},${p.count}`).join("\n");showTab("cutlist");calculateCutlist()});
 }catch(e){toast(e.message)}
});
function calculateCutlist(){
 const lines=$("#cut-input").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),valid=[],bad=[];
 lines.forEach((line,i)=>{const p=line.split(",");const [name,l,w,c]=[p[0]?.trim(),Number(p[1]),Number(p[2]),Number(p[3])];if(name&&l>0&&w>0&&Number.isInteger(c)&&c>0)valid.push({name,l,w,c});else bad.push(i+1)});
 const count=valid.reduce((s,p)=>s+p.c,0),area=valid.reduce((s,p)=>s+p.l*p.w*p.c/1e6,0);
 $("#cut-result").innerHTML=`<article class="item-card"><div class="stats"><div class="stat"><b>${count}</b><small>Stuks</small></div><div class="stat"><b>${area.toFixed(2).replace(".",",")}</b><small>m² bruto</small></div><div class="stat"><b>${bad.length}</b><small>Foute regels</small></div></div><h3>Onderdelen</h3>${valid.map(p=>`<div class="part-row"><span><b>${esc(p.name)}</b><br>${p.l} × ${p.w} mm</span><b>${p.c} st.</b></div>`).join("")}<button class="button outline full" id="download-cut">Download zaaglijst (CSV)</button></article>`;
 $("#download-cut").addEventListener("click",()=>{const csv="Onderdeel;Lengte mm;Breedte mm;Aantal\n"+valid.map(p=>[p.name,p.l,p.w,p.c].join(";")).join("\n");download(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),"klusmaat-zaaglijst.csv")});
}
$("#calculate-cutlist").addEventListener("click",calculateCutlist);
renderMaterials();renderMaterialOptions();calculateCutlist();if($("#p-material")){$("#p-material").dispatchEvent(new Event("change"));}
if("serviceWorker" in navigator && location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));

function parsePlannerParts(){
 const lines=$("#p-input").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),parts=[],bad=[];
 lines.forEach((line,i)=>{
  const p=line.split(",");
  const name=p[0]?.trim(),l=Number(p[1]),w=Number(p[2]),count=Number(p[3]);
  if(name&&Number.isFinite(l)&&Number.isFinite(w)&&Number.isInteger(count)&&l>0&&w>0&&count>0){
   for(let n=0;n<count;n++)parts.push({name,l,w,copy:n+1,sourceCount:count});
  }else bad.push(i+1);
 });
 return {parts,bad};
}
function planSheets(){
 const mat=state.materials.find(m=>m.id===$("#p-material").value);
 if(!mat)throw Error("Kies eerst een materiaal.");
 const kerf=Math.max(0,Number($("#p-kerf").value)||0);
 const trim=Math.max(0,Number($("#p-trim").value)||0);
 const allowRotate=$("#p-rotate").checked && mat.grain==="none";
 const usableL=Number(mat.length)-2*(Number(mat.edgeCorrection)||0)-2*trim;
 const usableW=Number(mat.width)-2*(Number(mat.edgeCorrection)||0)-2*trim;
 if(usableL<=0||usableW<=0)throw Error("De netto plaatmaat is te klein. Controleer randcorrectie en randverlies.");
 const parsed=parsePlannerParts();
 if(!parsed.parts.length)throw Error("Vul minimaal één geldige onderdelenregel in.");
 const expanded=parsed.parts.map(p=>({...p})).sort((a,b)=>Math.max(b.l,b.w)-Math.max(a.l,a.w)||b.l*b.w-a.l*a.w);
 const sheets=[];
 function newSheet(){const s={rows:[],placements:[],usedWidth:0};sheets.push(s);return s}
 let sheet=newSheet(),row=null;
 for(const part of expanded){
  const orientations=[{l:part.l,w:part.w,rot:false}];
  if(allowRotate && part.l!==part.w)orientations.push({l:part.w,w:part.l,rot:true});
  let placed=false;
  // First try current row, then a new row on this sheet, then a fresh sheet.
  for(let sheetTry=0;sheetTry<2&&!placed;sheetTry++){
   if(sheetTry===1){sheet=newSheet();row=null}
   for(const o of orientations){
    if(row && o.w<=row.h && row.x+o.l+(row.placements.length?kerf:0)<=usableL){
     const x=row.x+(row.placements.length?kerf:0);
     const pl={...o,x,y:row.y,name:part.name,copy:part.copy};
     row.placements.push(pl);row.x=x+o.l;sheet.placements.push(pl);placed=true;break;
    }
   }
   if(placed)break;
   for(const o of orientations){
    const y=sheet.usedWidth+(sheet.rows.length?kerf:0);
    if(o.w<=usableW-y && o.l<=usableL){
     row={y,h:o.w,x:o.l,placements:[]};
     const pl={...o,x:0,y,name:part.name,copy:part.copy};
     row.placements.push(pl);sheet.rows.push(row);sheet.usedWidth=y+o.w;sheet.placements.push(pl);placed=true;break;
    }
   }
  }
  if(!placed)throw Error(`Onderdeel ${part.name} (${part.l}×${part.w} mm) past niet op de netto plaatmaat ${usableL}×${usableW} mm.`);
 }
 return {mat,kerf,trim,usableL,usableW,sheets,bad:parsed.bad,method:$("#p-method").value,allowRotate};
}
function renderPlan(){
 try{
  const plan=planSheets(),area=plan.usableL*plan.usableW,partsCount=plan.sheets.reduce((n,s)=>n+s.placements.length,0);
  const totalPartsArea=plan.sheets.reduce((n,s)=>n+s.placements.reduce((a,p)=>a+p.l*p.w,0),0);
  const svgSheets=plan.sheets.map((s,idx)=>{
   const scale=Math.min(320/plan.usableL,190/plan.usableW);
   const rects=s.placements.map((p,i)=>{
    const x=12+p.x*scale,y=12+p.y*scale,w=p.l*scale,h=p.w*scale;
    const label=`${p.name} ${p.l}×${p.w}`;
    return `<rect x="${x}" y="${y}" width="${Math.max(1,w)}" height="${Math.max(1,h)}" rx="2" fill="${i%2?"#cfe2d0":"#a9cdb1"}" stroke="#31594b" stroke-width="1"/><text x="${x+4}" y="${y+13}" font-size="10" fill="#172d29">${esc(label).slice(0,34)}</text>`;
   }).join("");
   return `<article class="item-card"><div class="row-between"><b>Plaat ${idx+1}</b><span class="pill">${s.placements.length} onderdelen</span></div><svg viewBox="0 0 ${plan.usableL*scale+24} ${plan.usableW*scale+24}" role="img" aria-label="Schematische plaatindeling" style="width:100%;max-height:260px;background:#f4f6f3;border:1px solid #dfe6e0;border-radius:8px"><rect x="12" y="12" width="${plan.usableL*scale}" height="${plan.usableW*scale}" fill="#fff" stroke="#172d29" stroke-width="2"/>${rects}</svg><p class="muted">Schematische indeling; niet op schaal afdrukken voor productie.</p></article>`;
  }).join("");
  const sequence=plan.sheets.map((s,i)=>{
   const rows=s.rows.map((r,j)=>`<li>Strook ${j+1}: breedte ${r.h} mm — ${r.placements.map(p=>`${esc(p.name)} ${p.l}×${p.w}`).join("; ")}</li>`).join("");
   return `<div class="item-card"><b>Plaat ${i+1} · zaagvolgorde</b><ol class="cut-sequence">${rows}</ol><p class="muted">${plan.method==="panel"?"Formaatzaag: zaag eerst de stroken op breedte; kort daarna de onderdelen op lengte.":"Invalzaag: markeer en ondersteun de plaat; zaag eerst de stroken en kort daarna de onderdelen af."}</p></div>`;
  }).join("");
  const materialLabel=esc(plan.mat.name);
  $("#plan-result").innerHTML=`<article class="item-card"><div class="stats"><div class="stat"><b>${plan.sheets.length}</b><small>Platen nodig</small></div><div class="stat"><b>${partsCount}</b><small>Onderdelen</small></div><div class="stat"><b>${Math.round(totalPartsArea/area*100)}%</b><small>Benutting* </small></div></div><p><b>${materialLabel}</b> · netto ${plan.usableL} × ${plan.usableW} mm · zaagblad ${plan.kerf} mm</p><p class="muted">*Benutting berekend op netto plaatoppervlak, zonder rekening te houden met onbruikbare restvormen.</p>${plan.bad.length?`<p class="muted">Ongeldige regels overgeslagen: ${plan.bad.join(", ")}</p>`:""}</article>${svgSheets}${sequence}<button class="button outline full" id="export-plan">Download zaagplan (CSV)</button>`;
  $("#export-plan").addEventListener("click",()=>{
   const rows=[["Plaat","Onderdeel","Lengte mm","Breedte mm","X mm","Y mm","Gedraaid"]];
   plan.sheets.forEach((s,i)=>s.placements.forEach(p=>rows.push([i+1,p.name,p.l,p.w,p.x,p.y,p.rot?"ja":"nee"])));
   const csv=rows.map(r=>r.map(v=>String(v).replaceAll('"','""')).map(v=>/[;\n"]/.test(v)?`"${v}"`:v).join(";")).join("\n");
   download(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),"klusmaat-plaatzaagplan.csv");
  });
 }catch(e){$("#plan-result").innerHTML=`<article class="item-card"><b>Geen zaagplan gemaakt</b><p class="muted">${esc(e.message)}</p></article>`}
}
$("#make-plan")?.addEventListener("click",renderPlan);
$("#p-material")?.addEventListener("change",()=>{const m=state.materials.find(x=>x.id===$("#p-material").value);if(m&&m.grain!=="none"){$("#p-rotate").checked=false;$("#p-rotate").disabled=true}else $("#p-rotate").disabled=false});

