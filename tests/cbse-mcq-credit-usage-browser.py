"""Question attribution, saved QP preparer, live attendance groups and profile badge."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
old=json.dumps(D)
D['classes']['X']['sections']['b']['students']['two']['subjects']['english']=True
D['classes']['X']['sections']['b']['subjects']['english']={'name':'English','code':'184'}
fx['DB']=fx['DB'].replace(old,json.dumps(D))
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1280,'height':1000});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/staff-access',lambda route:mcq_api(page,route));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=bank')
 page.get_by_text('0 questions · page 1',exact=True).wait_for()
 root['mcq']=page.evaluate("""async draft=>{const {contributeMCQ,changeMCQQuestion,createMCQPaper}=await import('./cbse-mcq-model.js');let bank=contributeMCQ({},{subjectId:'english',topic:'Grammar',single:true,verified:true,requestId:'credit_original',questions:[{verbatim:true,stem:'Question A) 1 B) 2 C) 3 D) 4',answer:'A'}]},{id:'X:one',name:'Original contributor'},draft,1).next;bank=changeMCQQuestion(bank,{operation:'mcq-question-edit',questionId:'QE001',expectedRevision:0,requestId:'credit_correction',topic:'Grammar',question:{verbatim:true,stem:'Corrected question A) 1 B) 2 C) 3 D) 4',answer:'B'}},{id:'X:two',name:'Latest editor'},2).next;for(let i=0;i<2;i++)bank=createMCQPaper(bank,{requestId:'credit_paper_'+i,questionIds:['QE001']},{id:'X:one',name:'Paper preparer'},3+i).next;return bank;}""",D)
 for id in ['QPE001','QPE002']:
  root['mission'].setdefault('exams',{})['mcq_'+id]={'name':'MCQ '+id,'date':'2026-11-03','classId':'X','source':'mcq-mahaabhiyan'}
  root['mission'].setdefault('marks',{})[id+'_X_a_one']={'studentKey':'X:a:one','examId':'mcq_'+id,'subjectId':'english','score':1,'maximum':1,'absent':False,'source':'mcq-mahaabhiyan','paperId':id,'evaluatedBy':'X:one','evaluatedByName':'Original evaluator','updatedAt':100}
 page.reload();page.get_by_role('heading',name='Overview',exact=True).wait_for();page.evaluate("location.hash='tab=mcq&mcqClass=X&mcq=bank'");card=page.locator('[data-question-id=QE001]');card.wait_for()
 assert 'Contributor: Original contributor · Latest editor: Latest editor' in card.inner_text()
 page.get_by_role('button',name='Ready-made QPs · subject-wise',exact=True).click();library=page.locator('.mcq-ready-papers');assert 'Paper preparer' in library.locator('[data-paper-id=QPE001]').inner_text();library.locator('[data-paper-id=QPE001]').get_by_role('button',name='Open soft copy',exact=True).click();preview=page.locator('.mcq-library-preview');preview.get_by_text('Prepared by Paper preparer',exact=False).wait_for();preview.get_by_role('button',name='Use this paper for evaluation',exact=True).click()
 usage=page.locator('.mcq-paper-usage');usage.wait_for();assert '1 student attended' in usage.inner_text();assert 'Used by Class X-A' in usage.inner_text();assert 'MCQ attended: 2' in usage.inner_text();assert page.locator('.mcq-paper-credit').inner_text()=='Prepared by Paper preparer'
 form=page.locator('.mcq-evaluation-form');form.locator('[name=mcq-staff]').select_option('X:one');form.locator('[name=mcq-section]').select_option('b');form.locator('[name=mcq-student]').select_option('X:b:two');form.locator('[name=mcq-response-0]').select_option('B');form.locator('[name=mcq-responses-reviewed]').check();form.locator('[name=mcq-pin]').fill('123');form.get_by_role('button',name='Save score with PIN',exact=True).click();form.get_by_role('status').filter(has_text='Saved 1 / 1').wait_for();assert '2 students attended' in usage.inner_text();assert 'Used by Class X-B' in usage.inner_text();assert 'Synthetic Teacher' in usage.inner_text()
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 usage.screenshot(path='/tmp/mcq-evaluation-usage.png')
 usage.locator('a[href="#student=X%3Aa%3Aone"]').click();badge=page.locator('.mcq-profile-participation');badge.wait_for();assert badge.locator('summary').inner_text()=='MCQ tests attended · 2';badge.locator('summary').click();assert 'QPE001' in badge.inner_text() and 'QPE002' in badge.inner_text()
 assert not errors,errors;b.close()
print('PASS contributor/editor credit, QP preparer, class usage, live attendance, student profile badge and responsive layout')
