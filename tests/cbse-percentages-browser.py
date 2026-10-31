"""Percentage criteria, extra columns and denominators follow the selected cohort."""
from pathlib import Path
ns={};exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
D=ns['D'];D['classes']['X']['sections']['a']['students']['two']={'name':'Second Student','roll':'002','subjects':{'english':True}}
M={'schemaVersion':1,'revision':1,'settings':{'redBelow':33,'greenFrom':75,'attendanceRedBelow':75,'attendanceGreenFrom':90},'exams':{'e':{'name':'September','classId':'X','date':'2026-09','datePrecision':'month','type':'monthly'}},'marks':{}}
for sid,score in [('one',13),('two',9)]:M['marks'][sid]={'studentKey':'X:a:'+sid,'examId':'e','subjectId':'english','score':score,'maximum':40,'absent':False,'importSource':'monthly_workbook_v1','criticalBelow':10,'passFrom':13,'secureFrom':18,'inferredAbsent':False}
DB=ns['DB'];start=DB.index('const draft=');end=DB.index(';const callbacks=');DB='const draft='+ns['json'].dumps(D)+',faculty='+ns['json'].dumps(ns['F'])+';let mission='+ns['json'].dumps(M)+DB[end:]
def sdk(route):
 u=route.request.url;route.fulfill(content_type='application/javascript',body=ns['APP'] if u.endswith('firebase-app.js') else ns['AUTH'] if u.endswith('firebase-auth.js') else DB)
with ns['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.route('https://www.gstatic.com/firebasejs/**',sdk);page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=academics');page.get_by_role('heading',name='Students academic history',exact=True).wait_for();page.get_by_role('combobox',name='Academic class',exact=True).select_option('X')
 assert page.get_by_role('button',name='Critical fail: 1 out of 2 students',exact=True).count()==1;text=page.locator('.performance-criteria').inner_text();assert 'below 25%' in text;assert '32.5%' in text;assert '45%' in text;assert '13/40 = 32.5%' in text
 page.get_by_role('searchbox',name='Academic student search',exact=True).fill('Second');assert page.get_by_role('button',name='Critical fail: 1 out of 2 students',exact=True).count()==1;assert 'Showing 1 out of 2' in page.locator('#mission-view').inner_text();page.get_by_role('searchbox',name='Academic student search',exact=True).fill('')
 page.get_by_role('button',name='Academic profile: Synthetic Student X',exact=True).click();page.get_by_role('heading',name='Academic history · monthly & subject-wise',exact=True).wait_for();assert page.get_by_role('columnheader').filter(has_text='2026 · %').count()>=1;assert '32.5%' in page.locator('#mission-view').inner_text();assert 'Section total: 2 students' in page.locator('#mission-view').inner_text();assert page.get_by_role('columnheader',name='Percentage',exact=True).count()>=1
 for width in [360,768,1440]:page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 print('PASS percentage header criteria, marks-plus-percent columns, correct section totals and search-stable denominators')
 b.close()
