import {el,options} from './cbse-ui.js';
export function renderMCQSectionScope(parent,ctx,initial=[]){
 const field=(label,name)=>{const l=el('label',label),s=el('select');s.name=name;l.append(s);parent.append(l);return s;},mode=field('Save test for','mcq-save-scope'),single=field('Section','mcq-save-section'),multi=el('fieldset',undefined,'mcq-section-choices'),choices=Object.entries(ctx.draft.classes?.[ctx.classId]?.sections||{}),checks=new Map();let changed=()=>{};
 options(mode,[['all','All sections'],['section','One section'],['sections','Choose multiple sections']]);options(single,choices.map(([id,s])=>[id,ctx.classId+'-'+s.name]));multi.append(el('legend','Tick sections · your own or other sections of this class'));
 for(const [id,s]of choices){const label=el('label',ctx.classId+'-'+s.name),check=el('input');check.type='checkbox';check.name='mcq-save-section-choice';check.value=id;checks.set(id,check);label.prepend(check);multi.append(label);check.onchange=()=>{show();changed();};}parent.append(multi);
 const value=()=>mode.value==='section'?[single.value]:mode.value==='sections'?[...checks].filter(([,c])=>c.checked).map(([id])=>id):[];
 function show(){single.closest('label').hidden=mode.value!=='section';multi.hidden=mode.value!=='sections';mode.setCustomValidity(mode.value==='sections'&&!value().length?'Select at least one section.':'');}
 mode.addEventListener('change',()=>{if(mode.value==='sections'&&![...checks.values()].some(c=>c.checked)&&checks.has(single.value))checks.get(single.value).checked=true;show();changed();});single.addEventListener('change',()=>{show();changed();});
 function restore(ids=[]){const valid=ids.filter(id=>checks.has(id));mode.value=valid.length>1?'sections':valid.length?'section':'all';if(valid.length)single.value=valid[0];for(const [id,c]of checks)c.checked=valid.includes(id);show();}restore(initial);
 return {mode,single,value,roster:()=>mode.value==='sections'&&!value().length?['__no_section__']:value(),restore,onChange:fn=>{changed=fn;},requireValid:()=>{if(mode.value==='sections'&&!value().length)throw Error('Select at least one section.');}};
}
