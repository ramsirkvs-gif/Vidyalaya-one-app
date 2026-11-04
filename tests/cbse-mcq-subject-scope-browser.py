"""All four workflows remain in the selected subject for X and XII."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
old=json.dumps(D)
for cl in ['X','XII']:
 D['classes'][cl]['sections']['a']['subjects'].update({'english':{'name':'English','code':'184'},'hindi':{'name':'Hindi','code':'002'}})
 D['classes'][cl]['sections']['a']['students']['one']['subjects']={'english':True,'hindi':True}
fx['DB']=fx['DB'].replace(old,json.dumps(D));root['draft']=D
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1280,'height':1000});ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def api(route):
  try:mcq_api(page,route)
  except Exception as e:route.fulfill(status=400,json={'error':str(e)})
 page.route('**/api/staff-access',api);page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq');page.locator('.mcq-entry-form').wait_for()
 seeded=page.evaluate("""async draft=>{const {contributeMCQ,createMCQPaper}=await import('./cbse-mcq-model.js');let bank={};const ids={};for(const cl of ['X','XII'])for(const subject of ['english','hindi']){const a=contributeMCQ(bank,{classId:cl,subjectId:subject,single:true,verified:true,topic:'Mixed',requestId:'scope_question_'+cl+'_'+subject,questions:[{verbatim:true,stem:cl+' '+subject+' question A) 1 B) 2 C) 3 D) 4',answer:'B'}]},{id:'principal',name:'Principal'},draft,1);const p=createMCQPaper(a.next,{classId:cl,subjectId:subject,requestId:'scope_paper_'+cl+'_'+subject,questionIds:a.questionIds},{id:'principal',name:'Principal'},2,draft);bank=p.next;ids[cl+':'+subject]=p.paperId;}return {bank,ids};}""",D);root['mcq']=seeded['bank'];ids=seeded['ids'];entry=page.locator('.mcq-entry-form')
 for cl in ['X','XII']:
  entry.locator('[name=mcq-entry-class]').select_option(cl);entry.locator('[name=mcq-entry-subject]').select_option('english');entry.get_by_role('button',name='1 · See question bank',exact=True).click();page.locator('.mcq-bank-card').wait_for();assert page.locator('.mcq-bank-card').count()==1;assert cl+' english question' in page.locator('.mcq-bank-card').inner_text();page.locator('.mcq-inline-contribution > summary').click();assert page.locator('.mcq-single-form [name=mcq-subject]').input_value()=='english';assert page.locator('.mcq-single-form [name=mcq-subject]').is_disabled();page.get_by_role('button',name='← Back',exact=True).click()
  entry.get_by_role('button',name='2 · Select questions & make question paper',exact=True).click();page.locator('.mcq-bank-card').wait_for();assert page.locator('.mcq-bank-card').count()==1;assert cl+' english question' in page.locator('.mcq-bank-card').inner_text();page.get_by_role('button',name='← Back',exact=True).click()
  entry.get_by_role('button',name='4 · Ready-made question papers',exact=True).click();row=page.locator('.mcq-ready-papers [data-paper-id]');row.wait_for();assert row.count()==1;assert row.get_attribute('data-paper-id')==ids[cl+':english'];page.get_by_role('button',name='← Back',exact=True).click()
  entry.get_by_role('button',name='3 · Evaluation',exact=True).click();code=page.locator('[name=mcq-test-id]');code.fill(ids[cl+':hindi']);page.get_by_role('button',name='Load paper',exact=True).click();page.get_by_role('alert').filter(has_text='different subject').wait_for();assert page.locator('.mcq-evaluation-form').count()==0;code.fill(ids[cl+':english']);page.get_by_role('button',name='Load paper',exact=True).click();form=page.locator('.mcq-evaluation-form');form.wait_for();form.locator('[name=mcq-section]').select_option('a');form.locator('[name=mcq-student]').select_option(cl+':a:one');assert page.get_by_role('button',name='Scan answer area',exact=True).is_enabled();assert page.locator('script[src*="jsQR"]').count()==0;page.get_by_role('button',name='← Back',exact=True).click()
 assert not errors,errors;b.close()
print('PASS X/XII subject lock in all four areas, fixed contribution subject, subject-wise store, wrong-subject QP rejection and section/student-before-scan order')
