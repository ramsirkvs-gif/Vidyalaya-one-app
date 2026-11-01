"""Synthetic private portrait import and profile-only rendering, including staff access."""
from pathlib import Path
import json,csv,io
ns={};exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABQAQMAAACTceEGAAAAA1BMVEVWhXdH3udJAAAAD0lEQVQoz2NgGAWjYPgAAALQAAGOX/gHAAAAAElFTkSuQmCC'
stream=io.StringIO();w=csv.writer(stream);w.writerow(['Class','Section','StudentName','PhotoDataURL','Width','Height']);w.writerow(['X','A','Synthetic Student X',photo,64,80])
with ns['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.route('https://www.gstatic.com/firebasejs/**',ns['sdk']);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-tools').wait_for(state='visible');page.locator('#mission-student-photo-file').set_input_files({'name':'photos.csv','mimeType':'text/csv','buffer':stream.getvalue().encode()});page.get_by_role('heading',name='Review private student photos',exact=True).wait_for();assert page.evaluate('window.__teacherMission') is None
 page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden');saved=page.evaluate('window.__teacherMission');assert saved['studentPhotos']['X:a:one']['dataUrl']==photo
 page.evaluate("location.hash='student=X%3Aa%3Aone'");page.locator('.student-profile-portrait').wait_for();page.wait_for_function("document.querySelector('.student-profile-portrait')?.naturalWidth===64");assert page.locator('.student-profile-heading h2').inner_text()=='Synthetic Student X';assert page.locator('.student-profile-portrait').evaluate('(img)=>img.getBoundingClientRect().width')==80;assert page.locator('#student-remarks-section .student-profile-portrait').count()==0
 for width in [360,768,1440]:page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.evaluate("location.hash='class=X&section=a'");page.get_by_role('heading',name='Class X · Section A',exact=True).wait_for();assert page.locator('.student-profile-portrait').count()==0
 calls=[]
 def api(route):
  d=route.request.post_data_json;calls.append(d);a=d['action']
  if a=='view-data':route.fulfill(json={'draft':ns['D'],'faculty':ns['F'],'mission':{k:v for k,v in saved.items() if k!='studentPhotos'},'pinStaff':[],'versions':[1,1,saved['revision']]});return
  if a=='view-version':route.fulfill(json={'versions':[1,1,saved['revision']]});return
  if a=='view-student-photo':route.fulfill(json={'photo':saved['studentPhotos'].get(d['studentKey'])});return
  route.fulfill(json={'ok':True})
 guest=b.new_page();guest.add_init_script('window.__guest=true');guest.route('https://www.gstatic.com/firebasejs/**',ns['sdk']);guest.route('**/api/staff-access',api);guest.goto('http://127.0.0.1:8000/cbse-mission.html#class=X&section=a');guest.get_by_role('heading',name='Class X · Section A',exact=True).wait_for();assert not any(c['action']=='view-student-photo' for c in calls)
 guest.evaluate("location.hash='student=X%3Aa%3Aone'");guest.locator('.student-profile-portrait').wait_for();assert any(c['action']=='view-student-photo' and c['studentKey']=='X:a:one' for c in calls);assert guest.locator('#student-remarks-section .student-profile-portrait').count()==0
 assert not errors,errors
 print('PASS reviewed private photo CSV, save required, profile-only portrait, no photos in student cards/comments, lazy staff photo request and mobile layout')
 b.close()
