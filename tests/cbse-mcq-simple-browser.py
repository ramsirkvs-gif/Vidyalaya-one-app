"""One question per save, multiple images, short IDs, shared papers and evaluation."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
old=json.dumps(D)
for section in D['classes']['X']['sections'].values():
 section.setdefault('subjects',{})['hindi']={'name':'Hindi','code':'002'}
 for student in section.get('students',{}).values():student.setdefault('subjects',{})['hindi']=True
fx['DB']=fx['DB'].replace(old,json.dumps(D))
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1280,'height':1000},permissions=['clipboard-read','clipboard-write'])
 ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/api/staff-access',lambda route:mcq_api(page,route))
 page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=contribute')
 form=page.locator('.mcq-single-form');form.locator('[name=mcq-staff]').select_option('X:one')
 assert form.locator('[name=mcq-subject]').input_value()=='english'
 assert form.locator('[name=mcq-correct]').count()==1
 assert form.locator('[name=mcq-correct] option').all_text_contents()==['Select','A','B','C','D']
 assert form.locator('[name=mcq-count]').count()==0
 assert form.locator('[name=mcq-answer-key]').count()==0
 assert form.get_by_role('button',name='Process & arrange').count()==0
 text='Which is irrational?\nA) √2\nB) 1/2\nC) 3\nD) 4'
 form.locator('[name=mcq-notepad]').fill(text)
 form.locator('[name=mcq-correct]').select_option('A')
 form.locator('[name=mcq-pin]').fill('000')
 form.get_by_role('button',name='Save question with PIN',exact=True).click()
 form.get_by_role('alert').wait_for()
 assert 'PIN does not match' in form.get_by_role('alert').inner_text()
 assert form.locator('[name=mcq-notepad]').input_value()==text
 assert not root['mcq']
 form.locator('[name=mcq-pin]').fill('123')
 form.get_by_role('button',name='Save question with PIN',exact=True).click()
 form.get_by_role('status').filter(has_text='Saved QE001').wait_for()
 assert len(root['mcq']['questions'])==1
 assert root['mcq']['questions']['QE001']['stem']==text
 assert form.locator('[name=mcq-notepad]').input_value()==''
 assert form.locator('[name=mcq-correct]').input_value()==''
 image=page.evaluate("""()=>{const c=document.createElement('canvas');c.width=800;c.height=180;const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,800,180);g.fillStyle='black';g.font='30px Arial';g.fillText('Question part with a fraction and diagram',20,60);g.fillText('A) 1/2 B) 2/3 C) 3/4 D) 4/5',20,120);return c.toDataURL('image/png').split(',')[1]}""")
 photo={'name':'question-part.png','mimeType':'image/png','buffer':base64.b64decode(image)}
 form.locator('[name=mcq-question-images]').set_input_files([photo,{**photo,'name':'question-options.png'}])
 form.locator('.mcq-single-image').nth(1).wait_for()
 form.locator('[name=mcq-correct]').select_option('B')
 form.locator('[name=mcq-pin]').fill('123')
 form.get_by_role('button',name='Save question with PIN',exact=True).click()
 form.get_by_role('status').filter(has_text='Saved QE002').wait_for()
 assert len(root['mcq']['questions'])==2
 assert len(root['mcq']['questions']['QE002']['images'])==2
 assert root['mcq']['questions']['QE002']['imageOnly']
 assert form.locator('.mcq-single-image').count()==0
 page.evaluate("""async data=>{const blob=await (await fetch('data:image/png;base64,'+data)).blob();await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);}""",image)
 form.locator('[name=mcq-notepad]').fill('Question with an attached image')
 form.locator('[name=mcq-notepad]').click();page.keyboard.press('Control+V')
 form.locator('.mcq-single-image').wait_for()
 assert page.get_by_role('dialog').count()==0
 form.locator('[name=mcq-correct]').select_option('C')
 form.locator('[name=mcq-pin]').fill('123')
 form.get_by_role('button',name='Save question with PIN',exact=True).click()
 form.get_by_role('status').filter(has_text='Saved QE003').wait_for()
 assert len(root['mcq']['questions'])==3
 assert len(root['mcq']['questions']['QE003']['images'])==1
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert form.locator('[name=mcq-correct]').is_visible()
 page.set_viewport_size({'width':1280,'height':1000})
 form.screenshot(path='/tmp/mcq-one-question-form.png')
 page.get_by_role('button',name='2 · Create QP',exact=True).click()
 page.get_by_role('heading',name='Prepare a question paper',exact=True).wait_for()
 page.locator('[name=mcq-subject]').select_option('english')
 page.locator('[name=mcq-select-QE001]').check()
 page.locator('[name=mcq-search]').fill('attached')
 page.locator('[name=mcq-select-QE001]').wait_for(state='detached')
 page.locator('[name=mcq-select-QE003]').wait_for()
 assert page.locator('[name=mcq-select-QE001]').count()==0
 page.locator('[name=mcq-select-QE003]').check()
 page.locator('[name=mcq-search]').fill('')
 page.locator('[name=mcq-select-QE002]').wait_for()
 page.locator('[name=mcq-select-QE002]').check()
 assert page.locator('[name=mcq-select-QE001]').is_checked()
 assert page.locator('[name=mcq-select-QE003]').is_checked()
 page.get_by_role('status').filter(has_text='3 selected').wait_for()
 auth=page.locator('.mcq-paper-form')
 auth.locator('[name=mcq-staff]').select_option('X:two')
 auth.locator('[name=mcq-pin]').fill('456')
 auth.get_by_role('button',name='Generate paper',exact=True).click()
 preview=page.locator('.mcq-paper-preview')
 preview.get_by_text('Created QPE001',exact=False).wait_for()
 assert root['mcq']['papers']['QPE001']['count']==3
 assert root['mcq']['papers']['QPE001']['createdBy']=='X:two'
 assert len(root['mcq']['papers']['QPE001']['questions'][2]['images'])==2
 assert preview.locator('.mcq-question').count()==3
 assert preview.locator('.mcq-whole-question').count()==3
 page.evaluate("""()=>{new MutationObserver(items=>{for(const item of items)for(const n of item.addedNodes)if(n.matches?.('.mcq-print-frame'))n.contentWindow.print=()=>window.__simplePrint={text:n.contentDocument.body.textContent,html:n.contentDocument.body.innerHTML};}).observe(document.body,{childList:true});}""")
 preview.get_by_role('button',name='Print A4 / save PDF — no answers',exact=True).click()
 page.wait_for_function('!!window.__simplePrint');printed=page.evaluate('window.__simplePrint')
 assert printed['html'].count('class="mcq-question"')==3
 assert printed['html'].count('<img')==3
 assert 'QPE001' in printed['text']
 assert 'Correct option' not in printed['text']
 assert 'Question with an attached image' in printed['text']
 preview.get_by_role('button',name='Evaluate this test',exact=True).click()
 evaluation=page.locator('.mcq-evaluation-form');evaluation.wait_for()
 evaluation.locator('[name=mcq-section]').select_option('a')
 evaluation.locator('[name=mcq-student]').select_option('X:a:one')
 for i,answer in enumerate(['A','C','B']):evaluation.locator(f'[name=mcq-response-{i}]').select_option(answer)
 evaluation.locator('[name=mcq-responses-reviewed]').check()
 evaluation.locator('[name=mcq-staff]').select_option('X:two')
 evaluation.locator('[name=mcq-pin]').fill('456')
 evaluation.get_by_role('button',name='Save score with PIN',exact=True).click()
 evaluation.get_by_text('Saved 3 / 3',exact=False).wait_for()
 assert root['mission']['marks']['QPE001_X_a_one']['score']==3
 principal=b.new_context(viewport={'width':1280,'height':1000})
 principal.route('https://www.gstatic.com/firebasejs/**',mcq_sdk)
 admin=principal.new_page();admin.on('pageerror',lambda e:errors.append(str(e)))
 admin.route('**/api/staff-access',lambda route:mcq_api(admin,route))
 admin.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=contribute')
 pf=admin.locator('.mcq-single-form')
 assert pf.locator('[name=mcq-pin]').count()==0
 assert pf.locator('[name=mcq-staff]').count()==0
 pf.locator('[name=mcq-subject]').select_option('hindi')
 pf.locator('[name=mcq-topic]').select_option('__new')
 pf.locator('[name=mcq-new-topic]').fill('व्याकरण')
 pf.locator('[name=mcq-notepad]').fill('सही विकल्प चुनिए\nA) पहला B) दूसरा C) तीसरा D) चौथा')
 pf.locator('[name=mcq-correct]').select_option('D')
 pf.get_by_role('button',name='Save question',exact=True).click()
 pf.get_by_role('status').filter(has_text='Saved QH001').wait_for()
 assert root['mcq']['questions']['QH001']['contributorId']=='principal'
 admin.get_by_role('button',name='2 · Create QP',exact=True).click()
 admin.locator('[name=mcq-subject]').select_option('hindi')
 admin.locator('[name=mcq-filter-topic]').select_option('व्याकरण')
 admin.locator('[name=mcq-select-QH001]').check()
 pa=admin.locator('.mcq-paper-form')
 assert pa.locator('[name=mcq-pin]').count()==0
 pa.get_by_role('button',name='Generate paper',exact=True).click()
 admin.get_by_text('Created QPH001',exact=False).wait_for()
 assert root['mcq']['papers']['QPH001']['count']==1
 assert not errors,errors
 print('PASS one text/multi-image question, direct screenshot paste, right-side answer dropdown, PIN errors, short IDs, search selection, answer-free paper, evaluation and Principal automatic identity')
 b.close()
