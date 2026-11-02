"""Save progress and errors survive a same-route live-render attempt."""
from pathlib import Path
exec(Path('tests/cbse-faculty-editor-browser.py').read_text().split("photo=Path(")[0])
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':720});ctx.route('https://www.gstatic.com/firebasejs/**',sdk);page=ctx.new_page();pending=[];errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def defer(route):
  if route.request.post_data_json['action']=='save-faculty':pending.append(route)
  else:route.fulfill(json={'ok':True,'staff':[]})
 page.route('**/api/staff-access',defer)
 page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=faculty-editor');page.get_by_role('button',name='Add co-opted / support member',exact=True).click()
 form=page.locator('.faculty-unified-form');form.locator('[name=name]').fill('Synthetic Save Failure');form.locator('[name=kind]').select_option('other_support');form.locator('[name=designation]').fill('TGT-Maths');form.locator('[name=pin]').fill('029');form.evaluate("f=>window.__originalSupportForm=f")
 form.get_by_role('button',name='Save faculty & all assignments',exact=True).click();form.get_by_role('status').wait_for(state='visible');assert form.get_by_role('button',name='Saving…',exact=True).is_disabled()
 # The hashchange handler calls the same render used by Firebase live updates.
 page.evaluate("window.dispatchEvent(new Event('hashchange'))")
 assert form.evaluate('f=>f===window.__originalSupportForm');assert form.locator('[name=name]').input_value()=='Synthetic Save Failure'
 page.wait_for_function("document.documentElement.dataset.portalBusy==='true'");assert len(pending)==1
 pending.pop().fulfill(status=503,json={'error':'Secure faculty PIN access needs activation: configure the protected server credential.'})
 alert=form.get_by_role('alert');alert.wait_for(state='visible');assert 'activation' in alert.inner_text();assert alert.evaluate('e=>document.activeElement===e');assert form.get_by_role('button',name='Save faculty & all assignments',exact=True).is_enabled();assert form.locator('[name=pin]').input_value()=='029';assert form.locator('[name=designation]').input_value()=='TGT-Maths';assert form.locator('[name=name]').input_value()=='Synthetic Save Failure';assert not errors,errors
 print('PASS pending save keeps the original support form, blocks duplicate submit, and shows focused server errors without losing entered details');b.close()
