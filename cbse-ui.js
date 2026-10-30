export function el(tag, text, className) { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; if(className)node.className=className; return node; }
export function cell(row,text) { const node=el('td',String(text??''));row.append(node);return node; }
export function head(target,labels) { const row=el('tr');for(const label of labels)row.append(el('th',label));target.replaceChildren(row); }
export function options(select,items,selected='') { select.replaceChildren(...items.map(([value,label])=>{const opt=el('option',label);opt.value=value;return opt;}));select.value=items.some(([v])=>v===selected)?selected:items[0]?.[0]||''; }
export function stats(target,items) { target.replaceChildren(...items.map(([value,label])=>{const box=el('div',undefined,'stat');box.append(el('strong',String(value)),el('span',label));return box;})); }
export function date(value) { return value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'Not yet published'; }
