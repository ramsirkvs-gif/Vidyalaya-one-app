"""Mobile class completion with synthetic camera/location and a Principal session."""
from pathlib import Path
from datetime import datetime, timezone
exec(Path('tests/cbse-remedial-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
NOW=1793923200000 # 6 Nov 2026 00:00 UTC

def session_api(page,route):
 d=route.request.post_data_json
 if d['action']=='remedial-principal':
  if d.get('operation')=='evidence':
   route.fulfill(json={'ok':True,'photo':{'photo':'data:image/jpeg;base64,AA=='}});return
  try:
   r=page.evaluate('''async args=>{const {applyRemedialPlan}=await import('./cbse-remedial-model.js');return applyRemedialPlan(...args);}''',[root['mission'],D,F,d,{'id':'principal','name':'Principal'},NOW])
   if r.get('next'):root['mission']=r.pop('next');page.evaluate('(m)=>window.__mcqEmit(m)',root['mission'])
   route.fulfill(json={'ok':True,**r})
  except Exception as e:route.fulfill(status=409,json={'error':str(e)})
  return
 mcq_api(page,route)

with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
 ctx=b.new_context(viewport={'width':390,'height':844},permissions=['camera','geolocation'],geolocation={'latitude':27.1,'longitude':93.6})
 ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);page=ctx.new_page();page.clock.set_fixed_time(datetime.fromtimestamp(NOW/1000,tz=timezone.utc));page.route('**/api/staff-access',lambda r:session_api(page,r));page.on('dialog',lambda d:d.accept());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=remedial');page.locator('[name=remedial-teacher]').select_option('X:one');page.locator('[name=remedial-scope]').select_option('X|a|english');page.locator('[name=remedial-purpose]').fill('Synthetic class execution');page.get_by_role('button',name='Save plan',exact=True).click();page.get_by_role('status').filter(has_text='Plan saved').wait_for()
 card=page.locator('.remedial-board-card').first;assert 'Serial 1' in card.inner_text();assert 'targeted students' in card.inner_text();page.get_by_role('button',name='View staff planned calendar',exact=True).click();assert page.locator('.remedial-plan-form').is_hidden();card.locator('details[data-plan-id] > summary').click();card.get_by_role('button',name='Take class / attendance / evidence').click();dialog=page.locator('dialog[open]');dialog.get_by_role('button',name='Submit completed remedial class').click();dialog.get_by_text('Capture a class photo with location first.',exact=True).wait_for();dialog.get_by_role('button',name='Mark all present',exact=True).click();dialog.get_by_role('button',name='Take photo',exact=True).click();page.wait_for_function('document.querySelector("dialog video").videoWidth>0');dialog.get_by_role('button',name='Capture photo',exact=True).click();dialog.get_by_text('Photo captured with time and location. Ready to submit.',exact=True).wait_for();dialog.get_by_role('button',name='Call Principal for observation',exact=True).click();dialog.get_by_text('Principal observation requested.',exact=True).wait_for();assert dialog.locator('.remedial-session-attendance input:checked').count()>0;assert dialog.locator('img').is_visible();dialog.get_by_role('button',name='Submit completed remedial class').click();dialog.get_by_text('Completed · awaiting Principal approval',exact=True).wait_for();plan=next(iter(root['mission']['remedialPlans'].values()));session=plan['sessions'][plan['dates'][0]];assert session['status']=='submitted';assert len(session['presentKeys'])==len(plan['studentKeys']);assert session['evidence']['latitude']==27.1;assert 'photo' not in session;dialog.get_by_role('button',name='Close',exact=True).click();page.get_by_role('heading',name='Awaiting Principal approval · 1',exact=True).wait_for();page.get_by_role('button',name='Review and approve class',exact=True).click();dialog.get_by_role('button',name='View captured evidence',exact=True).click();dialog.get_by_role('link',name='View photo location in Google Maps',exact=True).wait_for();dialog.get_by_role('button',name='Approve class successfully conducted',exact=True).click();dialog.get_by_text('Approved · class successfully conducted',exact=True).wait_for();dialog.get_by_role('button',name='Close',exact=True).click();card.get_by_text('EVIDENCE VERIFIED',exact=False).wait_for();page.get_by_role('heading',name='Awaiting Principal approval · 0',exact=True).wait_for();assert page.locator('#mission-nav').evaluate('(n)=>n.classList.contains("mission-compact-nav")');assert page.locator('.mission-switch-menu').evaluate('(n)=>!n.open');assert page.locator('#mission-nav').evaluate('(n)=>getComputedStyle(n).display')=='flex',page.locator('#mission-nav').evaluate('(n)=>getComputedStyle(n).display');assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');b.close()
print('PASS mobile calendar, live camera/location capture, retained attendance/photo after observation request, completed submission and Principal verification')
