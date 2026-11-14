"""Morning leave arrangement, actual afternoon return and the corresponding register statuses."""
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/half-test',lambda r:r.fulfill(content_type='text/html',body='<meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/cbse-roll-call.css><section id=host class=roll-workspace></section>'));page.goto('http://127.0.0.1:8000/half-test')
 page.evaluate("""async()=>{window.model=await import('./cbse-roll-call-model.js');window.reporting=await import('./cbse-reporting-model.js');window.saved={};window.staff={one:{name:'Synthetic Teacher',designation:'TGT',wing:'secondary',status:'active'}};window.now=Date.parse('2026-11-12T04:00:00Z');window.snapshot=()=>({ok:true,staff,rollCall:saved,reporting:reporting.publishedReporting(null),serverDate:'2026-11-12',serverTime:now});window.render=async()=>{const {renderRollCall}=await import('./cbse-roll-call-view.js');renderRollCall(document.querySelector('#host'));};}""")
 def api(route):
  v=route.request.post_data_json
  try:
   if v['action']=='pin-submit':
    assert v['pin']=='123';result=page.evaluate("v=>{saved=model.applyRollCall(saved,v,{id:'one',name:staff.one.name},staff,now);return snapshot()}",v)
   else:result=page.evaluate('snapshot()')
   route.fulfill(json=result)
  except Exception as e:route.fulfill(status=409,json={'error':str(e)})
 page.route('**/api/staff-access',api)
 def submit():
  page.locator('[name=roll-undertaking]').check();page.get_by_role('button',name='Submit with PIN' if page.locator('[name=roll-morning-mode]').count() else 'Submit roll call',exact=True).click();page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click();page.get_by_text('Roll call submitted successfully.',exact=False).wait_for();assert page.locator('.roll-report-form').count()==0
 for half in ['first']:
  page.evaluate('saved={};render()');page.get_by_role('button',name='Morning Roll Call reporting',exact=True).click();page.locator('[name=roll-reporting-wing]').select_option('secondary');page.get_by_role('button',name='Submit Roll Call for Synthetic Teacher',exact=True).click()
  assert not page.locator('[name=roll-reported]').is_visible();page.locator('[name=roll-morning-mode]').select_option('first')
  assert page.locator('[name=roll-morning-mode] option').all_text_contents()==['Choose','Only first-half instant leave','Other Leave / OD outside','Present for Roll Call']
  assert page.locator('.roll-answer-strips').count()==4
  assert page.locator('.roll-leave-pdf').count()==0;submit();assert page.evaluate('Object.values(saved.reports).length')==1;assert page.evaluate('Object.values(saved.reports)[0].halfDay')==half
  if half=='first':
   row=page.locator('.roll-daily-register tr[data-staff-id=one]');assert 'Leave / OD outside · exempt from Roll Call' in row.inner_text();assert row.get_by_role('button',name='Edit Roll Call for Synthetic Teacher').count()==1
   page.get_by_role('button',name='Afternoon Roll Call',exact=True).click();page.get_by_role('button',name='Submit Roll Call for Synthetic Teacher',exact=True).click();page.locator('[name=roll-on-leave]').select_option('no');assert page.locator('[name=roll-half-day]').input_value()=='first';assert page.locator('[name=roll-reported]').input_value()=='yes';submit();assert page.evaluate("Object.values(saved.reports).find(r=>r.period==='afternoon').reported")=='yes'
 # Longer leave leaves only the redirect; it cannot silently submit a Roll Call.
 page.evaluate('saved={};render()');page.get_by_role('button',name='Morning Roll Call reporting',exact=True).click();page.locator('[name=roll-reporting-wing]').select_option('secondary');page.get_by_role('button',name='Submit Roll Call for Synthetic Teacher',exact=True).click();page.locator('[name=roll-morning-mode]').select_option('other');assert not page.get_by_role('button',name='Submit with PIN',exact=True).is_visible();page.get_by_role('button',name='Fill Leave / OD outside details',exact=True).click();page.locator('.advance-leave-form').wait_for();assert page.locator('.roll-employee-dialog').count()==0
 assert not errors,errors;b.close()
print('PASS first-half morning recording, actual afternoon return, exemptions and other-leave redirect')
