from pathlib import Path
from datetime import datetime,timezone
exec(Path('tests/cbse-remedial-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
old_draft=json.dumps(D);old_faculty=json.dumps(F)
for sid in ['a','b']:
 D['classes']['X']['sections'][sid]['subjects']={'basic':{'name':'MATHS BASIC'},'standard':{'name':'MATHS STANDARD'}}
 D['classes']['X']['sections'][sid]['students']={'basic':{'name':'Synthetic Basic Learner','roll':'1','subjects':{'basic':True}},'standard':{'name':'Synthetic Standard Learner','roll':'2','subjects':{'standard':True}}}
F['classes']['X']['teachers']['one'].update({'subjects':'Maths','teachingSections':'A, B'})
fx['DB']=fx['DB'].replace(old_draft,json.dumps(D)).replace(old_faculty,json.dumps(F));root['draft']=D;root['facultyDraft']=F
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844});ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);page=ctx.new_page();page.clock.set_fixed_time(datetime(2026,11,6,tzinfo=timezone.utc));page.route('**/api/staff-access',lambda r:api(page,r));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=remedial');page.locator('[name=remedial-teacher]').select_option('X:one');page.locator('[name=remedial-scope]').select_option('both:X|a|basic');assert page.locator('[name=remedial-student]:checked').count()==2
 for key in ['X|b|basic','X|b|standard']:page.locator('[name=remedial-section][value="'+key+'"]').check()
 assert page.locator('[name=remedial-student]:checked').count()==4;page.locator('[name=remedial-purpose]').fill('Combined maths practice');page.get_by_role('button',name='Save plan',exact=True).click();page.get_by_role('status').filter(has_text='Plan saved').wait_for();plan=next(iter(root['mission']['remedialPlans'].values()));assert plan['subjectName']=='Maths Basic + Standard';assert len(plan['studentKeys'])==4;assert page.get_by_role('button',name='Take attendance & record class',exact=True).is_visible();b.close()
print('PASS explicit Both option combines Maths Basic/Standard and assigned sections with direct attendance action')
