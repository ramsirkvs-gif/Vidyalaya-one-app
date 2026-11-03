"""Live total/topic counts survive filtering and remain visible on mobile scroll."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1280,'height':1000});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/staff-access',lambda route:mcq_api(page,route));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=paper')
 root['mcq']=page.evaluate("""async draft=>{const {importMCQCSV}=await import('./cbse-mcq-model.js');return importMCQCSV({},{subjectId:'english',verified:true,requestId:'topic_belt_questions',csvText:'Subject,Topic,Question,CorrectAnswer\\n'+Array.from({length:5},(_,i)=>'English,'+(i<2?'Grammar':'Poetry')+',Question '+i+' A) 1 B) 2 C) 3 D) 4,A').join('\\n')},{id:'X:one',name:'Teacher'},draft,1).next;}""",D)
 page.locator('[name=mcq-subject]').select_option('english');belt=page.locator('.mcq-selection-belt');page.get_by_role('button',name='Refresh bank',exact=True).click();page.locator('[name=mcq-select-QE001]').wait_for();assert 'Total: 0 selected' in belt.inner_text()
 page.locator('[name=mcq-filter-topic]').select_option('Grammar')
 for id in ['QE001','QE002']:page.locator('[name=mcq-select-'+id+']').check()
 assert belt.locator('.mcq-topic-count').all_text_contents()==['Grammar2 questions']
 page.locator('[name=mcq-filter-topic]').select_option('Poetry')
 for id in ['QE003','QE004','QE005']:page.locator('[name=mcq-select-'+id+']').check()
 assert 'Total: 5 selected' in belt.inner_text();assert belt.locator('.mcq-topic-count').all_text_contents()==['Grammar2 questions','Poetry3 questions']
 page.locator('[name=mcq-search]').fill('Question 4');page.locator('[name=mcq-select-QE003]').wait_for(state='detached');assert 'Total: 5 selected' in belt.inner_text()
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});page.locator('.mcq-bank-card').last.scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert belt.bounding_box()['y']>=0;assert belt.bounding_box()['y']<100
 page.screenshot(path='/tmp/mcq-topic-belt.png')
 page.locator('[name=mcq-select-QE005]').uncheck();assert 'Poetry2 questions' in belt.locator('.mcq-topic-count').all_text_contents();assert 'Total: 4 selected' in belt.inner_text()
 page.get_by_role('button',name='Clear selection',exact=True).click();page.get_by_role('status').filter(has_text='Total: 0 selected').wait_for();assert belt.locator('.mcq-topic-count').count()==0
 assert not errors,errors;b.close()
print('PASS sticky selection belt: topic counts, filtering, deselection, clear and responsive scroll')
