from pathlib import Path
import csv,io
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
def upload(kind):
 out=io.StringIO();w=csv.writer(out);w.writerow(['Subject','Topic',*(['SharedPassage'] if kind=='linked' else []),'Question','CorrectAnswer']);rows=[['English','Grammar','Normal question A) One B) Two C) Three D) Four','A']] if kind=='normal' else [['English','Grammar','A shared passage','Linked first A) One B) Two C) Three D) Four','A'],['English','Grammar','','Linked second A) One B) Two C) Three D) Four','B']];w.writerows(rows);return {'name':kind+'.csv','mimeType':'text/csv','buffer':out.getvalue().encode()}
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844});ctx.add_init_script("sessionStorage.setItem('mcq-entry-selection:true',JSON.stringify({classId:'X',subjectId:'english',staffId:'principal'}))");ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def checked_api(route):
  v=route.request.post_data_json
  if v.get('action')=='mcq-principal' and v.get('operation')=='mcq-import-csv' and v.get('creditContributorId')=='X:one' and v.get('creditPIN')!='123':route.fulfill(status=401,json={'error':'The PIN does not match this staff member.'});return
  mcq_api(page,route)
 page.route('**/api/staff-access',checked_api)
 for kind in ['normal','linked']:
  page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=import');form=page.locator('.mcq-csv-form');form.wait_for();assert form.locator('[name=mcq-subject]').input_value()=='english';assert form.locator('[name=mcq-credit-pin]').is_hidden();form.locator('[name=mcq-credit-contributor]').select_option('X:one');assert form.locator('[name=mcq-credit-pin]').is_visible();form.locator('[name=mcq-csv-kind]').select_option(kind);form.locator('[name=mcq-csv-file]').set_input_files(upload(kind));form.get_by_role('status').filter(has_text='rows ready').wait_for();form.locator('[name=mcq-credit-pin]').fill('999');form.get_by_role('button',name='Import questions',exact=True).click();form.get_by_role('alert').filter(has_text='PIN does not match').wait_for();assert form.locator('[name=mcq-credit-pin]').input_value()=='';form.locator('[name=mcq-credit-pin]').fill('123');form.get_by_role('button',name='Import questions',exact=True).click();page.get_by_text('CSV imported · '+('1' if kind=='normal' else '2')+' questions added · 0 duplicates skipped.',exact=True).wait_for()
 questions=list(root['mcq']['questions'].values());assert len(questions)==3;assert all(q['contributorId']=='X:one' and q['uploadedBy']=='principal' for q in questions);assert len([q for q in questions if q.get('linkedSetId')])==2;assert all(v.get('creditPIN')=='123' for v in calls if v.get('operation')=='mcq-import-csv');assert not errors,errors;b.close()
print('PASS Principal normal and linked CSVs each require selected teacher PIN, clear wrong PIN, preserve attribution and keep Principal signed in')
