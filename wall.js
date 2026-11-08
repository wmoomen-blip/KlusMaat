(()=>{
const $=id=>document.getElementById(id);
const wood=['38 × 63','44 × 69','44 × 94','50 × 75','50 × 100'];
const metal=['CW/UW 50','CW/UW 75','CW/UW 100','CW/UW 125'];
const profile=$('w-profile');
function profiles(){const old=profile.value;profile.innerHTML=($('w-type').value==='wood'?wood:metal).map(v=>`<option value="${v}">${v} mm</option>`).join('');if([...profile.options].some(o=>o.value===old))profile.value=old;}
$('w-type').addEventListener('change',profiles);profiles();
const number=id=>Number($(id).value);
const ceil=(a,b)=>Math.ceil(a/b);
$('w-calculate').addEventListener('click',()=>{
 const width=number('w-width'),height=number('w-height'),spacing=number('w-spacing'),stock=number('w-stock'),waste=number('w-waste');
 const values=[width,height,spacing,stock,number('w-osb-length'),number('w-osb-width'),number('w-gyp-length'),number('w-gyp-width')];
 if(values.some(v=>!Number.isFinite(v)||v<=0)||!Number.isFinite(waste)||waste<0||waste>100){$('w-results').textContent='Controleer de maten en de toeslag.';return;}
 const studs=ceil(width,spacing)+1,area=width*height/1e6,extra=1+waste/100;
 const lengths=studs*height+2*width;
 const totalPieces=ceil(lengths*extra,stock);
 const osb=$('w-osb').value,gypsum=$('w-gypsum').value==='yes',ins=$('w-insulation').value;
 const osbArea=number('w-osb-length')*number('w-osb-width')/1e6;
 const gypArea=number('w-gyp-length')*number('w-gyp-width')/1e6;
 const rows=[['Oppervlakte wand',area.toFixed(2)+' m²'],['Staanders',studs+' stuks van '+height+' mm'],['Boven- en onderregel',(2*width/1000).toFixed(2)+' strekkende meter'],['Totale benodigde profiellengte',(lengths/1000).toFixed(2)+' m'],['Handelslengtes (indicatie)',totalPieces+' × '+stock+' mm']];
 if(ins!=='none')rows.push(['Isolatie: '+ins, (area*extra).toFixed(2)+' m², '+number('w-ins-thickness')+' mm dik']);
 if(osb!=='none')rows.push(['OSB ('+(osb==='vertical'?'verticaal':'horizontaal')+')',ceil(area*extra,osbArea)+' platen']);
 if(gypsum)rows.push(['Gipsplaten',ceil(area*extra,gypArea)+' platen']);
 const el=$('w-results');el.replaceChildren();const card=document.createElement('div');card.className='card';const heading=document.createElement('h3');heading.textContent='Materiaallijst – '+profile.value+' mm';card.append(heading);
 rows.forEach(([name,value])=>{const line=document.createElement('div');line.className='row-between';line.style.cssText='padding:9px 0;border-bottom:1px solid #dce4dd;gap:12px';const label=document.createElement('span');label.textContent=name;const val=document.createElement('strong');val.textContent=value;line.append(label,val);card.append(line)});
 const note=document.createElement('p');note.className='muted';note.textContent='Handelslengtes zijn alleen op totale lengte berekend; controleer afzonderlijke zaaglengtes en afval. De h.o.h.-verdeling is voorlopig zonder extra stijlen bij naden.';card.append(note);el.append(card);
 try{localStorage.setItem('klusmaat-wall-draft',JSON.stringify(Object.fromEntries([...document.querySelectorAll('#wall-form input,#wall-form select')].map(x=>[x.id,x.value]))))}catch{}
});
try{const saved=JSON.parse(localStorage.getItem('klusmaat-wall-draft')||'null');if(saved){if(saved['w-type'])$('w-type').value=saved['w-type'];profiles();Object.entries(saved).forEach(([id,value])=>{if($(id))$(id).value=value})}}catch{}
})();
