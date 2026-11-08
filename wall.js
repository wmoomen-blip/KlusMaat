(()=>{
const $=id=>document.getElementById(id);
const wood=['38 × 63','44 × 69','44 × 94','50 × 75','50 × 100'];
const metal=['CW/UW 50','CW/UW 75','CW/UW 100','CW/UW 125'];
const profile=$('w-profile');
function profiles(){const old=profile.value;profile.innerHTML=($('w-type').value==='wood'?wood:metal).map(v=>`<option value="${v}">${v} mm</option>`).join('');if([...profile.options].some(o=>o.value===old))profile.value=old;const method=$('w-method');method.disabled=$('w-type').value!=='wood';}
$('w-type').addEventListener('change',profiles);profiles();
const num=id=>Number($(id).value),ceil=(a,b)=>Math.ceil(a/b);
const line=(card,name,value)=>{const div=document.createElement('div');div.className='row-between';div.style.cssText='padding:9px 0;border-bottom:1px solid #dce4dd;gap:12px';const a=document.createElement('span');a.textContent=name;const b=document.createElement('strong');b.textContent=value;div.append(a,b);card.append(div)};
$('w-calculate').addEventListener('click',()=>{
const width=num('w-width'),height=num('w-height'),spacing=num('w-spacing'),stock=num('w-stock'),waste=num('w-waste');
const values=[width,height,spacing,stock,num('w-osb-length'),num('w-osb-width'),num('w-gyp-length'),num('w-gyp-width')];
const el=$('w-results');if(values.some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(waste)||waste<0||waste>100){el.textContent='Controleer de maten en toeslag.';return}
const isWood=$('w-type').value==='wood',between=!isWood||$('w-method').value==='between';
const cross=isWood?Number(profile.value.split(' × ')[0]):0;
const positions=[0];for(let x=spacing;x<width;x+=spacing)positions.push(x);positions.push(width);
const studs=positions.length,studLength=between?height-2*cross:height;
if(studLength<=0){el.textContent='Wandhoogte is te klein voor deze regels.';return}
const clearWidth=width-(isWood?cross:0),segmentLengths=positions.slice(1).map((x,i)=>x-positions[i]-(isWood?cross:0));
const cuts=between?[...Array(studs).fill(studLength),width,width]:[...Array(studs).fill(height),...segmentLengths,...segmentLengths];
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
line(card,'Oppervlakte wand',area.toFixed(2)+' m²');line(card,'Staanders',studs+' × '+studLength+' mm');line(card,'Horizontale regels',between?'2 × '+width+' mm':segmentLengths.length+' vakken boven en onder');line(card,'Totale regellengte',(total/1000).toFixed(2)+' m');line(card,'Handelslengtes (zaagindeling)',bins.length+' × '+stock+' mm'+(waste?' + '+waste+'% reserve (zelf toevoegen)':''));
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
for(const pos of positions){const x=X+W*pos/width;rect(Math.min(X+W-3,Math.max(X,x-2)),Y+(between?thick:0),4,H-(between?2*thick:0),'#ad7b43')}
if(!between){for(let i=0;i<positions.length-1;i++){let x=X+W*positions[i]/width+2,w=W*(positions[i+1]-positions[i])/width-4;rect(x,Y,Math.max(0,w),thick,'#ad7b43');rect(x,Y+H-thick,Math.max(0,w),thick,'#ad7b43')}}
const t=document.createElementNS(ns,'text');t.setAttribute('x','170');t.setAttribute('y','223');t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.textContent=width+' mm × '+height+' mm · h.o.h. '+spacing+' mm';svg.append(t);card.append(svg);
const note=document.createElement('p');note.className='muted';note.textContent='Schematische indeling zonder plaatnaadverstevigingen, sparingen of elektra. Controleer aansluitingen, verankering en plaatindeling. De zaagindeling houdt nog geen rekening met zaagbladverlies; bij metal stud kunnen CW-staanders een montagekorting vereisen.';card.append(note);el.replaceChildren(card);
try{localStorage.setItem('klusmaat-wall-draft',JSON.stringify(Object.fromEntries([...document.querySelectorAll('#wall-form input,#wall-form select')].map(x=>[x.id,x.value]))))}catch{}
});
try{const saved=JSON.parse(localStorage.getItem('klusmaat-wall-draft')||'null');if(saved){if(saved['w-type'])$('w-type').value=saved['w-type'];profiles();Object.entries(saved).forEach(([id,value])=>{if($(id))$(id).value=value})}}catch{}
})();
