"""School-only date sheet, explicit standard/subject choice and source references."""
from pathlib import Path
exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('\nwith sync_playwright() as p:')[0])
old=json.dumps(D)
D['classes']['X']['sections']['a']['subjects']['science']={'name':'Science','code':'086'}
D['classes']['XII']['sections']['a']['subjects'].update({'physics':{'name':'Physics','code':'042'},'cs':{'name':'Computer Science','code':'083'},'ip':{'name':'Informatics Practices','code':'065'}})
DB=DB.replace(old,json.dumps(D))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.route('https://www.gstatic.com/firebasejs/**',sdk);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=board-dates&exam=cbse');box=page.locator('[data-board-datesheet]');box.get_by_role('heading',name='CBSE Date Sheet 2027 & Student Attendance').wait_for();assert page.locator('.board-date-card').count()==0
 page.locator('[name=board-standard]').select_option('X');assert page.locator('.board-date-card').count()==2;assert '26 Feb 2027' in box.inner_text();assert '22 Feb 2027' in box.inner_text();assert 'Physics' not in box.inner_text();assert 'English (Language and Literature)' in box.inner_text();assert 'CBSE code: 184' in box.inner_text();assert page.locator('a[href="cbse-board-datesheet-2027.pdf#page=4"]').count()==1
 page.locator('[name=board-standard]').select_option('XII');assert page.locator('.board-date-card').count()==4;assert '16 Feb 2027' in box.inner_text();assert page.locator('[data-exam-date="2027-03-31"]').count()==2;options=page.locator('[name=board-subject] option');page.locator('[name=board-subject]').select_option(options.filter(has_text='Physics').get_attribute('value'));assert page.locator('.board-date-card').count()==1;assert 'Physics' in page.locator('.board-date-card').inner_text();assert '1:30 p.m.' in box.inner_text()
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=board-dates&exam=preboard2');page.get_by_text('Preboard 2 date sheet has not yet been issued by RO.',exact=True).wait_for();assert page.locator('.board-date-card').count()==0;assert not errors,errors;b.close()
print('PASS school-only CBSE dates, X/XII and subject filters, source pages, pending Preboard 2 and responsive widths')
