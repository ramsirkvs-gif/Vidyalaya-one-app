"""MCQ shortcut never restarts the document or flashes Overview during connection."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
needle="cb({val:()=>p==='cbse/draft'?draft:p==='cbse/facultyDraft'?faculty:mission});"
def slow_sdk(route):
 u=route.request.url
 if u.endswith('firebase-app.js'):body=fx['ns']['APP']
 elif u.endswith('firebase-auth.js'):body=fx['ns']['AUTH'].replace('onAuthStateChanged(a,cb){','onAuthStateChanged(a,cb){window.__authStarts=(window.__authStarts||0)+1;')
 else:
  body=fx['DB'];assert needle in body
  body=body.replace(needle,"(window.__pendingData??=[]).push(()=>"+needle[:-1]+");")
  body+='\nwindow.__releaseData=()=>{for(const f of window.__pendingData||[])f();window.__pendingData=[];};'
 route.fulfill(content_type='application/javascript',body=body)
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1280,'height':1000});ctx.route('https://www.gstatic.com/firebasejs/**',slow_sdk);page=ctx.new_page();page.clock.install();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/staff-access',lambda route:mcq_api(page,route));documents=[];page.on('request',lambda r:documents.append(r.url) if r.resource_type=='document' else None)
 page.goto('http://127.0.0.1:8000/cbse-mission.html?feedback=1');page.get_by_role('heading',name='Overview',exact=True).wait_for();page.wait_for_function('window.__pendingData?.length===4');page.evaluate("""()=>{window.__marker='same-document';window.__overviewFlashed=false;new MutationObserver(()=>{if(location.hash.includes('tab=mcq')&&document.querySelector('#mission-view .overview-choice'))window.__overviewFlashed=true;}).observe(document.getElementById('mission-view'),{childList:true,subtree:true});}""")
 assert page.locator('#mission-mcq-shortcut').get_attribute('href')=='#tab=mcq';page.locator('[data-master-segment=mcq]').click();page.locator('[data-mcq-loading]').wait_for();assert page.get_by_role('heading',name='Overview',exact=True).count()==0;assert page.locator('.mission-hero').is_hidden();assert page.locator('.mcq-entry-form').count()==0
 page.clock.fast_forward(13000);assert 'MCQ workspace' in page.locator('#mission-message').inner_text();assert page.locator('[data-mcq-loading]').is_visible();assert '?feedback=1#tab=mcq' in page.url
 page.evaluate('window.__releaseData()');entry=page.locator('.mcq-entry-form');entry.wait_for();assert not page.evaluate('window.__overviewFlashed');assert page.evaluate('window.__marker')=='same-document';assert page.evaluate('window.__authStarts')==1;assert len(documents)==1
 assert entry.get_by_role('button',name='1 · See question bank',exact=True).count()==1;assert entry.locator('.mcq-bank-tile').count()==0
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 entry.locator('[name=mcq-entry-class]').select_option('X');entry.locator('[name=mcq-entry-subject]').select_option('english');entry.get_by_role('button',name='1 · See question bank',exact=True).click();page.get_by_role('heading',name='Question bank · Class X',exact=True).wait_for();assert page.locator('.mcq-workflow-step').count()==0;assert page.get_by_role('button',name='Create QP PDF',exact=True).count()==0;assert page.locator('.mcq-paper-form').count()==0;assert page.locator('#mission-nav').is_hidden()
 # An existing staff-view session also goes directly from loading to entry.
 guest=b.new_context();guest.add_init_script('window.__guest=true');guest.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);gp=guest.new_page();held=[]
 def api(route):
  if route.request.post_data_json.get('action')=='view-data':held.append(route)
  else:mcq_api(gp,route)
 gp.route('**/api/staff-access',api);gp.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq');gp.locator('[data-mcq-loading]').wait_for();assert gp.locator('.overview-choice').count()==0;assert gp.locator('.mcq-entry-form').count()==0;assert held
 held.pop().fulfill(json={'draft':D,'faculty':F,'mission':root['mission'],'versions':[1,1,1]});gp.locator('.mcq-entry-form').wait_for();assert gp.locator('.overview-choice').count()==0
 # Unauthorized readers still see the normal access gate, never private controls.
 locked=b.new_context();locked.add_init_script('window.__guest=true');locked.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);lp=locked.new_page();lp.route('**/api/staff-access',lambda r:r.fulfill(status=401,json={'error':'Enter the staff viewing password.','curtainRequired':True}));lp.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq');lp.get_by_role('heading',name='Staff viewing · first visit only',exact=True).wait_for();assert lp.locator('.mcq-entry-form').count()==0;assert lp.locator('.overview-choice').count()==0
 # The loading shell is visible even while the main application module downloads.
 boot=b.new_context();boot.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);bp=boot.new_page();modules=[];bp.route('**/cbse-mission.js',lambda r:modules.append(r));bp.route('**/api/staff-access',lambda r:mcq_api(bp,r));bp.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq',wait_until='commit');bp.locator('.mcq-bootstrap').wait_for();assert bp.locator('.mission-hero').is_hidden();assert bp.locator('.overview-choice').count()==0;assert modules
 modules.pop().fulfill(content_type='application/javascript',body=Path('cbse-mission.js').read_text());bp.locator('.mcq-entry-form').wait_for();assert bp.locator('.mcq-bootstrap').count()==0
 assert not errors,errors;b.close()
print('PASS no Overview flash/reload, slow connection and existing-session entry, minimal bank and compact secondary links, responsive layout and access gate')
