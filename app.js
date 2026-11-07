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
renderMaterials();renderMaterialOptions();calculateCutlist();
if("serviceWorker" in navigator && location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));