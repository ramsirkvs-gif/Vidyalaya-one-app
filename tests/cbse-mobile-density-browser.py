"""Compact mobile layouts and teacher profile information order, with synthetic data."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
old=json.dumps(F);F['classes']['X']['teachers']['one']['name']='MR. SYNTHETIC LONG TEACHER NAME';F['classes']['X']['teachers']['one']['email']='synthetic@example.test';fx['DB']=fx['DB'].replace(old,json.dumps(F));root['facultyDraft']=F
root['mission'].setdefault('staffContacts',{})['X:one']={'mobile':'1234567890','whatsapp':'1234567890'}
root['mission'].setdefault('records',{})['mobile_notice']={'kind':'faculty_comment','date':'2026-11-04','studentKey':'','staffId':'X:one','sectionKey':'','subjectId':'','notes':'Please review the latest student progress.','outcome':'','visibility':'general','authorId':'principal','authorName':'Principal','updatedAt':1999999999999}
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':800});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def api(route):
  d=route.request.post_data_json
  if d['action']=='news-read':route.fulfill(json={'posts':[{'id':'news_mobile','text':'Our team completed a student support activity.','authorName':'Synthetic contributor','createdAt':1762200000000,'commentCount':0,'hasPhoto':False}],'total':1,'revision':1,'page':0,'pageSize':5});return
  mcq_api(page,route)
 page.route('**/api/staff-access',api)
 root['mission'].setdefault('staffPhotos',{})['X:one']={'data':page.evaluate("""()=>{const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');g.fillStyle='#226ca5';g.fillRect(0,0,96,96);g.fillStyle='white';g.font='bold 55px Arial';g.fillText('T',30,70);return c.toDataURL('image/png');}""")}
 page.goto('http://127.0.0.1:8000/cbse-mission.html#staff=X%3Aone');page.locator('.teacher-news-strip').get_by_text('Synthetic contributor',exact=False).wait_for();page.locator('#teacher-profile-overview .faculty-portrait').wait_for()
 ordered=['teacher-profile-overview','teacher-notifications','teacher-roles-responsibilities','teacher-academic-progress','teacher-contact-details']
 assert page.evaluate('(ids)=>ids.every((id,i)=>i===0||!!(document.getElementById(ids[i-1]).compareDocumentPosition(document.getElementById(id))&Node.DOCUMENT_POSITION_FOLLOWING))',ordered)
 assert 'synthetic@example.test' not in page.locator('#teacher-profile-overview').inner_text();assert 'synthetic@example.test' in page.locator('#teacher-contact-details').text_content();assert page.locator('#teacher-profile-overview .staff-contact-actions').count()==0;assert page.locator('#teacher-notifications .profile-notification-strip').count()==2;assert page.locator('#teacher-roles-responsibilities').get_by_role('heading',name='Roles & responsibilities',exact=True).count()==1
 for width in [320,360,390,430,768]:
  page.set_viewport_size({'width':width,'height':800});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#teacher-profile-overview h2').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')<=20 if width<=700 else True
 page.set_viewport_size({'width':390,'height':800});page.screenshot(path='/tmp/teacher-mobile-priority.png',full_page=True);page.locator('#teacher-contact-details > summary').click();assert page.get_by_role('link',name='Call teacher',exact=True).is_visible()
 page.goto('http://127.0.0.1:8000/cbse-mission.html?compact=1#tab=mcq');entry=page.locator('.mcq-entry-form');entry.wait_for()
 for width in [320,360,390,430]:
  page.set_viewport_size({'width':width,'height':800});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');ys=entry.locator('.mcq-start-choices button').evaluate_all('(nodes)=>nodes.map(n=>Math.round(n.getBoundingClientRect().top))');assert len(set(ys))==2;assert entry.bounding_box()['height']<350;assert entry.locator('[name=mcq-entry-class]').bounding_box()['y']==entry.locator('[name=mcq-entry-subject]').bounding_box()['y']
 entry.locator('[name=mcq-entry-class]').select_option('X');entry.locator('[name=mcq-entry-subject]').select_option('english');page.screenshot(path='/tmp/mcq-mobile-compact-start.png',full_page=True);entry.get_by_role('button',name='1 · See question bank',exact=True).click();page.locator('.mcq-inline-contribution > summary').click();form=page.locator('.mcq-single-form');form.locator('[name=mcq-staff]').select_option('X:one')
 for width in [320,360,390,430]:
  page.set_viewport_size({'width':width,'height':800});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('.mcq-filters > button').bounding_box()['width']<60;assert form.locator('[name=mcq-staff]').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')<=14
 page.screenshot(path='/tmp/mcq-mobile-compact-bank.png',full_page=True)
 page.goto('http://127.0.0.1:8000/cbse-mission.html?news=1#tab=news');page.get_by_role('heading',name='Team contribution at a glance',exact=True).wait_for();assert not page.locator('.news-create-panel').evaluate('(e)=>e.open');page.locator('.news-create-panel > summary').click();page.locator('[name=news-text]').wait_for()
 for width in [320,390,430]:
  page.set_viewport_size({'width':width,'height':800});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 for path in ['index.html','cbse-admin.html','cbse-faculty.html','cbse-settings.html','cbse-students.html']:
  page.goto('http://127.0.0.1:8000/'+path);assert page.locator('link[href*="cbse-mobile.css"]').count()==1
  for width in [320,390]:
   page.set_viewport_size({'width':width,'height':800});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),path
 assert not errors,errors;b.close()
print('PASS compact MCQ two-column start and filters/name fields, teacher profile/notifications/roles/academics/contact order, News composer and 320–768px layout')
