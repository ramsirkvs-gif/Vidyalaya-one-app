"""Synthetic reviewed support/email import, scoped profiles and Class VC links."""
from pathlib import Path
import json,csv,io
ns={};exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
original_draft=json.dumps(ns['D'])
for group in ns['D']['classes'].values():
 for section in group['sections'].values():
  section['subjects']['ai']={'name':'Artificial Intelligence','code':''}
  for student in section['students'].values():student['subjects']['ai']=True
ns['DB']=ns['DB'].replace(original_draft,json.dumps(ns['D']))
initial={'schemaVersion':1,'revision':1,'settings':{'redBelow':33,'greenFrom':75,'attendanceRedBelow':75,'attendanceGreenFrom':90},'students':{},'exams':{'e':{'name':'Synthetic exam','classId':'X','date':'2026-10-31','type':'monthly'}},'marks':{'eng':{'studentKey':'X:a:one','subjectId':'english','examId':'e','score':20,'maximum':40,'absent':False},'ai':{'studentKey':'X:a:one','subjectId':'ai','examId':'e','score':20,'maximum':40,'absent':False}}}
ns['DB']=ns['DB'].replace('let mission=null','let mission='+json.dumps(initial))
pkg={'format':'mission-vc-support-v1','members':[
 {'name':'Synthetic PRT','designation':'PRT','kind':'prt','purpose':'MCQs & writing practice implementation · all subjects except AI','scopes':[{'classId':'X','sections':['A'],'subjectScope':'non_ai'}]},
 {'name':'Synthetic Special Educator','designation':'Special Educator','kind':'special_educator','purpose':'Fine motor skills support','scopes':[{'classId':'X','sections':['A'],'subjectScope':'all'},{'classId':'XII','sections':['A'],'subjectScope':'all'}]}
 ,{'name':'Synthetic Counsellor','designation':'Counsellor','kind':'counsellor','purpose':'Mental health counselling','scopes':[{'classId':'X','sections':['A'],'subjectScope':'all'},{'classId':'XII','sections':['A'],'subjectScope':'all'}]}
 ,{'name':'Synthetic AI Instructor','designation':'Computer Instructor','kind':'support','purpose':'AI support','scopes':[{'classId':'X','sections':['A'],'subjectScope':'ai'},{'classId':'XII','sections':['A'],'subjectScope':'ai'}]}
], 'emails':[{'name':'Synthetic Teacher','email':'teacher@example.org','sourceVerified':False},{'name':'Synthetic PRT','email':'prt@example.org','sourceVerified':True}]}
stream=io.StringIO();writer=csv.writer(stream);writer.writerow(['RecordType','Name','Designation','Role','Purpose','Class','Sections','SubjectScope','Email','SourceVerified'])
for m in pkg['members']:
 for scope in m['scopes']:writer.writerow(['Support',m['name'],m['designation'],m['kind'],m['purpose'],scope['classId'],';'.join(scope['sections']),scope['subjectScope'],'',''])
writer.writerow(['Teaching','Synthetic Teacher','','one','English','X','A','source_roster','',''])
for r in pkg['emails']:writer.writerow(['Email',r['name'],'','','','','','',r['email'],'Verified' if r['sourceVerified'] else 'Not Verified'])
with ns['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.route('https://www.gstatic.com/firebasejs/**',ns['sdk']);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-tools').wait_for(state='visible')
 page.locator('#mission-vc-file').set_input_files({'name':'setup.csv','mimeType':'text/csv','buffer':stream.getvalue().encode()});page.get_by_role('heading',name='Review VC setup',exact=True).wait_for();assert page.evaluate('window.__teacherMission') is None
 page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden');before=page.evaluate('window.__teacherMission');assert len(before['staff'])==4;assert before['staffEmails']['X:one']['email']=='teacher@example.org'
 page.locator('#mission-tools').evaluate('(node)=>node.open=true');page.locator('#manage-support').click();page.get_by_role('heading',name='Support team / co-opted members',exact=True).wait_for();assert '4 active support members' in page.locator('#mission-view').inner_text();prt_row=page.get_by_role('row').filter(has=page.get_by_role('cell',name='Synthetic PRT',exact=True));assert prt_row.get_by_role('cell',name='PRT (Co-opted)',exact=True).is_visible();assert prt_row.get_by_role('cell',name='X-A',exact=True).is_visible();
 page.evaluate("location.hash='class=X&section=a'");page.get_by_role('heading',name='Student support team',exact=True).wait_for();assert 'MCQs & writing practice implementation' in page.locator('.vc-support-team').inner_text()
 page.evaluate("location.hash='student=X%3Aa%3Aone'");page.get_by_role('heading',name='Student support team',exact=True).wait_for();assert page.locator('.section-team .section-support-member').count()==4;assert 'Synthetic PRT' in page.locator('#student-academic-section .subject-support-line').first.inner_text();ai_rows=page.locator('#student-academic-section tr').filter(has=page.get_by_role('cell',name='Artificial Intelligence',exact=True));assert ai_rows.count()>0;assert all('Synthetic PRT' not in row.inner_text() and 'Synthetic AI Instructor' in row.inner_text() for row in ai_rows.all());page.locator('.section-team').get_by_role('button',name='Synthetic PRT',exact=True).click();page.get_by_role('heading',name='Assigned support duties',exact=True).wait_for();page.get_by_role('button',name='Total students: 1 out of 1 students',exact=True).wait_for();assert 'MCQs & writing practice implementation' in page.locator('.vc-support-duties').inner_text()
 page.evaluate("location.hash='tab=teachers'");page.get_by_role('button',name='Teacher profile: Synthetic PRT',exact=True).wait_for();page.get_by_role('button',name='Teacher profile: Synthetic Special Educator',exact=True).wait_for()
 page.locator('#mission-vc-file').set_input_files({'name':'class.csv','mimeType':'text/csv','buffer':b'Class,Section,MeetingLink\nX,A,https://meet.google.com/abc-defg-hij'});page.get_by_role('heading',name='Review VC setup',exact=True).wait_for();assert not page.evaluate('window.__teacherMission.classMeetings||null');page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden')
 page.evaluate("location.hash='class=X&section=a'");page.get_by_role('link',name='Class VC',exact=True).wait_for();assert page.get_by_role('link',name='Class VC',exact=True).get_attribute('href')=='https://meet.google.com/abc-defg-hij'
 page.evaluate("location.hash='student=X%3Aa%3Aone'");page.get_by_role('link',name='Class VC',exact=True).wait_for();page.get_by_role('button',name='Set meeting link',exact=True).click();page.locator('[name=meetingLink]').fill('https://meet.google.com/klm-nopq-rst');page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden');page.get_by_role('link',name='Online home visit / One to one VC',exact=True).wait_for()
 page.locator('#mission-tools').evaluate('(node)=>node.open=true');page.locator('#mission-export-vc').click();page.get_by_role('heading',name='Review Calendar VC update',exact=True).wait_for()
 with page.expect_download() as d:page.locator('#mission-save').click()
 download=d.value;assert download.suggested_filename=='School_VC_Calendar_Update.txt';text=Path(download.path()).read_text();assert 'teacher@example.org' in text;assert 'vcApplyNextBatch' in text;assert 'sendUpdates' in text
 for width in [360,768,1440]:page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print('PASS reviewed support/email setup, duties in all three profiles, scoped teacher students, Class VC import, individual title, private Calendar export and mobile layout')
 b.close()
