"""A saved teacher reply clears both notices, including older unlinked responses."""
from pathlib import Path
fx={};exec(Path('tests/cbse-simple-review-browser.py').read_text().split("with ns['sync_playwright']() as p:")[0],fx)
M=fx['M'];M['records'].pop('teacherreview',None)
M['records']['principal_old']={'kind':'faculty_comment','studentKey':'','staffId':'X:one','authorId':'principal','authorName':'Principal','visibility':'general','notes':'Please prioritise these students','date':'2026-11-01','updatedAt':100}
M['records']['teacher_old']={**M['records']['principal_old'],'authorId':'X:one','authorName':'Synthetic Teacher','notes':'Yes sir, priority will be these students','updatedAt':200}
calls=[]
def api(route):
 d=route.request.post_data_json;calls.append(d)
 if d['action']=='pin-submit':
  assert d['operation']=='teacher-comment' and d['replyToRecord']=='principal_new'
  M['records']['teacher_new']={**M['records']['teacher_old'],'notes':d['notes'],'replyToRecord':d['replyToRecord'],'updatedAt':400};M['revision']+=1;route.fulfill(json={'ok':True});return
 fx['api'](route)
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.add_init_script('window.__guest=true');page.route('https://www.gstatic.com/firebasejs/**',fx['sdk']);page.route('**/api/staff-access',api);page.goto('http://127.0.0.1:8000/cbse-mission.html#staff=X%3Aone');page.get_by_text('Teacher has replied',exact=True).wait_for();assert page.locator('.teacher-profile-header .pending-report-notice').count()==0;assert page.locator('#teacher-remarks-section .pending-report-notice').count()==0;assert page.locator('.conversation-replies [data-record-id=teacher_old]').count()==1
 M['records']['principal_new']={**M['records']['principal_old'],'notes':'Please send the next progress update','updatedAt':300};M['revision']+=1
 page.goto('http://127.0.0.1:8000/cbse-mission.html?case=new#staff=X%3Aone');page.get_by_text('Teacher has not reported progress',exact=True).wait_for();assert page.locator('.teacher-profile-header .pending-report-notice').count()==1;assert page.locator('#teacher-remarks-section .pending-report-notice').count()==1;assert 'Please send the next progress update' in page.locator('.teacher-composer').inner_text()
 page.locator('[name=teacher-notes]').fill('Next progress update completed');page.locator('[name=teacher-pin]').fill('123');page.get_by_role('button',name='Post comment with PIN',exact=True).click();page.get_by_text('Next progress update completed',exact=True).wait_for();assert page.locator('.teacher-profile-header .pending-report-notice').count()==0;assert page.locator('#teacher-remarks-section .pending-report-notice').count()==0;assert page.get_by_text('Teacher has not reported progress',exact=True).count()==0;assert page.get_by_text('Teacher has replied',exact=True).count()==2
 print('PASS older unlinked reply clears header/thread alerts; new Principal comment waits; direct teacher submission attaches pending comment and clears both alerts after saving.')
 b.close()
