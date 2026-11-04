"""Section-wise Maths choices recalculate after Principal live updates and staff polling."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
old=json.dumps(D)
a=D['classes']['X']['sections']['a'];a['subjects'].update({'mb':{'name':'Maths Basic','code':'241'},'ms':{'name':'Maths Standard','code':'041'},'mu':{'name':'Maths','code':''}});a['students']={'one':{'name':'Basic learner','roll':'001','subjects':{'english':True,'mb':True}},'two':{'name':'Standard learner','roll':'002','subjects':{'ms':True}},'both':{'name':'Both choices learner','roll':'003','subjects':{'mb':True,'ms':True}},'unset':{'name':'Unspecified maths learner','roll':'004','subjects':{'mu':True}}}
bsec=D['classes']['X']['sections']['b'];bsec['subjects']['ms']={'name':'Maths Standard','code':'041'};bsec['students']={'one':{'name':'B Standard learner','roll':'001','subjects':{'ms':True}}};D['revision']=1;fx['DB']=fx['DB'].replace(old,json.dumps(D));root['draft']=D

def sdk(route):
 u=route.request.url;body=fx['DB']+"\nwindow.__replaceRoster=value=>{for(const key of Object.keys(draft))delete draft[key];Object.assign(draft,value);for(const cb of callbacks['cbse/draft']||[])cb({val:()=>draft});};"
 route.fulfill(content_type='application/javascript',body=fx['ns']['APP'] if u.endswith('firebase-app.js') else fx['ns']['AUTH'] if u.endswith('firebase-auth.js') else body)
def api(page,route):
 d=route.request.post_data_json;versions=[D['revision'],1,root['mission']['revision']]
 if d['action']=='view-version':route.fulfill(json={'versions':versions});return
 if d['action']=='view-data':route.fulfill(json={'draft':D,'faculty':F,'mission':root['mission'],'versions':versions});return
 if d['action']=='news-read':route.fulfill(json={'posts':[],'total':0,'revision':0});return
 mcq_api(page,route)
with fx['ns']['sync_playwright']() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':1280,'height':1000});ctx.route('https://www.gstatic.com/firebasejs/**',sdk);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/staff-access',lambda r:api(page,r));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=subject-students&class=X');summary=page.locator('[data-maths-section-summary]');summary.wait_for();row=summary.locator('[data-maths-section=a]');assert row.locator('td').all_text_contents()==['X-A','2','2','1','1','4'];assert summary.locator('[data-maths-section=b] td').all_text_contents()==['X-B','0','1','0','0','1']
 page.get_by_role('button',name='Class X-A Maths Basic: 2 students',exact=True).click();cards=page.locator('[data-subject-student-list] .student-card');cards.first.wait_for();assert cards.count()==2;assert page.locator('[name=x-maths-section]').input_value()=='a';cards.get_by_text('Basic learner',exact=True).click();page.locator('#student-academic-section').wait_for();page.get_by_role('button',name='Back to X Maths students',exact=True).click();cards.first.wait_for();assert page.locator('[name=x-maths-section]').input_value()=='a';assert cards.count()==2
 # Save a Basic -> Standard change and deliver the actual draft snapshot callback.
 D['classes']['X']['sections']['a']['students']['one']['subjects']={'english':True,'ms':True};D['revision']+=1;page.evaluate('(d)=>window.__replaceRoster(d)',D);page.get_by_role('button',name='Class X-A Maths Basic: 1 student',exact=True).wait_for();assert row.locator('td').all_text_contents()==['X-A','1','3','1','1','4'];assert cards.count()==1;assert 'Basic learner' not in cards.inner_text();page.get_by_role('button',name='Class X-A Maths Standard: 3 students',exact=True).click();cards.nth(2).wait_for();assert cards.count()==3
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 summary.screenshot(path='/tmp/maths-section-status.png')
 # A staff browser detects a later saved draft revision through the existing poll.
 guest=browser.new_context();guest.add_init_script('window.__guest=true');guest.route('https://www.gstatic.com/firebasejs/**',sdk);gp=guest.new_page();gp.clock.install();gp.route('**/api/staff-access',lambda r:api(gp,r));gp.goto('http://127.0.0.1:8000/cbse-mission.html#tab=subject-students&class=X&subject=code%3A241&mathSection=a');gp.get_by_role('button',name='Class X-A Maths Basic: 1 student',exact=True).wait_for();D['classes']['X']['sections']['a']['students']['both']['subjects']={'ms':True};D['revision']+=1;gp.clock.fast_forward(6000);gp.get_by_role('button',name='Class X-A Maths Basic: 0 students',exact=True).wait_for();assert gp.locator('[data-subject-student-list] .student-card').count()==0;assert gp.locator('[data-maths-section=a] td').all_text_contents()==['X-A','0','3','1','0','4']
 assert not errors,errors;browser.close()
print('PASS section Basic/Standard/unset/both totals, section-filtered profiles/back, live edits, staff refresh and responsive layout')
