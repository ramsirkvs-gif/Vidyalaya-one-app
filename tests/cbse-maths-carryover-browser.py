"""Saved Standard-only enrolments display unchanged historical Basic marks without writes."""
from pathlib import Path
exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0])
old=json.dumps(D)
s=D['classes']['X']['sections']['a'];s['subjects']={'basic':{'name':'Maths Basic','code':'241'},'standard':{'name':'Maths Standard','code':'041'}};s['students']['one']['subjects']={'basic':False,'standard':True}
DB=DB.replace(old,json.dumps(D))
m={'schemaVersion':1,'revision':1,'settings':{'redBelow':33,'greenFrom':75,'attendanceRedBelow':75,'attendanceGreenFrom':90},'exams':{'e':{'name':'September test','classId':'X','type':'monthly','date':'2026-09-01'}},'marks':{'old':{'studentKey':'X:a:one','subjectId':'basic','examId':'e','score':17,'maximum':40,'absent':False}},'students':{}}
DB=DB.replace('let mission=null;', 'let mission='+json.dumps(m)+';window.__originalMarks=structuredClone(mission.marks);window.__writes=0;').replace('const next=fn(structuredClone(mission));','window.__writes++;const next=fn(structuredClone(mission));')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for source,target in [('Basic','Standard'),('Standard','Basic')]:
  # Reverse the synthetic fixture for the second direction, preserving source IDs.
  if target=='Basic':
   DB=DB.replace('"basic": false, "standard": true','"basic": true, "standard": false').replace('"subjectId": "basic"','"subjectId": "standard"')
  page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://www.gstatic.com/firebasejs/**',sdk);page.route('**/api/staff-access',lambda r:r.fulfill(json={'posts':[],'total':0,'revision':0}));page.goto('http://127.0.0.1:8000/cbse-mission.html#student=X%3Aa%3Aone');page.get_by_text(f'Previous Maths {source} marks carried forward unchanged to your current Maths {target} subject.',exact=True).wait_for();section=page.locator('#student-academic-section');assert '17/40' in section.inner_text();assert f'Maths {target}' in section.inner_text();assert page.evaluate('window.__writes')==0
  for width in [360,768,1440]:
   page.set_viewport_size({'width':width,'height':950});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors;page.close()
 b.close()
print('PASS both Basic/Standard carry-over directions display historical results without database writes or page overflow')
