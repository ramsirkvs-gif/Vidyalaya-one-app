"""Mobile class completion with teacher camera capture followed by a Principal review session."""
from pathlib import Path
from datetime import datetime, timezone
exec(Path('tests/cbse-remedial-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
fail_complete=True
NOW=1793989799000 # 6 Nov 2026 23:59:59 IST, after the scheduled class ends

def session_api(page,route):
 global fail_complete
 d=route.request.post_data_json
 if d['action']=='remedial-principal' or d['action']=='pin-submit' and d.get('operation')=='remedial-plan':
  admin=d['action']=='remedial-principal'
  if not admin and d.get('pin')!='123':route.fulfill(status=401,json={'error':'Incorrect PIN'});return
  d={**d,'operation':d.get('operation') if admin else d.get('planOperation','save')}
  if d.get('operation')=='complete' and fail_complete:
   fail_complete=False;route.fulfill(status=503,json={'error':'Synthetic connection interruption.'});return
  if d.get('operation')=='evidence':
   route.fulfill(json={'ok':True,'photo':{'photo':'data:image/jpeg;base64,AA=='}});return
  try:
   r=page.evaluate('''async args=>{const {applyRemedialPlan}=await import('./cbse-remedial-model.js');return applyRemedialPlan(...args);}''',[root['mission'],D,F,d,({'id':'principal','name':'Principal'} if admin else {'id':'X:one','name':'Synthetic Teacher'}),NOW])
   if r.get('next'):
    root['mission']=r.pop('next');r['plan']=root['mission']['remedialPlans'].get(r['planId']);r['missionRevision']=root['mission']['revision']
   route.fulfill(json={'ok':True,**r})
  except Exception as e:route.fulfill(status=409,json={'error':str(e)})
  return
 mcq_api(page,route)

with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
 ctx=b.new_context(viewport={'width':390,'height':844},permissions=['camera'])
 ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);page=ctx.new_page();page.clock.set_fixed_time(datetime.fromtimestamp(NOW/1000,tz=timezone.utc));page.route('**/api/staff-access',lambda r:session_api(page,r));page.on('dialog',lambda d:d.accept());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=remedial');page.get_by_role('button',name='Schedule a teacher’s class',exact=True).click();page.locator('[name=remedial-teacher]').select_option('X:one');page.locator('[name=remedial-scope]').select_option('X|a|english');assert page.locator('[name=remedial-from]').get_attribute('min')=='2026-11-06';page.locator('[name=remedial-from]').fill('2026-11-05');assert not page.locator('[name=remedial-from]').evaluate('(n)=>n.checkValidity()');page.locator('[name=remedial-from]').fill('2026-11-06');page.locator('[name=remedial-purpose]').fill('Synthetic class execution');page.get_by_role('button',name='Save plan',exact=True).click();page.get_by_role('status').filter(has_text='Plan saved').wait_for()
 card=page.locator('.remedial-board-card').first;assert 'Serial 1' in card.inner_text();assert page.locator('.remedial-plan-strip tbody tr').count()==1;assert 'Synthetic Teacher' in page.locator('.remedial-plan-strip').inner_text();assert 'targeted students' in card.inner_text();page.get_by_role('button',name='Back to planned classes',exact=True).click();assert page.locator('.remedial-plan-form').is_hidden();ctx.add_init_script('window.__guest=true');page.reload();card.get_by_role('button',name='Take attendance & record class').click();page.locator('dialog[open]').get_by_role('button',name='Close',exact=True).click();# Open the same report directly from the concerned teacher profile, without selecting a manager identity.
 page.evaluate("location.hash=new URLSearchParams({staff:'X:one'}).toString()")
 page.get_by_role('link',name='Report remedial class · attendance & photo · English',exact=False).click();
 dialog=page.locator('dialog[open]');dialog.get_by_role('textbox',name='Your personal PIN for this class',exact=True).fill('123');dialog.get_by_role('button',name='Submit record & attendance').click();dialog.get_by_text('Take and capture the class photo first, or attach a class photo.',exact=True).wait_for();dialog.get_by_role('button',name='Mark all present',exact=True).click();dialog.get_by_role('button',name='Take photo',exact=True).click();page.wait_for_function('document.querySelector("dialog video").videoWidth>0');dialog.get_by_role('button',name='Capture photo',exact=True).click();dialog.get_by_text('Photo ready · capture time recorded.',exact=True).wait_for();assert dialog.get_by_role('button',name='Call Principal for observation',exact=True).count()==0;assert dialog.locator('.remedial-session-attendance input:checked').count()>0;assert dialog.locator('img').is_visible();# Attachment upload keeps the camera option and survives bad/cancelled PIN entry.
 original=dialog.locator('img').get_attribute('src')
 import base64
 dialog.get_by_label('Attach class photo',exact=True).set_input_files({'name':'class.jpg','mimeType':'image/jpeg','buffer':base64.b64decode(original.split(',')[1])})
 dialog.get_by_text('Photo ready · selected for this class report.',exact=True).wait_for()
 selected=dialog.locator('img').get_attribute('src');present=dialog.locator('.remedial-session-attendance input:checked').count()
 pin=dialog.get_by_role('textbox',name='Your personal PIN for this class',exact=True)
 pin.fill('000');dialog.get_by_role('button',name='Submit record & attendance').click()
 dialog.get_by_text('Incorrect PIN Your attendance and photo remain here; you can retry.',exact=True).wait_for()
 assert dialog.locator('img').get_attribute('src')==selected
 assert dialog.locator('.remedial-session-attendance input:checked').count()==present
 pin.focus();page.keyboard.press('Escape')
 dialog.get_by_text('PIN entry cancelled. Your attendance and photo remain here; enter your PIN when ready.',exact=True).wait_for()
 assert dialog.is_visible() and dialog.locator('img').get_attribute('src')==selected
 pin.fill('');dialog.get_by_role('button',name='Submit record & attendance').click()
 dialog.get_by_text('Enter your existing personal PIN. Your attendance and photo remain here.',exact=True).wait_for()
 pin.fill('123')
 dialog.get_by_role('button',name='Submit record & attendance').click();dialog.get_by_text('Synthetic connection interruption. Your attendance and photo remain here; you can retry.',exact=True).wait_for();assert dialog.locator('img').is_visible();assert dialog.locator('.remedial-session-attendance input:checked').count()>0;dialog.get_by_role('button',name='Submit record & attendance').click();dialog.get_by_text('Submitted successfully for Principal approval.',exact=True).wait_for();dialog.get_by_text('Class successfully done · waiting for approval',exact=True).wait_for();plan=next(iter(root['mission']['remedialPlans'].values()));session=plan['sessions'][plan['dates'][0]];assert session['status']=='submitted';assert len(session['presentKeys'])==len(plan['studentKeys']);assert session['evidence']['locationStatus']=='not-collected';assert 'latitude' not in session['evidence'];assert 'photo' not in session;dialog.get_by_role('button',name='Close',exact=True).click();ctx.add_init_script('window.__guest=false');page.reload();page.get_by_role('heading',name='Awaiting Principal approval · 1',exact=True).wait_for();page.get_by_role('button',name='Review and approve class',exact=True).click();dialog.get_by_role('button',name='View captured evidence',exact=True).click();assert dialog.get_by_role('link',name='View photo location in Google Maps',exact=True).count()==0;dialog.get_by_role('button',name='Approve · class done',exact=True).click();dialog.get_by_text('Successfully done and approved',exact=True).wait_for();dialog.get_by_role('button',name='Close',exact=True).click();card.get_by_text('EVIDENCE VERIFIED',exact=False).wait_for();page.get_by_role('heading',name='Awaiting Principal approval · 0',exact=True).wait_for();assert page.locator('#mission-nav').evaluate('(n)=>n.classList.contains("mission-compact-nav")');assert page.locator('.mission-switch-menu').evaluate('(n)=>!n.open');assert page.locator('#mission-nav').evaluate('(n)=>getComputedStyle(n).display')=='flex',page.locator('#mission-nav').evaluate('(n)=>getComputedStyle(n).display');page.evaluate('(key)=>{location.hash=new URLSearchParams({student:key}).toString();}',plan['studentKeys'][0]);page.locator('.student-remedial-participation > summary').filter(has_text='Remedial classes attended · 1 · Principal approved').wait_for();page.locator('.student-remedial-participation > summary').click();assert 'Present · approved by Principal' in page.locator('.student-remedial-participation').inner_text();assert 'Synthetic Teacher' in page.locator('.student-remedial-participation').inner_text();page.locator('#mission-nav').get_by_role('button',name='⌂ Home',exact=True).click();page.locator('#mission-nav [data-master-segment=remedial]').wait_for();assert page.locator('#mission-nav [data-master-segment=remedial]').count()==1;page.locator('#mission-nav [data-master-segment=remedial]').click();page.get_by_role('heading',name='Planned classes',exact=True).wait_for();assert page.locator('.remedial-plan-form').is_hidden();assert page.locator('.remedial-plan-strip').is_visible();assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');b.close()
print('PASS direct attendance workflow, photo without location, no observation request button, completion and Principal class-done approval')
