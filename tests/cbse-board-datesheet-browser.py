"""School-only date sheet, explicit standard/subject choice and source references."""
from pathlib import Path
exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('\nwith sync_playwright() as p:')[0])
old=json.dumps(D)
D['classes']['X']['sections']['a']['subjects']['science']={'name':'Science','code':'086'}
D['classes']['XII']['sections']['a']['subjects'].update({'physics':{'name':'Physics','code':'042'},'cs':{'name':'Computer Science','code':'083'},'ip':{'name':'Informatics Practices','code':'065'}})
DB=DB.replace(old,json.dumps(D))
with sync_playwright() as p:
 calls=[];saved={}
 def exam_api(route):
  v=route.request.post_data_json;calls.append(v)
  if v['action']=='exam-attendance-read':
   assert route.request.headers.get('authorization')=='Bearer test-token';route.fulfill(json={'ok':True,'principal':True,'serverDate':'2027-02-16','paper':{'date':'2027-02-16','name':'Physics'},'records':saved,'students':[{'key':'XII:a:one','name':'Synthetic Student XII','classId':'XII','sectionId':'a','section':'A','roll':'001','contact':{'guardian':'Synthetic Parent','phones':'9876543210','location':'Saved address'}}]})
  elif v['action']=='exam-attendance-principal':
   assert route.request.headers.get('authorization')=='Bearer test-token';saved[v['changes'][0]['studentKey']]={'status':v['changes'][0]['status'],'updatedAt':1802750400000,'updatedBy':'principal','updatedByName':'Principal','revision':1};route.fulfill(json={'ok':True,'records':saved,'serverDate':'2027-02-16'})
  else:route.fulfill(json={'ok':True,'staff':[]})
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.route('https://www.gstatic.com/firebasejs/**',sdk);page.route('**/api/staff-access',exam_api);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=board-dates&exam=cbse');box=page.locator('[data-board-datesheet]');box.get_by_role('heading',name='CBSE Date Sheet 2027 & Student Attendance').wait_for();assert page.locator('.board-date-card').count()==0
 page.locator('[name=board-standard]').select_option('X');assert page.locator('.board-date-card').count()==2;assert '26 Feb 2027' in box.inner_text();assert '22 Feb 2027' in box.inner_text();assert 'Physics' not in page.locator('.board-date-list').inner_text();assert 'English (Language and Literature)' in box.inner_text();assert 'CBSE code: 184' in box.inner_text();assert page.locator('a[href="cbse-board-datesheet-2027.pdf#page=4"]').count()==1
 page.locator('[name=board-standard]').select_option('XII');assert page.locator('.board-date-card').count()==4;assert '16 Feb 2027' in box.inner_text();assert page.locator('[data-exam-date="2027-03-31"]').count()==2;options=page.locator('[name=board-subject] option');page.locator('[name=board-subject]').select_option(options.filter(has_text='Physics').get_attribute('value'));assert page.locator('.board-date-card').count()==1;assert 'Physics' in page.locator('.board-date-card').inner_text();assert '1:30 p.m.' in box.inner_text()
 page.get_by_role('button',name='Exam-centre attendance',exact=True).click();page.locator('.exam-attendance-row').wait_for();assert page.locator('[name=exam-attendance-staff]').count()==0;page.get_by_role('radio',name='Synthetic Student XII — Present',exact=True).check();page.get_by_role('button',name='Save attendance',exact=True).click();page.get_by_text('Attendance saved · 1 student.',exact=True).wait_for();assert page.get_by_role('dialog').count()==0;assert calls[-1]['action']=='exam-attendance-principal'
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=board-dates&exam=preboard2');page.get_by_role('heading',name='Preboard 2 Date Sheet & Student Attendance',exact=True).wait_for();page.locator('[name=board-standard]').select_option('X');assert page.locator('.board-date-card').count()==2;assert '16 Dec 2026' in page.locator('[data-board-datesheet]').inner_text();assert '14 Jan 2027' in page.locator('[data-board-datesheet]').inner_text();assert not errors,errors;b.close()
print('PASS school-only CBSE dates, X/XII and subject filters, source pages, published Preboard 2 and responsive widths')
