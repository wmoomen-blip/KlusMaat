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
function plateLayout(wallW,wallH,plateL,plateW,direction,kerf,minOffcut,stagger){
 const pw=direction==='horizontal'?plateL:plateW,ph=direction==='horizontal'?plateW:plateL;
 const pieces=[];
 for(let y=0,row=0;y<wallH;y+=ph,row++){
  let x=0;
  if(stagger==='half'&&row%2===1){const first=Math.min(wallW,pw/2);pieces.push({x:0,y,w:first,h:Math.min(ph,wallH-y)});x=first}
  while(x<wallW){const w=Math.min(pw,wallW-x);pieces.push({x,y,w,h:Math.min(ph,wallH-y)});x+=w;
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
function plateSection(parent,label,layout,action){
 const heading=document.createElement('h3');heading.textContent=label+' – plaatindeling';heading.style.marginTop='24px';parent.append(heading);
 if(layout.error){const p=document.createElement('p');p.textContent=layout.error;parent.append(p);return}
 line(parent,'Benodigde hele platen',layout.sheets.length+' stuks ('+layout.pw+' × '+layout.ph+' mm)');
 line(parent,'Plaatdelen op maat',layout.pieces.length+' stuks · '+action);
 line(parent,'Hergebruikte reststukken',layout.reused+' stuks');
 const details=document.createElement('details');details.style.marginTop='10px';const summary=document.createElement('summary');summary.textContent='Bekijk zaag-/snijmaten en plaatsing';details.append(summary);
 const list=document.createElement('div');list.style.cssText='max-height:330px;overflow:auto;margin-top:10px';
 layout.pieces.forEach((p,i)=>line(list,'Deel '+(i+1)+' · vanaf links '+p.x+' / vloer '+p.y+' mm',p.w+' × '+p.h+' mm'));
 details.append(list);parent.append(details);
 const used=layout.pieces.reduce((a,p)=>a+p.w*p.h,0),total=layout.sheets.length*layout.pw*layout.ph;
 const info=document.createElement('p');info.className='muted';info.textContent='Niet benut oppervlak circa '+((total-used)/1e6).toFixed(2)+' m² (inclusief snij-/zaagverlies en niet bruikbare stroken). '+(layout.kerf?'Zaagverlies '+layout.kerf+' mm per snede. ':'')+(layout.stagger==='half'?'Afwisselend halve plaat als startdeel. ':'')+'Let op: de voorgestelde naden zijn niet automatisch constructief ondersteund. Controleer staanders, plaatranden, tand-en-groef en bevestiging.';parent.append(info);
}

$('w-calculate').addEventListener('click',calculate);
function calculate(){
const width=num('w-width'),height=num('w-height'),spacing=num('w-spacing'),stock=num('w-stock'),waste=num('w-waste');
const values=[width,height,spacing,stock,num('w-osb-length'),num('w-osb-width'),num('w-gyp-length'),num('w-gyp-width')];
const el=$('w-results');if(values.some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(waste)||waste<0||waste>100){el.textContent='Controleer de maten en toeslag.';return}
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
const allPositions=positions;
const studs=allPositions.length,studLength=between?height-2*cross:height;
if(studLength<=0){el.textContent='Wandhoogte is te klein voor deze regels.';return}
const clearWidth=width-(isWood?cross:0),segmentLengths=positions.slice(1).map((x,i)=>Math.max(0,x-positions[i]-(isWood?cross:0)));
// Plaatnaden leiden niet tot extra regels: platen mogen op maat worden gezaagd/gesneden.
const seamHeights=[];
const nogginCuts=[];
const cuts=between?[...Array(studs).fill(studLength),width,width,...nogginCuts]:[...Array(studs).fill(height),...segmentLengths,...segmentLengths,...nogginCuts];
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
line(card,'Oppervlakte wand',area.toFixed(2)+' m²');line(card,'Staanders',studs+' × '+studLength+' mm');line(card,'Staanderharten vanaf links',positions.map(x=>Math.round(x)).join(' / ')+' mm');line(card,'Horizontale regels',between?'2 × '+width+' mm':segmentLengths.length+' vakken boven en onder');
line(card,'Totale regellengte',(total/1000).toFixed(2)+' m');line(card,'Handelslengtes (zaagindeling)',bins.length+' × '+stock+' mm'+(waste?' + '+waste+'% reserve (zelf toevoegen)':''));
if(ins!=='none')line(card,'Isolatie '+ins,(area*extra).toFixed(2)+' m², '+num('w-ins-thickness')+' mm');
if(osb!=='none')line(card,'OSB (oppervlakte-indicatie, zagen mogelijk)',ceil(area*extra,num('w-osb-length')*num('w-osb-width')/1e6)+' platen');
if(gypsum)line(card,'Gips (oppervlakte-indicatie, snijden mogelijk)',ceil(area*extra,num('w-gyp-length')*num('w-gyp-width')/1e6)+' platen');
if(osb!=='none')plateSection(card,'OSB',plateLayout(width,height,num('w-osb-length'),num('w-osb-width'),osb,kerf,minOffcut,stagger),'zagen');
if(gypsum)plateSection(card,'Gips',plateLayout(width,height,num('w-gyp-length'),num('w-gyp-width'),$('w-gyp-direction').value,0,minOffcut,stagger),'snijden');
const cutTitle=document.createElement('h3');cutTitle.textContent='Zaaglijst';cutTitle.style.marginTop='24px';card.append(cutTitle);Object.entries(grouped).sort((a,b)=>Number(b[0])-Number(a[0])).forEach(([length,count])=>line(card,count+' stuks',length+' mm'));
if(oversize.length){const warn=document.createElement('p');warn.style.color='#a33';warn.textContent='Let op: '+oversize.length+' delen zijn langer dan de gekozen handelslengte. Kies langere handelslengtes of werk verbindingen constructief uit.';card.append(warn)}
const drawTitle=document.createElement('h3');drawTitle.textContent='Constructietekening (schematisch)';drawTitle.style.marginTop='24px';card.append(drawTitle);
const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 340 230');svg.style.cssText='width:100%;max-height:280px;background:#f5f7f4;border-radius:12px';
const rect=(x,y,w,h,color)=>{const r=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x,y,width:w,height:h,fill:color}))r.setAttribute(k,v);svg.append(r)};
const X=18,Y=18,W=304,H=190,thick=Math.max(3,Math.min(7,cross/height*H));
if(between){rect(X,Y,W,thick,'#ad7b43');rect(X,Y+H-thick,W,thick,'#ad7b43')}
for(const pos of allPositions){const x=X+W*pos/width;rect(Math.min(X+W-4,Math.max(X,x-2)),Y+(between?thick:0),4,H-(between?2*thick:0),'#ad7b43')}
if(!between){for(let i=0;i<positions.length-1;i++){let x=X+W*positions[i]/width+2,w=W*(positions[i+1]-positions[i])/width-4;rect(x,Y,Math.max(0,w),thick,'#ad7b43');rect(x,Y+H-thick,Math.max(0,w),thick,'#ad7b43')}}
const makeSVG=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
const warning=document.createElement('p');warning.style.color='#9a4a12';warning.style.fontWeight='600';
const pointCoords=(p)=>({x:X+W*p.x/width,y:Y+H*(1-p.y/height)});
let moving=-1,moved=false;
function svgCoord(ev){const box=svg.getBoundingClientRect();const vb=svg.viewBox.baseVal;return{x:(ev.clientX-box.left)*vb.width/box.width,y:(ev.clientY-box.top)*vb.height/box.height}}
function renderPoints(){svg.querySelectorAll('.w-electric-point').forEach(e=>e.remove());const clashes=[];points.forEach((p,i)=>{const {x,y}=pointCoords(p);const collision=allPositions.some(pos=>Math.abs(pos-p.x)<=Math.max(35,cross/2+25));if(collision)clashes.push(i+1);const g=makeSVG('g',{class:'w-electric-point','data-index':i,style:'cursor:grab;touch-action:none'});g.append(makeSVG('circle',{cx:x,cy:y,r:7,fill:collision?'#f97316':'#2563eb',stroke:'#fff','stroke-width':2}));const txt=makeSVG('text',{x,y:y+3,'text-anchor':'middle','font-size':9,'font-weight':'bold',fill:'#fff'});txt.textContent=i+1;g.append(txt);g.addEventListener('pointerdown',ev=>{ev.stopPropagation();moving=i;moved=false;g.setPointerCapture(ev.pointerId)});g.addEventListener('pointermove',ev=>{if(moving!==i)return;const pt=svgCoord(ev);p.x=Math.round(Math.max(0,Math.min(width,(pt.x-X)*width/W))/5)*5;p.y=Math.round(Math.max(0,Math.min(height,(Y+H-pt.y)*height/H))/5)*5;moved=true;g.querySelector("circle").setAttribute("cx",pointCoords(p).x);g.querySelector("circle").setAttribute("cy",pointCoords(p).y);g.querySelector("text").setAttribute("x",pointCoords(p).x);g.querySelector("text").setAttribute("y",pointCoords(p).y+3)});g.addEventListener('pointerup',()=>{if(moving===i){moving=-1;savePoints();refreshList();renderPoints()}});svg.append(g)});warning.textContent=clashes.length?'Let op: stroompunt(en) '+clashes.join(', ')+' overlappen mogelijk een staander (oranje). Controleer ook leidingen en elektradozen.':'Blauw = stroompunt · bruin = regelwerk. Tik op de tekening om een punt toe te voegen.'}
svg.style.touchAction='none';svg.addEventListener('click',ev=>{if(ev.target.closest('.w-electric-point'))return;const pt=svgCoord(ev);if(pt.x<X||pt.x>X+W||pt.y<Y||pt.y>Y+H)return;points.push({x:Math.round((pt.x-X)*width/W/5)*5,y:Math.round((Y+H-pt.y)*height/H/5)*5,type:$('w-point-type').value});savePoints();calculate()});
const t=document.createElementNS(ns,'text');t.setAttribute('x','170');t.setAttribute('y','223');t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.textContent=width+' mm × '+height+' mm · h.o.h. '+spacing+' mm';svg.append(t);card.append(svg);card.append(warning);renderPoints();refreshList();
const note=document.createElement('p');note.className='muted';note.textContent='Er worden geen extra staanders of dwarsregels voor plaatnaden toegevoegd. OSB kan gezaagd en gips kan gesneden worden; een praktische plaatindeling met reststukhergebruik wordt getoond; controleer snijverlies, voegverspringing en plaatranden. Controleer plaatranden, bevestiging, aansluitingen en verankering. Staanderhart 2 ligt op de ingestelde h.o.h.-maat gemeten vanaf de buitenzijde links; de eerste en laatste staander sluiten aan op de wanduiteinden. De houtzaagindeling houdt nog geen rekening met zaagbladverlies; bij metal stud kunnen CW-staanders een montagekorting vereisen.';card.append(note);el.replaceChildren(card);
try{localStorage.setItem('klusmaat-wall-draft',JSON.stringify(Object.fromEntries([...document.querySelectorAll('#wall-form input,#wall-form select')].map(x=>[x.id,x.value]))))}catch{}
}
try{const saved=JSON.parse(localStorage.getItem('klusmaat-wall-draft')||'null');if(saved){if(saved['w-type'])$('w-type').value=saved['w-type'];profiles();Object.entries(saved).forEach(([id,value])=>{if($(id))$(id).value=value})}}catch{}
refreshList();
})();
