const $=id=>document.getElementById(id);
let rulesText='',request=null;
async function loadRules(){
 if(rulesText)return rulesText;
 if(!request)request=(async()=>{
  const response=await fetch(new URL('./database.rules.json',import.meta.url),{cache:'no-store'});
  if(!response.ok)throw Error('Could not load the prepared rules. Reload this page and try again.');
  const text=await response.text(),data=JSON.parse(text);
  if(!data.rules?.cbse?.facultyDraft)throw Error('Updated faculty rules are not available in this deployment yet. Please reload after deployment.');
  rulesText=text;return text;
 })().finally(()=>{request=null;});
 return request;
}
export function resetFacultySetup(){
 $('faculty-setup').hidden=true;$('faculty-manual-copy').hidden=true;$('faculty-rules-text').value='';$('faculty-copy-status').textContent='';
}
export function showFacultySetup(){
 $('faculty-setup').hidden=false;
 loadRules().catch(error=>{if(!$('faculty-setup').hidden)$('faculty-copy-status').textContent=error.message;});
}
$('faculty-copy-rules').onclick=async()=>{
 const button=$('faculty-copy-rules');button.disabled=true;
 try{
  const text=await loadRules();
  if($('faculty-setup').hidden)return;
  try{
   await navigator.clipboard.writeText(text);
   $('faculty-copy-status').textContent='Rules copied. Open Firebase Rules, replace the existing code, and click Publish.';
   $('faculty-manual-copy').hidden=true;
  }catch{
   $('faculty-manual-copy').hidden=false;$('faculty-rules-text').value=text;$('faculty-rules-text').focus();$('faculty-rules-text').select();
   $('faculty-copy-status').textContent='Select and copy the rules below, then open Firebase Rules and publish them.';
  }
 }catch(error){if(!$('faculty-setup').hidden)$('faculty-copy-status').textContent=error.message;}
 finally{button.disabled=false;}
};
$('faculty-reload').onclick=()=>window.location.reload();
