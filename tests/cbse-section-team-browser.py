"""CT/Co-CT context in the home, class, section, student and academic views."""
from pathlib import Path
ns={};exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
F=ns['F'];F['classes']['X']['teachers']['co']={'name':'Synthetic Co Teacher','designation':'TGT','subjects':'Maths','teachingSections':'A','status':'active'};F['classes']['X']['roles']['a']['coClassTeacher']='co'
DB=ns['DB'];start=DB.index('faculty=');end=DB.index(';let mission');DB=DB[:start]+'faculty='+ns['json'].dumps(F)+DB[end:]
def sdk(route):
 u=route.request.url;route.fulfill(content_type='application/javascript',body=ns['APP'] if u.endswith('firebase-app.js') else ns['AUTH'] if u.endswith('firebase-auth.js') else DB)
with ns['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.route('https://www.gstatic.com/firebasejs/**',sdk)
 page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-tools').wait_for(state='visible');assert 'Synthetic Co Teacher' in page.locator('.section-team-grid').inner_text()
 page.evaluate("location.hash='class=X'");page.locator('.zone-team').wait_for();assert 'Synthetic Co Teacher' in page.locator('.zone-team').inner_text()
 page.evaluate("location.hash='class=X&section=a'");page.get_by_role('heading',name='Class X · Section A',exact=True).wait_for();assert 'Synthetic Co Teacher' in page.locator('.section-team').first.inner_text()
 page.evaluate("location.hash='student=X%3Aa%3Aone'");page.get_by_role('heading',name='Synthetic Student X',exact=True).wait_for();assert 'Prime mentor of class (CT)' in page.locator('.section-team').first.inner_text();assert 'Synthetic Co Teacher' in page.locator('.section-team').first.inner_text()
 for width in [360,768,1440]:page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('.section-team').first.get_by_role('button',name='Synthetic Co Teacher',exact=True).click();page.get_by_role('heading',name='Synthetic Co Teacher',exact=True).wait_for()
 guest=b.new_page();guest.add_init_script('window.__guest=true');guest.route('https://www.gstatic.com/firebasejs/**',sdk);guest.goto('http://127.0.0.1:8000/cbse-mission.html');guest.wait_for_timeout(200);assert guest.locator('.section-team').count()==0
 print('PASS CT/Co-CT home/class/section/student displays, teacher profile links, mobile layout and no private public reads')
 b.close()
