"""Principal reporting requests for CT, all subjects and an individual teacher."""
from pathlib import Path
ns={};exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
with ns['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://www.gstatic.com/firebasejs/**',ns['sdk']);page.route('**/api/staff-access',lambda r:r.fulfill(json={'ok':True,'staff':[{'id':'X:one','name':'Synthetic Teacher'}]}));page.goto('http://127.0.0.1:8000/cbse-mission.html#student=X%3Aa%3Aone');page.get_by_role('heading',name='Progress remarks & teacher reports',exact=True).wait_for();assert page.locator('[name=comment-pin]').count()==1;assert page.locator('.principal-composer textarea').is_enabled();assert page.locator('.teacher-composer textarea').is_enabled()
 for mode in ['ct','subjects','single']:
  page.locator('[name=progress-notes]').fill('Please report '+mode);page.locator('[name=request-mode]').select_option(mode)
  if mode=='subjects':page.locator('[name=allocate_english]').select_option('X:one')
  if mode=='single':page.locator('[name=request-teacher]').select_option('X:one')
  old=page.evaluate('Object.keys(window.__teacherMission?.reportRequests||{}).length');page.get_by_role('button',name='Save remark / request',exact=True).click();page.wait_for_function('(n)=>Object.keys(window.__teacherMission.reportRequests||{}).length===n',arg=old+1)
 assert page.locator('.report-request').count()==3;assert page.locator('.not-reported').count()==3;assert page.evaluate('window.__teacherMission.allocations.X_a_english.staffId')=='X:one';assert len(page.evaluate('window.__teacherMission.tasks'))==3
 page.get_by_role('button',name='Close request',exact=True).last.click();page.wait_for_function("Object.values(window.__teacherMission.reportRequests).some(r=>r.status==='cancelled')");assert page.locator('.report-request').count()==2
 page.evaluate("location.hash='staff=X%3Aone'");page.get_by_role('heading',name='Requested student progress',exact=True).wait_for();assert 'Teacher has not reported progress' in page.locator('#mission-view').inner_text()
 assert not errors,errors
 print('PASS Principal CT/all-subject/single-teacher requests, inline allocation, pending report messages and request closure without Principal PIN')
 b.close()
