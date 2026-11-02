"""Focused teacher/student navigation restores list position even after a saved remark."""
from pathlib import Path
fx={};exec(Path('tests/cbse-simple-review-browser.py').read_text().split("with ns['sync_playwright']() as p:")[0],fx)
D,M=fx['D'],fx['M']
for i in range(25):D['classes']['X']['sections']['b']['students']['extra_'+str(i)]={'name':'Synthetic Learner '+str(i),'roll':str(i+3),'subjects':{'english':True}}
for i in [15,16]:M['marks']['extra_'+str(i)]={'studentKey':'X:b:extra_'+str(i),'examId':'e','subjectId':'english','score':20,'maximum':40,'absent':False}
def api(route):
 d=route.request.post_data_json
 if d['action']=='pin-submit' and d.get('operation')=='comment':
  M['records']['saved_review']={'kind':'faculty_comment','studentKey':d['studentKey'],'staffId':d['staffId'],'subjectId':d['subjectId'],'notes':d['notes'],'outcome':'','visibility':'general','authorId':d['staffId'],'authorName':'Synthetic Teacher','authorRole':d['role'],'date':'2026-11-02','updatedAt':3};M['revision']+=1;route.fulfill(json={'ok':True});return
 fx['api'](route)
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':900});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',fx['sdk']);ctx.route('**/api/staff-access',api);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/cbse-mission.html#staff=X%3Aone');target=page.locator('[data-review-student="X:b:extra_15"]');target.scroll_into_view_if_needed();page.wait_for_timeout(100);before=page.evaluate("({y:scrollY,list:document.querySelector('[data-section-key=\"X:b\"]').scrollTop})");url=page.url;target.click();page.wait_for_function("document.body.classList.contains('teacher-student-review-open')");page.wait_for_timeout(100)
 assert page.locator('.teacher-report-content').is_hidden();assert page.locator('.teacher-profile-header').is_hidden();assert page.locator('#teacher-remarks-section').is_hidden();assert page.locator('.teacher-inline-review').is_visible();assert page.evaluate("getComputedStyle(document.querySelector('.teacher-inline-review .academic-progress-window')).maxHeight==='none'")
 page.locator('[name=progress-notes]').fill('Focused learner review saved');page.locator('[name=comment-pin]').fill('123');page.get_by_role('button',name='Submit remark with PIN',exact=True).click();page.get_by_text('Focused learner review saved',exact=True).wait_for();assert page.url==url;assert page.locator('.teacher-report-content').is_hidden();page.get_by_role('button',name='← Back to teacher list',exact=True).click();page.wait_for_function("!document.body.classList.contains('teacher-student-review-open')");page.wait_for_timeout(100);after=page.evaluate("({y:scrollY,list:document.querySelector('[data-section-key=\"X:b\"]').scrollTop,focus:document.activeElement.dataset.reviewStudent})");assert abs(before['y']-after['y'])<3,(before,after);assert abs(before['list']-after['list'])<3,(before,after);assert after['focus']=='X:b:extra_15'
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':900});page.locator('[data-review-student="X:b:extra_16"]').click();page.locator('.teacher-inline-review').wait_for();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('#mission-nav').get_by_role('button',name='← Back',exact=True).click();page.wait_for_function("!document.body.classList.contains('teacher-student-review-open')");assert page.url==url
 page.locator('[data-review-student="X:b:extra_16"]').click();page.locator('#mission-nav').get_by_role('button',name='Teacher-wise overview',exact=True).click();page.get_by_role('heading',name='Teacher-wise overview',exact=True).wait_for();assert page.evaluate("!document.body.classList.contains('teacher-student-review-open')")
 assert not errors,errors
 print('PASS focused single-page student review, saved remark retains review context, Back restores teacher page/list scroll and focus, navigation clears focused mode, mobile/tablet/desktop fit.')
 b.close()
