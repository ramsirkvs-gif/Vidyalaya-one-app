"""Restored original sizing and scrolling navigation; functional workflows are retained."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':800});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def api(route):
  d=route.request.post_data_json
  if d['action']=='news-read':route.fulfill(json={'posts':[],'total':0,'revision':0,'page':0,'pageSize':5});return
  mcq_api(page,route)
 page.route('**/api/staff-access',api)
 for tab in ['academics','news','teachers']:
  page.goto('http://127.0.0.1:8000/cbse-mission.html?restore='+tab+'#tab='+tab);nav=page.locator('#mission-nav');nav.get_by_role('button',name='Conversations',exact=True).wait_for()
  for width in [320,360,390,430,768]:
   page.set_viewport_size({'width':width,'height':800});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert nav.evaluate('(e)=>getComputedStyle(e).flexWrap==="nowrap"');assert nav.evaluate('(e)=>getComputedStyle(e).overflowX==="auto"');assert nav.locator('button').evaluate_all('(nodes)=>nodes.every(n=>getComputedStyle(n).whiteSpace==="nowrap"&&getComputedStyle(n).flexShrink==="0")');assert len(set(nav.locator('button').evaluate_all('(nodes)=>nodes.map(n=>Math.round(n.getBoundingClientRect().top))')))==1
  if tab=='academics':page.set_viewport_size({'width':390,'height':800});page.screenshot(path='/tmp/mission-restored-academic-nav.png',full_page=True)
 page.goto('http://127.0.0.1:8000/cbse-mission.html?profile=restore#staff=X%3Aone');page.locator('#teacher-contact-details').wait_for();ordered=['teacher-profile-overview','teacher-notifications','teacher-roles-responsibilities','teacher-academic-progress','teacher-contact-details'];assert page.evaluate('(ids)=>ids.every((id,i)=>i===0||!!(document.getElementById(ids[i-1]).compareDocumentPosition(document.getElementById(id))&Node.DOCUMENT_POSITION_FOLLOWING))',ordered)
 page.goto('http://127.0.0.1:8000/cbse-mission.html?mcq=restore#tab=mcq');entry=page.locator('.mcq-entry-form');entry.wait_for();assert entry.locator('.mcq-start-choices button').count()==4;assert len(set(entry.locator('.mcq-start-choices button').evaluate_all('(nodes)=>nodes.map(n=>Math.round(n.getBoundingClientRect().top))')))==4;assert entry.locator('[name=mcq-entry-class]').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')>=16;assert entry.get_by_role('button',name='2 · Select questions & make question paper',exact=True).inner_text()=='2 · Select questions & make question paper'
 for path in ['index.html','cbse-admin.html','cbse-faculty.html','cbse-settings.html','cbse-students.html']:
  page.goto('http://127.0.0.1:8000/'+path)
  for width in [320,390]:page.set_viewport_size({'width':width,'height':800});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),path
 assert not errors,errors;b.close()
print('PASS restored fonts/spacing and full-label horizontal navigation, one-column MCQ choices, preserved teacher profile order and portal page fit')
