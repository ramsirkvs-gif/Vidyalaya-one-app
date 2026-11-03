"""CSV review, authenticated import, duplicate skipping and paper selection."""
from pathlib import Path
import csv,io
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
def upload(rows):
 out=io.StringIO();w=csv.writer(out);w.writerow(['Subject','Topic','Question','CorrectAnswer']);w.writerows(rows)
 return {'name':'questions.csv','mimeType':'text/csv','buffer':out.getvalue().encode()}
q1='Which is irrational?\nA) 2\nB) √2\nC) 3\nD) 4'
q2='Choose the phrase, "bright sun".\nA) One\nB) Two\nC) Three\nD) Four'
rows=[['English','Grammar',q1,'B'],['English','Poetry',q2,'C'],['English','Grammar',q1,'B']]
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1280,'height':1000});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/staff-access',lambda route:mcq_api(page,route))
 page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=import')
 form=page.locator('.mcq-csv-form');form.locator('[name=mcq-staff]').select_option('X:one');form.locator('[name=mcq-subject]').select_option('english')
 with page.expect_download() as info:form.get_by_role('button',name='Download CSV template',exact=True).click()
 template=Path(info.value.path()).read_bytes();assert template.startswith(b'\xef\xbb\xbf');assert b'CorrectAnswer' in template
 file=form.locator('[name=mcq-csv-file]');save=form.get_by_role('button',name='Import questions with PIN',exact=True)
 file.set_input_files(upload([['English','Grammar',q1,'Z']]))
 form.get_by_role('alert').wait_for();assert save.is_disabled();assert not root['mcq']
 file.set_input_files(upload(rows));form.get_by_role('status').filter(has_text='3 rows ready').wait_for();assert form.locator('tbody tr').count()==3;assert not root['mcq']
 form.locator('[name=mcq-pin]').fill('000');save.click();form.get_by_role('alert').wait_for();assert 'PIN does not match' in form.get_by_role('alert').inner_text();assert form.locator('tbody tr').count()==3
 form.locator('[name=mcq-pin]').fill('123');save.click();page.get_by_text('CSV imported · 2 questions added · 1 duplicates skipped.',exact=True).wait_for()
 assert set(root['mcq']['questions'])=={'QE001','QE002'}
 assert root['mcq']['questions']['QE001']['stem']==q1
 page.get_by_role('button',name='Bulk upload CSV',exact=True).click();form=page.locator('.mcq-csv-form')
 form.locator('[name=mcq-csv-file]').set_input_files(upload(rows));form.get_by_role('status').filter(has_text='3 rows ready').wait_for();form.locator('[name=mcq-pin]').fill('123');form.get_by_role('button',name='Import questions with PIN',exact=True).click()
 page.get_by_text('CSV imported · 0 questions added · 3 duplicates skipped.',exact=True).wait_for()
 page.get_by_role('button',name='2 · Create QP',exact=True).click();page.locator('[name=mcq-select-QE001]').check()
 assert page.locator('[data-question-id=QE001]').get_attribute('data-selected')=='true'
 page.locator('[name=mcq-search]').fill('bright');page.locator('[name=mcq-select-QE001]').wait_for(state='detached');page.locator('[name=mcq-select-QE002]').check()
 details=page.locator('.mcq-selected-details');details.locator('summary').click();details.get_by_role('button',name='Remove QE001 from paper',exact=True).click()
 page.get_by_role('status').filter(has_text='1 selected').wait_for();page.locator('[name=mcq-search]').fill('');page.locator('[name=mcq-select-QE001]').wait_for();assert not page.locator('[name=mcq-select-QE001]').is_checked();page.locator('[name=mcq-select-QE001]').check()
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/tmp/mcq-csv-bank.png',full_page=True)
 auth=page.locator('.mcq-paper-form');auth.locator('[name=mcq-pin]').fill('123');auth.get_by_role('button',name='Generate paper',exact=True).click()
 page.get_by_role('button',name='Print A4 / save PDF — no answers',exact=True).wait_for();assert len(root['mcq']['papers']['QPE001']['questionIds'])==2
 assert not errors,errors
 principal=b.new_context();principal.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);pp=principal.new_page();pp.route('**/api/staff-access',lambda route:mcq_api(pp,route));pp.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=import')
 pf=pp.locator('.mcq-csv-form');pf.wait_for();pf.locator('[name=mcq-subject]').select_option('english');assert pf.locator('[name=mcq-pin]').count()==0
 pf.locator('[name=mcq-csv-file]').set_input_files(upload([['English','Mixed','Principal question\nA) 1 B) 2 C) 3 D) 4','A']]))
 pf.get_by_role('status').filter(has_text='1 rows ready').wait_for();pf.get_by_role('button',name='Import questions',exact=True).click();pp.get_by_text('CSV imported · 1 questions added · 0 duplicates skipped.',exact=True).wait_for();assert root['mcq']['questions']['QE003']['contributorId']=='principal'
 b.close()
print('CSV upload, PIN/Principal import, deduplication, responsive bank and QP selection passed')
