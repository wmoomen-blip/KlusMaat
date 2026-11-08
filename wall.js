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
$('w-calculate').addEventListener('click',calculate);
function calculate(){
const width=num('w-width'),height=num('w-height'),spacing=num('w-spacing'),stock=num('w-stock'),waste=num('w-waste');
const values=[width,height,spacing,stock,num('w-osb-length'),num('w-osb-width'),num('w-gyp-length'),num('w-gyp-width')];
const el=$('w-results');if(values.some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(waste)||waste<0||waste>100){el.textContent='Controleer de maten en toeslag.';return}
const isWood=$('w-type').value==='wood',between=!isWood||$('w-method').value==='between';
const cross=isWood?Number(profile.value.split(' × ')[0]):0;
const positions=[0];for(let x=spacing;x<width;x+=spacing)positions.push(x);positions.push(width);
// Add supporting studs at vertical OSB seams when the seam is not near an existing stud.
const osbDirection=$('w-osb').value,osbW=num('w-osb-width'),osbL=num('w-osb-length');
const seamPositions=[];
if(osbDirection==='vertical')for(let x=osbW;x<width;x+=osbW)seamPositions.push(x);
if(osbDirection==='horizontal')for(let x=osbL;x<width;x+=osbL)seamPositions.push(x);
const extraStuds=seamPositions.filter(x=>!positions.some(p=>Math.abs(p-x)<=Math.max(15,cross/2)));
const allPositions=[...positions,...extraStuds].sort((a,b)=>a-b);
const studs=allPositions.length,studLength=between?height-2*cross:height;
if(studLength<=0){el.textContent='Wandhoogte is te klein voor deze regels.';return}
const clearWidth=width-(isWood?cross:0),segmentLengths=positions.slice(1).map((x,i)=>x-positions[i]-(isWood?cross:0));
// Horizontal seams require noggins for OSB support, split at each stud bay.
const seamHeights=[];
if(osbDirection==='vertical')for(let y=osbL;y<height;y+=osbL)seamHeights.push(y);
if(osbDirection==='horizontal')for(let y=osbW;y<height;y+=osbW)seamHeights.push(y);
const bayCuts=allPositions.slice(1).map((x,i)=>Math.max(0,x-allPositions[i]-(isWood?cross:0)));
const nogginCuts=seamHeights.flatMap(()=>bayCuts);
const cuts=between?[...Array(studs).fill(studLength),width,width,...nogginCuts]:[...Array(studs).fill(height),...segmentLengths,...segmentLengths,...nogginCuts];
const total=cuts.reduce((a,b)=>a+b,0),extra=1+waste/100;
const grouped={};cuts.forEach(x=>{grouped[x]=(grouped[x]||0)+1});
// First-fit decreasing: every individual cut must fit in a stock length.
let bins=[];const oversize=[];
for(const cut of [...cuts].sort((a,b)=>b-a)){
 if(cut>stock){oversize.push(cut);continue}
 let found=bins.findIndex(rem=>rem>=cut);if(found<0)bins.push(stock-cut);else bins[found]-=cut;
}
const area=width*height/1e6,osb=$('w-osb').value,gypsum=$('w-gypsum').value==='yes',ins=$('w-insulation').value;
const card=document.createElement('div');card.className='card';const h=document.createElement('h3');h.textContent='Materiaallijst – '+profile.value+' mm';card.append(h);
line(card,'Oppervlakte wand',area.toFixed(2)+' m²');line(card,'Staanders',studs+' × '+studLength+' mm ('+extraStuds.length+' extra bij plaatnaden)');line(card,'Horizontale regels',between?'2 × '+width+' mm':segmentLengths.length+' vakken boven en onder');if(nogginCuts.length)line(card,'Extra dwarsregels plaatnaden',nogginCuts.length+' stuks, '+seamHeights.length+' rij(en)');
line(card,'Totale regellengte',(total/1000).toFixed(2)+' m');line(card,'Handelslengtes (zaagindeling)',bins.length+' × '+stock+' mm'+(waste?' + '+waste+'% reserve (zelf toevoegen)':''));
if(ins!=='none')line(card,'Isolatie '+ins,(area*extra).toFixed(2)+' m², '+num('w-ins-thickness')+' mm');
if(osb!=='none')line(card,'OSB (oppervlakte-indicatie)',ceil(area*extra,num('w-osb-length')*num('w-osb-width')/1e6)+' platen');
if(gypsum)line(card,'Gips (oppervlakte-indicatie)',ceil(area*extra,num('w-gyp-length')*num('w-gyp-width')/1e6)+' platen');
const cutTitle=document.createElement('h3');cutTitle.textContent='Zaaglijst';cutTitle.style.marginTop='24px';card.append(cutTitle);Object.entries(grouped).sort((a,b)=>Number(b[0])-Number(a[0])).forEach(([length,count])=>line(card,count+' stuks',length+' mm'));
if(oversize.length){const warn=document.createElement('p');warn.style.color='#a33';warn.textContent='Let op: '+oversize.length+' delen zijn langer dan de gekozen handelslengte. Kies langere handelslengtes of werk verbindingen constructief uit.';card.append(warn)}
const drawTitle=document.createElement('h3');drawTitle.textContent='Constructietekening (schematisch)';drawTitle.style.marginTop='24px';card.append(drawTitle);
const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 340 230');svg.style.cssText='width:100%;max-height:280px;background:#f5f7f4;border-radius:12px';
const rect=(x,y,w,h,color)=>{const r=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x,y,width:w,height:h,fill:color}))r.setAttribute(k,v);svg.append(r)};
const X=18,Y=18,W=304,H=190,thick=Math.max(3,Math.min(7,cross/height*H));
if(between){rect(X,Y,W,thick,'#ad7b43');rect(X,Y+H-thick,W,thick,'#ad7b43')}
for(const pos of allPositions){const x=X+W*pos/width;rect(Math.min(X+W-3,Math.max(X,x-2)),Y+(between?thick:0),4,H-(between?2*thick:0),'#ad7b43')}
if(!between){for(let i=0;i<positions.length-1;i++){let x=X+W*positions[i]/width+2,w=W*(positions[i+1]-positions[i])/width-4;rect(x,Y,Math.max(0,w),thick,'#ad7b43');rect(x,Y+H-thick,Math.max(0,w),thick,'#ad7b43')}}
// Mark horizontal plate seams and their backing noggins.
for(const y of seamHeights){const sy=Y+H*(1-y/height);for(let i=0;i<allPositions.length-1;i++){const x=X+W*allPositions[i]/width+2;const w=W*(allPositions[i+1]-allPositions[i])/width-4;rect(x,sy-2,Math.max(0,w),4,'#bd9358')}}
const makeSVG=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
const warning=document.createElement('p');warning.style.color='#9a4a12';warning.style.fontWeight='600';
const pointCoords=(p)=>({x:X+W*p.x/width,y:Y+H*(1-p.y/height)});
let moving=-1,moved=false;
function svgCoord(ev){const box=svg.getBoundingClientRect();const vb=svg.viewBox.baseVal;return{x:(ev.clientX-box.left)*vb.width/box.width,y:(ev.clientY-box.top)*vb.height/box.height}}
function renderPoints(){svg.querySelectorAll('.w-electric-point').forEach(e=>e.remove());const clashes=[];points.forEach((p,i)=>{const {x,y}=pointCoords(p);const collision=allPositions.some(pos=>Math.abs(pos-p.x)<=Math.max(35,cross/2+25));if(collision)clashes.push(i+1);const g=makeSVG('g',{class:'w-electric-point','data-index':i,style:'cursor:grab;touch-action:none'});g.append(makeSVG('circle',{cx:x,cy:y,r:7,fill:collision?'#f97316':'#2563eb',stroke:'#fff','stroke-width':2}));const txt=makeSVG('text',{x,y:y+3,'text-anchor':'middle','font-size':9,'font-weight':'bold',fill:'#fff'});txt.textContent=i+1;g.append(txt);g.addEventListener('pointerdown',ev=>{ev.stopPropagation();moving=i;moved=false;g.setPointerCapture(ev.pointerId)});g.addEventListener('pointermove',ev=>{if(moving!==i)return;const pt=svgCoord(ev);p.x=Math.round(Math.max(0,Math.min(width,(pt.x-X)*width/W))/5)*5;p.y=Math.round(Math.max(0,Math.min(height,(Y+H-pt.y)*height/H))/5)*5;moved=true;g.querySelector("circle").setAttribute("cx",pointCoords(p).x);g.querySelector("circle").setAttribute("cy",pointCoords(p).y);g.querySelector("text").setAttribute("x",pointCoords(p).x);g.querySelector("text").setAttribute("y",pointCoords(p).y+3)});g.addEventListener('pointerup',()=>{if(moving===i){moving=-1;savePoints();refreshList();renderPoints()}});svg.append(g)});warning.textContent=clashes.length?'Let op: stroompunt(en) '+clashes.join(', ')+' overlappen mogelijk een staander (oranje). Controleer ook leidingen en elektradozen.':'Blauw = stroompunt · bruin = regelwerk. Tik op de tekening om een punt toe te voegen.'}
svg.style.touchAction='none';svg.addEventListener('click',ev=>{if(ev.target.closest('.w-electric-point'))return;const pt=svgCoord(ev);if(pt.x<X||pt.x>X+W||pt.y<Y||pt.y>Y+H)return;points.push({x:Math.round((pt.x-X)*width/W/5)*5,y:Math.round((Y+H-pt.y)*height/H/5)*5,type:$('w-point-type').value});savePoints();calculate()});
const t=document.createElementNS(ns,'text');t.setAttribute('x','170');t.setAttribute('y','223');t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.textContent=width+' mm × '+height+' mm · h.o.h. '+spacing+' mm';svg.append(t);card.append(svg);card.append(warning);renderPoints();refreshList();
const note=document.createElement('p');note.className='muted';note.textContent='Plaatnaadondersteuning is indicatief; controleer plaatranden, bevestiging en eventuele verspringende naden. Controleer aansluitingen, verankering en plaatindeling. De zaagindeling houdt nog geen rekening met zaagbladverlies; bij metal stud kunnen CW-staanders een montagekorting vereisen.';card.append(note);el.replaceChildren(card);
try{localStorage.setItem('klusmaat-wall-draft',JSON.stringify(Object.fromEntries([...document.querySelectorAll('#wall-form input,#wall-form select')].map(x=>[x.id,x.value]))))}catch{}
}
try{const saved=JSON.parse(localStorage.getItem('klusmaat-wall-draft')||'null');if(saved){if(saved['w-type'])$('w-type').value=saved['w-type'];profiles();Object.entries(saved).forEach(([id,value])=>{if($(id))$(id).value=value})}}catch{}
refreshList();
})();
