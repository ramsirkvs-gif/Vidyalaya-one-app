"""Actual browser Excel loading, new-exam-only import and student/teacher meetings."""
from pathlib import Path
import tempfile
import openpyxl
ns={};exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
json=ns['json'];D=ns['D'];D['classes']['X']['sections']['a']['subjects']['maths']={'name':'MATHS STANDARD','code':''};D['classes']['X']['sections']['a']['students']['one']['subjects']['maths']=True
DB=ns['DB'];a=DB.index('const draft=');b=DB.index(';let mission=');DB='const draft='+json.dumps(D)+',faculty='+json.dumps(ns['F'])+DB[b:]
def sdk(route):
 u=route.request.url;route.fulfill(content_type='application/javascript',body=ns['APP'] if u.endswith('firebase-app.js') else ns['AUTH'] if u.endswith('firebase-auth.js') else DB)
def book(path,exams):
 w=openpyxl.Workbook();s=w.active;s['A4']='Class & Section';s['B4']='10A';s['A5']='Session';s['B5']='2026-27';s.append([])
 for i,v in enumerate(['Sl.No.','Roll No.','Name of the Student','Attendance %'],1):s.cell(8,i,v)
 col=5
 for name,english,maths in exams:
  s.cell(8,col,name);s.merge_cells(start_row=8,start_column=col,end_row=8,end_column=col+2)
  for j,v in enumerate(['English - Language and Literature (40)','Mathematics Standard (40)','Total (80)']):s.cell(9,col+j,v)
  for j,v in enumerate([english,maths,english+maths]):s.cell(10,col+j,v)
  col+=3
 for i,v in enumerate([1,1,'Synthetic Student X','90 %'],1):s.cell(10,i,v)
 w.save(path)
with tempfile.TemporaryDirectory() as temp:
 first=Path(temp)/'Initial.xlsx';second=Path(temp)/'NewExam.xlsx';book(first,[('Monthly Test (X-April)',13,9),('Monthly Test (X-June)',20,21)]);book(second,[('Monthly Test (X-April)',1,1),('Monthly Test (X-June)',2,2),('Monthly Test (X-October)',35,36)])
 with ns['sync_playwright']() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://www.gstatic.com/firebasejs/**',sdk)
  page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-tools').wait_for(state='visible')
  for index,file in enumerate([first,second]):
   page.locator('#mission-excel-file').set_input_files(str(file));page.get_by_role('heading',name='Samagam Excel · X-A',exact=True).wait_for();assert page.locator('[name=critical_40]').input_value()=='10';page.locator('#mission-save').click();page.get_by_role('heading',name='Review academic history import',exact=True).wait_for();text=page.locator('#mission-fields').inner_text();assert ('4 new results' if index==0 else '2 new results; 4 existing results skipped') in text;page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden')
  assert page.evaluate("window.__teacherMission.marks.academic_X_a_one_2026_04_english.score")==13;assert len(page.evaluate('window.__teacherMission.marks'))==6
  page.get_by_role('button',name='Academic profile: Synthetic Student X',exact=True).click();page.get_by_role('heading',name='Academic history and current status',exact=True).wait_for()
  page.get_by_role('button',name='Add / update phone numbers & home location',exact=True).click();page.locator('[name=number-label]').fill('Father');page.locator('[name=number-phone]').fill('1234567890');page.locator('[name=mapLocation]').fill('27.1,93.7');page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden');assert page.get_by_role('link',name='Call Father',exact=True).get_attribute('href')=='tel:1234567890';assert 'google.com/maps' in page.get_by_role('link',name='⌖ Open home location in Google Maps',exact=True).get_attribute('href')
  page.locator('[name=progress-notes]').fill('Please review practice and discuss a home visit');page.locator('[name=request-mode]').select_option('single');page.locator('[name=request-teacher]').select_option('X:one');page.get_by_role('button',name='Save remark / request',exact=True).click();page.wait_for_function('Object.keys(window.__teacherMission.tasks).length===1');assert any(t.get('staffId')=='X:one' for r in page.evaluate('window.__teacherMission.reportRequests').values() for t in r['targets'].values())
  page.get_by_role('button',name='Assign teacher',exact=True).first.click();page.locator('[name=staffId]').select_option('X:one');page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden');page.evaluate("location.hash='staff=X%3Aone'");page.get_by_role('heading',name='Teacher profile · roles & progress',exact=True).wait_for();assert 'Class teacher: X-A' in page.locator('#mission-view').inner_text();page.locator('.teacher-report-scopes').get_by_role('button',name='Subject teacher · X-A',exact=True).click();page.get_by_role('button',name='Review this subject',exact=True).click();page.wait_for_function("document.querySelector('#mission-view').textContent.includes('Subject-teacher review: English')");assert 'staff=X%3Aone' in page.url;assert page.locator('.teacher-inline-review').is_visible();assert 'Subject-teacher review: English' in page.locator('#mission-view').inner_text();assert page.locator('.academic-graph svg').count()==1
  for width in [360,768,1440]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print('PASS direct Excel, merged headers, new-exam-only import, phone/map links, Principal tag/action and CT/subject teacher meeting navigation')
  browser.close()
