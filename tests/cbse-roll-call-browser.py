from playwright.sync_api import sync_playwright, expect
from datetime import datetime,timezone,timedelta
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});saved=[];state={'reports':{},'objections':{}};unlocked=[False];staff={'a':{'name':'MR. ABHISHEK SINGH','wing':'secondary'},'b':{'name':'Synthetic Primary','wing':'primary'}}
 def api(route):
  v=route.request.post_data_json;action=v['action'];day=(datetime.now(timezone.utc)+timedelta(hours=5,minutes=30)).strftime('%Y-%m-%d')
  if action=='view-login':unlocked[0]=True;route.fulfill(json={'ok':True});return
  if action=='roll-call-read' and not unlocked[0]:route.fulfill(status=401,json={'error':'Viewing password required'});return
  if action=='pin-submit':
   assert v['pin']=='123' and v['staffId']=='a'
   if v['rollOperation']=='report':
    saved.append(v);state['reports'][v['period']]={**v,'name':'MR. ABHISHEK SINGH','date':day,'status':'review' if v.get('noReason') and v['period']=='morning' else 'pending' if v['period']=='afternoon' else 'submitted','submittedAt':int(datetime.now(timezone.utc).timestamp()*1000)}
  route.fulfill(json={'ok':True,'serverDate':day,'serverTime':int(datetime.now(timezone.utc).timestamp()*1000),'staff':staff,'rollCall':state})
 page.route('**/api/staff-access',api);page.goto('http://127.0.0.1:8000/cbse-roll-call-view.js');page.set_content('<link rel="stylesheet" href="/cbse-roll-call.css"><main id="root"></main>');page.evaluate("async()=>{const {renderRollCall}=await import('./cbse-roll-call-view.js');renderRollCall(document.querySelector('#root'));}")
 page.locator('[name=roll-view-password]').fill('synthetic');page.get_by_role('button',name='Open Roll Call',exact=True).click()
 page.locator('[name=roll-reporting-wing]').select_option('primary');expect(page.locator('[name=roll-staff] option')).to_have_text(['Choose your name','1. Synthetic Primary'])
 page.locator('[name=roll-reporting-wing]').select_option('secondary');expect(page.locator('[name=roll-staff] option')).to_have_text(['Choose your name','20. MR. ABHISHEK SINGH · TGT-English'])
 page.locator('[name=roll-staff]').select_option('a');assert page.locator('[name=roll-pin]').count()==0;page.get_by_role('button',name='Open my roll call').click();page.locator('[name=roll-reported]').wait_for();assert page.locator('.roll-staff-directory').count()==0;assert __import__('re').search(r'Reporting date: \d{2}/\d{2}/\d{4}',page.locator('.roll-server-date').inner_text());before=page.locator('.roll-live-clock').inner_text();page.wait_for_function('(old)=>document.querySelector(".roll-live-clock").textContent!==old',arg=before)
 assert page.locator('[name=roll-reported]').input_value()=='no';assert page.locator('[name=roll-board-date], [name=roll-board-wing]').count()==0
 assert page.evaluate("!!(document.querySelector('.roll-report-form').compareDocumentPosition(document.querySelector('.roll-management')) & Node.DOCUMENT_POSITION_FOLLOWING)")
 assert page.get_by_role('button',name='Morning Roll Call',exact=True).get_attribute('aria-pressed')=='true'
 page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Afternoon Roll Call',exact=True).click();assert page.locator('[name=roll-reported]').count()==0
 page.get_by_role('button',name='Morning Roll Call',exact=True).click();assert page.locator('[name=roll-informed]').input_value()=='no'
 assert page.locator('[name=roll-reported]').locator('..').inner_text().startswith('1. ');assert page.locator('[name=roll-informed]').locator('..').inner_text().startswith('2. ');assert page.locator('[name=roll-remark]').locator('..').inner_text().startswith('6. ')
 page.locator('[name=roll-leave]').select_option('long');assert page.locator('[name=roll-from]').is_visible()
 page.locator('[name=roll-reported]').select_option('yes');assert page.locator('[name=roll-biometric]').input_value()=='no';assert page.locator('[name=roll-biometric]').locator('..').inner_text().startswith('2. ');assert page.locator('[name=roll-messages]').locator('..').inner_text().startswith('11. ')
 page.locator('[name=roll-sop]').select_option('na');page.get_by_role('button',name='Submit roll call',exact=True).click();page.locator('[name=roll-no-reason]').wait_for();assert page.locator('[name=roll-submit-pin]').count()==0
 page.get_by_role('button',name='Continue to submission').click();assert page.locator('[name=roll-no-reason]').is_visible();assert len(saved)==0
 page.locator('[name=roll-no-reason]').fill('Emergency duty delayed these confirmations.');page.get_by_role('button',name='Continue to submission').click();page.get_by_role('button',name='Cancel',exact=True).click();page.get_by_text('Submission cancelled. No changes saved.',exact=True).wait_for();assert len(saved)==0;assert page.locator('[name=roll-sop]').input_value()=='na'
 page.get_by_role('button',name='Submit roll call',exact=True).click();page.locator('[name=roll-no-reason]').fill('Emergency duty delayed these confirmations.');page.get_by_role('button',name='Continue to submission').click();page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click();page.get_by_text('Roll call submitted successfully.',exact=False).wait_for();assert __import__('re').search(r'\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2} IST',page.locator('[role=status]').inner_text());assert __import__('re').search(r'Last response submitted: \d{2}/\d{2}/\d{4}',page.locator('.roll-last-response').inner_text());assert saved[0]['noReason'];assert saved[0]['answers']['sop']=='na';assert page.get_by_text('No answer — Principal review required',exact=True).is_visible()
 # Half-day child selection and server-submitted first-half afternoon path.
 page.locator('[name=roll-leave]').select_option('half');assert page.locator('[name=roll-half-day]').is_visible();assert page.locator('[name=roll-period]').input_value()=='afternoon';assert page.get_by_role('button',name='Morning Roll Call',exact=True).is_disabled()
 page.locator('[name=roll-half-day]').select_option('second');assert page.get_by_role('button',name='Morning Roll Call',exact=True).is_enabled()
 page.locator('[name=roll-half-day]').select_option('first');page.locator('[name=roll-reported]').select_option('yes')
 for name in ['informed','cover','exam','data']:page.locator('[name=roll-'+name+']').select_option('yes')
 page.get_by_role('button',name='Submit roll call',exact=True).click();page.locator('[name=roll-submit-pin]').fill('123');assert page.locator('[name=roll-no-reason]').count()==0;page.get_by_role('button',name='Confirm submission',exact=True).click();page.get_by_text('Roll call submitted successfully.',exact=False).wait_for();assert saved[-1]['period']=='afternoon' and saved[-1]['halfDay']=='first'
 assert page.locator('.roll-objections').count()==0
 page.get_by_role('button',name='IC Objections — Afternoon Clearance',exact=True).click();page.get_by_role('button',name='Open IC objection area',exact=True).wait_for();page.locator('[name=roll-staff]').select_option('a');page.get_by_role('button',name='Open IC objection area',exact=True).click();page.locator('.roll-objections summary').click();assert page.locator('.roll-report-form').count()==0;assert page.locator('.roll-employee-picks label').count()==1;assert page.locator('[name=roll-objection-wing] option').count()==1
 page.locator('[name=roll-reporting-wing]').select_option('primary');expect(page.locator('[name=roll-staff] option')).to_have_text(['Choose your name','1. Synthetic Primary']);assert page.locator('[name=roll-pin], [name=roll-submit-pin]').count()==0;assert page.locator('.roll-staff-row').count()==1;assert 'Synthetic Primary' in page.locator('.roll-staff-row').inner_text();assert page.get_by_text('RC not reported today',exact=True).count()==2
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 b.close()
print('PASS wing-separated forms, submission PIN, mandatory No reason, half-day child options, afternoon-only first-half leave and mobile widths')
