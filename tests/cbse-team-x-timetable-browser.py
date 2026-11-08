"""Team X-only teacher selector with exact weekly periods and mobile day cards."""
from pathlib import Path
exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('\nwith sync_playwright() as p:')[0])
old=json.dumps(F)
F['classes']['X']['teachers']={'pdf_02222829e8b1896e_19':{'name':'MR. BHARAT LAL MEENA','designation':'TGT-Hindi','status':'active','subjects':'Hindi','teachingSections':'A'},'inactive':{'name':'MRS. SWETA KESTWAL','designation':'TGT-English','status':'inactive'}}
F['classes']['XII']['teachers']={'only-xii':{'name':'MRS. JYOTI VERMA','designation':'TGT-Science','status':'active'}}
DB=DB.replace(old,json.dumps(F))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.route('https://www.gstatic.com/firebasejs/**',sdk);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=team-x-timetable');box=page.locator('[data-team-x-timetable]');box.get_by_role('heading',name='Weekly Updated Timetable — Team X',exact=True).wait_for();choice=page.locator('[name=team-x-timetable-teacher]');assert choice.locator('option').count()==2;assert 'JYOTI' not in choice.inner_text();assert 'SWETA' not in choice.inner_text();assert page.locator('.teamx-week-day').count()==0
 choice.select_option('X:pdf_02222829e8b1896e_19');assert page.locator('.teamx-week-day').count()==6;assert page.locator('.teamx-mobile-period').count()==48;assert '33 allocated periods per week' in box.inner_text();assert page.locator('.teamx-week-days .teamx-lesson').count()>0;assert page.locator('a[href="cbse-team-x-weekly/teacher-19.pdf"]').count()==1
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.evaluate("()=>({width:innerWidth,total:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('body *')].filter(n=>getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(n=>({tag:n.tagName,cls:n.className,width:n.getBoundingClientRect().width,right:n.getBoundingClientRect().right}))})");assert page.locator('.teamx-week-days').is_visible()==(width<=760)
 page.set_viewport_size({'width':1440,'height':844});assert page.locator('.teamx-week-table tbody tr').count()==6;assert '08:20–09:00' in page.locator('.teamx-week-table').inner_text();assert not errors,errors;b.close()
print('PASS Team X-only active dropdown, six-day timetable, exact periods, original PDF and responsive mobile/desktop display')
