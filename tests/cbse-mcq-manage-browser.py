"""PIN correction and deletion of any question, legacy/images, frozen papers."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1280,'height':1000});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/staff-access',lambda route:mcq_api(page,route));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=bank')
 original='Original question\nA) 1 B) 2 C) 3 D) 4'
 r=page.evaluate("""async args=>{const {contributeMCQ,createMCQPaper}=await import('./cbse-mcq-model.js');const made=contributeMCQ({},args[0],{id:'X:one',name:'Original teacher'},args[1],1);return createMCQPaper(made.next,{requestId:'original_paper',questionIds:made.questionIds},{id:'X:one',name:'Original teacher'},2);}""",[{'subjectId':'english','topic':'Mixed','single':True,'verified':True,'requestId':'original_question','questions':[{'verbatim':True,'stem':original,'answer':'A'}]},D]);root['mcq']=r['next']
 page.get_by_role('button',name='Refresh bank',exact=True).click();card=page.locator('[data-question-id=QE001]');card.wait_for();card.get_by_role('button',name='Edit',exact=True).click()
 dialog=page.get_by_role('dialog');form=dialog.locator('.mcq-single-form');assert form.locator('[name=mcq-notepad]').input_value()==original;assert form.locator('[name=mcq-correct]').input_value()==''
 form.locator('[name=mcq-staff]').select_option('X:two');form.locator('[name=mcq-notepad]').fill('Corrected question\nA) 1 B) 2 C) 3 D) 4');form.locator('[name=mcq-correct]').select_option('B')
 form.locator('[name=mcq-pin]').fill('000');form.get_by_role('button',name='Save correction with PIN',exact=True).click();form.get_by_role('alert').wait_for();assert root['mcq']['questions']['QE001']['answer']=='A'
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert dialog.evaluate('(d)=>d.scrollWidth<=d.clientWidth')
 dialog.screenshot(path='/tmp/mcq-edit-question.png')
 form.locator('[name=mcq-pin]').fill('456');form.get_by_role('button',name='Save correction with PIN',exact=True).click();dialog.wait_for(state='detached');card.get_by_text('Corrected question',exact=False).wait_for();assert root['mcq']['questions']['QE001']['updatedBy']=='X:two';assert root['mcq']['papers']['QPE001']['questions'][0]['answer']=='A'
 card.get_by_role('button',name='Delete',exact=True).click();dialog=page.get_by_role('dialog');form=dialog.locator('.mcq-delete-form');form.locator('[name=mcq-staff]').select_option('X:two');form.locator('[name=mcq-pin]').fill('000');form.get_by_role('button',name='Delete question with PIN',exact=True).click();form.get_by_role('alert').wait_for();assert not root['mcq']['questions']['QE001'].get('deleted')
 form.locator('[name=mcq-pin]').fill('456');form.get_by_role('button',name='Delete question with PIN',exact=True).click();dialog.wait_for(state='detached');card.wait_for(state='detached');assert root['mcq']['questions']['QE001']['deleted'];assert root['mcq']['papers']['QPE001']['questions'][0]['stem']==original
 assert not errors,errors
 # Principal corrects a legacy structured question without PIN, preserving text/options/images.
 root['mcq']['questions']['QE002']={**root['mcq']['questions']['QE001'],'id':'QE002','deleted':False,'editRevision':0,'verbatim':False,'imageOnly':False,'stem':'Legacy question','options':['One','Two','Three','Four'],'images':[],'image':'','answer':'D'}
 admin=b.new_context();admin.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);pp=admin.new_page();pp.route('**/api/staff-access',lambda route:mcq_api(pp,route));pp.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=bank');pp.locator('[data-question-id=QE002]').get_by_role('button',name='Edit',exact=True).click();pf=pp.get_by_role('dialog').locator('.mcq-single-form');assert pf.locator('[name=mcq-pin]').count()==0;assert 'D) Four' in pf.locator('[name=mcq-notepad]').input_value();pf.locator('[name=mcq-correct]').select_option('D');pf.get_by_role('button',name='Save correction',exact=True).click();pp.get_by_role('dialog').wait_for(state='detached');assert root['mcq']['questions']['QE002']['updatedBy']=='principal'
 b.close()
print('PASS any-member correction/delete, wrong PIN, frozen papers, legacy conversion, Principal and responsive editor')
