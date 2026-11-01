"""Synthetic reviewed support/email import, scoped profiles and Class VC links."""
from pathlib import Path
import json,csv,io
ns={};exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
pkg={'format':'mission-vc-support-v1','members':[
 {'name':'Synthetic PRT','designation':'PRT','kind':'prt','purpose':'MCQs & writing practice implementation · all subjects except AI','scopes':[{'classId':'X','sections':['A'],'subjectScope':'non_ai'}]},
 {'name':'Synthetic Special Educator','designation':'Special Educator','kind':'special_educator','purpose':'Fine motor skills support','scopes':[{'classId':'X','sections':['A'],'subjectScope':'all'},{'classId':'XII','sections':['A'],'subjectScope':'all'}]}
], 'emails':[{'name':'Synthetic Teacher','email':'teacher@example.org','sourceVerified':False},{'name':'Synthetic PRT','email':'prt@example.org','sourceVerified':True}]}
stream=io.StringIO();writer=csv.writer(stream);writer.writerow(['RecordType','Name','Designation','Role','Purpose','Class','Sections','SubjectScope','Email','SourceVerified'])
for m in pkg['members']:
 for scope in m['scopes']:writer.writerow(['Support',m['name'],m['designation'],m['kind'],m['purpose'],scope['classId'],';'.join(scope['sections']),scope['subjectScope'],'',''])
for r in pkg['emails']:writer.writerow(['Email',r['name'],'','','','','','',r['email'],'Verified' if r['sourceVerified'] else 'Not Verified'])
with ns['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.route('https://www.gstatic.com/firebasejs/**',ns['sdk']);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-tools').wait_for(state='visible')
 page.locator('#mission-vc-file').set_input_files({'name':'setup.csv','mimeType':'text/csv','buffer':stream.getvalue().encode()});page.get_by_role('heading',name='Review VC setup',exact=True).wait_for();assert page.evaluate('window.__teacherMission') is None
 page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden');before=page.evaluate('window.__teacherMission');assert len(before['staff'])==2;assert before['staffEmails']['X:one']['email']=='teacher@example.org'
 page.evaluate("location.hash='class=X&section=a'");page.get_by_role('heading',name='Student support team',exact=True).wait_for();assert 'MCQs & writing practice implementation' in page.locator('.vc-support-team').inner_text()
 page.evaluate("location.hash='student=X%3Aa%3Aone'");page.get_by_role('heading',name='Student support team',exact=True).wait_for();page.get_by_role('button',name='Synthetic PRT',exact=True).click();page.get_by_role('heading',name='Assigned support duties',exact=True).wait_for();page.get_by_role('button',name='Total students: 1 out of 1 students',exact=True).wait_for();assert 'MCQs & writing practice implementation' in page.locator('.vc-support-duties').inner_text()
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
