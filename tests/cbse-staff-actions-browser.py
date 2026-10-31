"""Verified staff CT/subject remarks, action replies and contact/location updates."""
from pathlib import Path
ns={};exec(Path('tests/cbse-staff-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
json=ns['json'];calls=[];records=[];contact={'gender':'unknown','guardian':'Synthetic Parent','phones':'Father: 1234567890','location':'Synthetic address','numbers':{},'mapLocation':'','revision':0}
def api(route):
 d=route.request.post_data_json;calls.append(d);a=d['action']
 if a=='directory':body={'staff':[{'id':'X:one','name':'Synthetic Teacher','role':'Class X faculty'}]}
 elif a=='login':body={'customToken':'mock-custom-token'}
 elif a=='students':body={'staff':'Synthetic Teacher','students':[{'key':'X:a:one','name':'Synthetic Student','roll':'1','classId':'X','section':'A','assigned':True,'academic':'red'}]}
 elif a=='profile':body={'student':{'key':'X:a:one','name':'Synthetic Student','roll':'1','classId':'X','section':'A'},'progress':None,'contact':contact,'contactRevision':contact['revision'],'roles':{'classTeacher':True,'subjects':[{'id':'english','name':'English'}]},'tasks':[{'id':'one','title':'Family follow-up','due':'2026-11-01','status':'open','outcome':''}],'records':records.copy()}
 elif a=='update-contact':contact.update(d['contact']);contact['revision']+=1;body={'ok':True}
 elif a=='comment':records.append({'id':'r','kind':'faculty_comment','date':'2026-10-31','notes':d['notes'],'authorName':'Synthetic Teacher','authorRole':d['role'],'subjectId':d['subjectId'],'replyTo':d['taskId']});body={'ok':True}
 else:body={'ok':True}
 route.fulfill(json=body)
with ns['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://www.gstatic.com/firebasejs/**',ns['sdk']);page.route('**/api/staff-access',api)
 page.goto('http://127.0.0.1:8000/cbse-staff.html?student=X%3Aa%3Aone');page.wait_for_function('!document.querySelector("#staff-enter").disabled');page.locator('#staff-name').select_option('X:one');page.locator('#staff-pin').fill('123');page.locator('#staff-enter').click();page.get_by_role('heading',name='Synthetic Student',exact=True).wait_for()
 assert page.get_by_role('link',name='Call Father',exact=True).get_attribute('href')=='tel:1234567890'
 page.get_by_text('Update phone numbers / home location',exact=True).click();page.locator('[name=mapLocation]').fill('27.1,93.7');page.get_by_role('button',name='Save contact / location update',exact=True).click();page.wait_for_function("document.querySelector('#staff-message').textContent.includes('saved under')");page.wait_for_function("document.querySelector('[name=mapLocation]').value.includes('google.com')");assert contact['revision']==1;assert 'google.com/maps' in contact['mapLocation']
 page.locator('[name=comment-role]').select_option('subject_teacher:english');page.get_by_label('Reply to assigned action',exact=True).select_option('one');page.get_by_label('Remark type',exact=True).select_option('home_visit');page.locator('[name=progress-comment]').fill('Home visit arranged; English practice discussed');page.get_by_role('button',name='Save progress comment',exact=True).click();page.wait_for_function("document.querySelector('#staff-profile').textContent.includes('Home visit arranged')");comment=next(c for c in reversed(calls) if c['action']=='comment');assert comment['role']=='subject_teacher';assert comment['subjectId']=='english';assert comment['taskId']=='one';assert comment['channel']=='home_visit'
 page.locator('[name=comment-role]').select_option('class_teacher');page.locator('[name=progress-comment]').fill('CT weekly watch updated');page.get_by_role('button',name='Save progress comment',exact=True).click();page.wait_for_function("document.querySelector('#staff-profile').textContent.includes('CT weekly watch updated')")
 for width in [360,768]:page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print('PASS staff dialler link, versioned map update, CT/subject remarks, reply-to-action metadata and mobile layout')
 b.close()
