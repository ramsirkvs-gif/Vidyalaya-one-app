from pathlib import Path
exec(Path('tests/cbse-remedial-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
plans={}
for key,date,session in [('upcoming','2030-01-02',{}),('missed','2026-11-01',{}),('waiting','2026-11-01',{'status':'submitted','submittedAt':1793502000000,'presentKeys':['X:a:one'],'absentKeys':[]}),('approved','2026-11-01',{'status':'verified','submittedAt':1793502000000,'verifiedAt':1793503000000,'verifiedBy':'principal','approvalComment':'Good work. Continue practice.','presentKeys':['X:a:one'],'absentKeys':[]}),('returned','2026-11-01',{'status':'returned','submittedAt':1793502000000,'returnComment':'Check the absent student list.','presentKeys':['X:a:one'],'absentKeys':[]})]:
 plans[key]={'id':key,'teacherId':'X:one','teacherName':'Synthetic Teacher','classId':'X','sectionId':'a','section':'A','subjectId':'english','subjectName':'English','dates':[date],'start':'07:30','end':'08:30','studentKeys':['X:a:one'],'purpose':key,'status':'planned','createdAt':1793500000000,'createdBy':'X:one','sessions':{date:session} if session else {}}
root['mission']['remedialPlans']=plans
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);page=ctx.new_page();page.route('**/api/staff-access',lambda r:api(page,r));errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=remedial');page.locator('[data-plan-id=approved].remedial-board-card').wait_for()
 expected={'upcoming':'Planned for upcoming day','missed':'Planned but not done','waiting':'Class successfully done · waiting for approval','approved':'Successfully done and approved','returned':'Reverted by Principal'}
 for key,label in expected.items():
  card=page.locator('.remedial-board-card[data-plan-id="'+key+'"]');assert card.locator('.remedial-plan-status').inner_text()==label
 assert 'Good work. Continue practice.' in page.locator('.remedial-board-card[data-plan-id=approved]').inner_text();assert 'Check the absent student list.' in page.locator('.remedial-board-card[data-plan-id=returned]').inner_text();assert 'Good work. Continue practice.' in page.locator('.remedial-plan-strip').inner_text();assert 'Reverted by Principal' in page.locator('.remedial-plan-strip').inner_text()
 page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-nav [data-master-segment=holidays]').wait_for();colours=page.locator('#mission-nav [data-master-segment]').evaluate_all('(nodes)=>nodes.map(n=>getComputedStyle(n).backgroundColor)');assert len(set(colours))==len(colours),(len(set(colours)),len(colours),colours)
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors;b.close()
print('PASS shared staff table/card statuses, public approval/return comments and distinct colourful Mission tiles')
