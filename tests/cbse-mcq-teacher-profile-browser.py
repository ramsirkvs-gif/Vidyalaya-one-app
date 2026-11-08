"""Teacher profile contribution reflects saved MCQ evaluator attribution."""
from pathlib import Path
exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('\nwith sync_playwright() as p:')[0])
mission={'schemaVersion':1,'revision':1,'settings':{'redBelow':33,'greenFrom':75,'attendanceRedBelow':75,'attendanceGreenFrom':90},'marks':{'one':{'studentKey':'X:a:one','examId':'mcq_QPE001','paperId':'QPE001','source':'mcq-mahaabhiyan','subjectId':'english','score':0,'maximum':20,'evaluatedBy':'X:one','evaluatedByName':'Synthetic Teacher','updatedAt':1794110400000},'other':{'studentKey':'X:a:one','examId':'mcq_QPE002','paperId':'QPE002','source':'mcq-mahaabhiyan','subjectId':'english','score':10,'maximum':20,'evaluatedBy':'X:other','updatedAt':1794110400000}},'exams':{'mcq_QPE001':{'name':'MCQ practice','classId':'X','date':'2026-11-08','source':'mcq-mahaabhiyan'}}}
DB=DB.replace('let mission=null;', 'let mission='+json.dumps(mission)+';')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.route('https://www.gstatic.com/firebasejs/**',sdk);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/cbse-mission.html#staff=X%3Aone');box=page.locator('#teacher-mcq-contribution');box.get_by_role('heading',name='MCQ tests evaluated & reported').wait_for();assert '1 question papers · 1 student evaluations · 1 distinct students' in box.inner_text();assert 'QPE002' not in box.inner_text();box.locator('summary').click();assert 'Synthetic Student X' in box.inner_text();assert '0 / 20' in box.inner_text();assert 'IST' in box.inner_text()
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':850});assert box.evaluate('(n)=>n.scrollWidth<=n.clientWidth')
 box.get_by_role('button',name='Synthetic Student X',exact=False).click();page.wait_for_timeout(500);assert not errors,errors;assert page.locator('#student-academic-section').count(),page.locator('#mission-view').inner_text();b.close()
print('PASS teacher profile MCQ contribution, evaluator-only credit, zero score, student link and responsive widths')
