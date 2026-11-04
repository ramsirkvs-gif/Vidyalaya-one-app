"""Large multi-topic QPs, session recovery, measured A4/PDF, section scope and multi-block scans."""
from pathlib import Path
import csv,io
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
text=io.StringIO();writer=csv.writer(text);writer.writerow(['Subject','Topic','Question','CorrectAnswer'])
for i in range(53):writer.writerow(['English','Grammar' if i%2==0 else 'Poetry',('Long question: '+'explanation with √2 and 3/5. '*190 if i==0 else 'Question '+str(i+1))+'\nA) First\nB) Second\nC) Third\nD) Fourth','B'])
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1100});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/staff-access',lambda route:mcq_api(page,route));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=paper');page.get_by_text('0 questions · page 1',exact=True).wait_for()
 root['mcq']=page.evaluate("""async args=>{const {importMCQCSV}=await import('./cbse-mcq-model.js');return importMCQCSV({},{subjectId:'english',verified:true,requestId:'a4_large_questions',csvText:args[0]},{id:'X:one',name:'Teacher'},args[1],1).next;}""",[text.getvalue(),D])
 photo=page.evaluate("""()=>{const c=document.createElement('canvas');c.width=800;c.height=1000;const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,800,1000);g.fillStyle='black';g.font='32px Arial';g.fillText('Synthetic diagram x² + √2',30,100);return c.toDataURL('image/png');}""")
 root['mcq']['questions']['QE002']['images']=[photo,photo,photo]
 page.locator('[name=mcq-subject]').select_option('english');page.locator('[name=mcq-filter-topic]').select_option('Grammar')
 for topic in ['Grammar','Poetry']:
  page.locator('[name=mcq-filter-topic]').select_option(topic)
  page.locator('.mcq-bank-card').first.wait_for()
  while True:
   for checkbox in page.locator('.mcq-bank-card input[type=checkbox]').all():checkbox.check()
   next=page.get_by_role('button',name='Next',exact=True)
   if not next.count():break
   old=page.locator('.mcq-bank-card').first.get_attribute('data-question-id');next.click();page.wait_for_function('(id)=>!!document.querySelector(".mcq-bank-card")&&document.querySelector(".mcq-bank-card").dataset.questionId!==id',arg=old)
 print('selected',page.locator('.mcq-selection-belt').inner_text(),flush=True)
 page.get_by_role('status').filter(has_text='Total: 53 selected').wait_for();assert 'Grammar27 questions' in page.locator('.mcq-topic-count').all_text_contents();assert 'Poetry26 questions' in page.locator('.mcq-topic-count').all_text_contents()
 page.locator('[name=mcq-save-scope]').select_option('section');page.locator('[name=mcq-save-section]').select_option('a');page.locator('.mcq-page-setup').locator('summary').click();page.locator('[name=mcq-page-columns]').select_option('2');page.locator('[name=mcq-page-target]').select_option('1.25');page.get_by_role('button',name='Update A4 preview',exact=True).click();page.locator('.mcq-layout-status').filter(has_text='A4 usage').wait_for();print('layout',page.locator('.mcq-layout-status').inner_text(),flush=True);assert 'minimum font/image' in page.locator('.mcq-layout-status').inner_text();assert page.locator('.mcq-a4-preview iframe').count()==1
 # Restore the selection and settings after a reload to the launch page.
 page.locator('[name=mcq-page-target]').select_option('0');page.reload();page.get_by_role('heading',name='Overview',exact=True).wait_for();page.evaluate("location.hash='tab=mcq&mcqClass=X&mcq=paper'");page.locator('[name=mcq-subject]').select_option('english');page.get_by_role('status').filter(has_text='Total: 53 selected').wait_for();assert page.locator('[name=mcq-page-columns]').input_value()=='2';assert page.locator('[name=mcq-save-scope]').input_value()=='section';assert all(page.locator('.mcq-bank-card input[type=checkbox]').evaluate_all('(nodes)=>nodes.map(n=>n.checked)'))
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('.mcq-page-setup').locator('summary').click();page.get_by_role('button',name='Update A4 preview',exact=True).click();page.locator('.mcq-a4-preview iframe').wait_for();page.locator('.mcq-page-setup').screenshot(path='/tmp/mcq-a4-settings.png')
 auth=page.locator('.mcq-paper-form');auth.locator('[name=mcq-staff]').select_option('X:one');auth.locator('[name=mcq-pin]').fill('123');auth.get_by_role('button',name='Generate paper',exact=True).click();page.get_by_text('Created QPE001 · 53 questions',exact=True).wait_for();paper=root['mcq']['papers']['QPE001'];assert paper['count']==53 and paper['targetSections']==['a']
 result=page.evaluate("""async paper=>{const {buildMCQPaperFrame,showMCQPaperFrame}=await import('./cbse-mcq-page-render.js');const r=await buildMCQPaperFrame(paper,paper.pageSettings);window.__a4=r;const host=document.createElement('div');host.id='a4-check';document.body.append(host);showMCQPaperFrame(host,r);await r.frame.contentDocument.fonts.ready;const d=r.frame.contentDocument,overflow=[...d.querySelectorAll('.paper-sheet')].map(sheet=>{const content=sheet.querySelector('.paper-content');return content.getBoundingClientRect().bottom>sheet.getBoundingClientRect().bottom-r.settings.margin*96/25.4+1;});return {sheets:r.sheetCount,usage:r.usedPages,overflow,html:d.documentElement.outerHTML,text:d.body.textContent,blocks:d.querySelectorAll('.response-area').length};}""",paper)
 print('render result',{k:v for k,v in result.items() if k not in ['html','text']},paper['pageSettings'],flush=True)
 assert result['sheets']>=2 and not any(result['overflow']),result
 assert result['blocks']==3;assert 'Q.41–53' in result['text'];assert 'Question 53' in result['text'];assert 'Correct answer' not in result['text']
 pdf=ctx.new_page();pdf.goto('http://127.0.0.1:8000/cbse-mcq-page-settings.js');pdf.set_content(result['html']);pdf.evaluate('document.fonts.ready');pdf.pdf(path='/tmp/MCQ_53_questions_A4.pdf',prefer_css_page_size=True,print_background=True);pdf.close()
 print('large PDF',result['sheets'],result['usage'],flush=True)
 page.evaluate("document.getElementById('a4-check').remove()")
 page.get_by_role('button',name='Ready-made QPs',exact=True).click();library=page.locator('.mcq-ready-papers');library.locator('[data-paper-id=QPE001]').wait_for();assert 'Section A' in library.locator('[data-paper-id=QPE001]').inner_text();library.locator('[name=mcq-paper-section-filter]').select_option('b');library.locator('[data-paper-id=QPE001]').wait_for(state='detached')
 page.locator('[name=mcq-save-scope]').select_option('all');auth.locator('[name=mcq-pin]').fill('123');auth.get_by_role('button',name='Generate paper',exact=True).click();page.get_by_text('Created QPE002 · 53 questions',exact=True).wait_for();assert not root['mcq']['papers']['QPE002']['targetSections'];library.locator('[data-paper-id=QPE002]').wait_for()
 page.get_by_role('button',name='Evaluate this test',exact=True).last.click();evaluation=page.locator('.mcq-evaluation-form');evaluation.wait_for();assert evaluation.locator('[name=mcq-response-block] option').count()==3
 def photo(offset,count,answer):
  return page.evaluate("""async args=>{const {answerStripSVG}=await import('./cbse-mcq-print.js'),{bubblePoint,loadMCQScript}=await import('./cbse-mcq-scan.js');await loadMCQScript('qrcode.js');const [offset,count,answer]=args,svg=answerStripSVG(count,offset,true),img=new Image();img.src='data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg));await img.decode();const c=document.createElement('canvas');c.width=1400;c.height=900;const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,1400,900);g.drawImage(img,40,400,1000,420);g.fillStyle='black';for(let i=0;i<count;i++){const p=bubblePoint(i,answer);g.beginPath();g.arc(40+p.x,400+p.y,9,0,Math.PI*2);g.fill();}const qr=qrcode(0,'M');qr.addData('VOA|MCQ|QPE002|OMR|'+offset);qr.make();const qi=new Image();qi.src='data:image/svg+xml;base64,'+btoa(qr.createSvgTag({cellSize:3,margin:12}));await qi.decode();g.drawImage(qi,1100,20,240,240);return c.toDataURL('image/jpeg',.95).split(',')[1];}""",[offset,count,answer])
 for offset,count,answer in [(40,13,1),(0,20,0),(20,20,2)]:
  encoded=photo(offset,count,answer);page.locator('[name=mcq-evaluation-upload]').set_input_files({'name':'answer-block.jpg','mimeType':'image/jpeg','buffer':base64.b64decode(encoded)});page.get_by_role('status').filter(has_text='Q.'+str(offset+1)+'–'+str(offset+count)+' answers read').wait_for();assert evaluation.locator('[name=mcq-response-'+str(offset)+']').input_value()=='ABC'[answer]
 assert evaluation.locator('[name=mcq-response-40]').input_value()=='B';assert evaluation.locator('[name=mcq-response-0]').input_value()=='A';assert evaluation.locator('[name=mcq-response-20]').input_value()=='C'
 evaluation.locator('[name=mcq-staff]').select_option('X:one');evaluation.locator('[name=mcq-student]').select_option('X:a:one');evaluation.locator('[name=mcq-responses-reviewed]').check();evaluation.locator('[name=mcq-pin]').fill('123');evaluation.get_by_role('button',name='Save score with PIN',exact=True).click();evaluation.get_by_text('Saved 13 / 53',exact=False).wait_for();assert root['mission']['marks']['QPE002_X_a_one']['maximum']==53;assert len(root['mcq']['evaluations']['QPE002_X_a_one']['responses'])==53
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.get_by_role('button',name='Lock staff view',exact=True).click();page.wait_for_function('!Object.keys(sessionStorage).some(k=>k.startsWith("mission-mcq-selection:"))')
 assert not errors,errors;b.close()
print('PASS 53 mixed-topic selections, reload recovery, adjustable measured PDF, section/all saving, ready QPs and multi-block QR scan')
