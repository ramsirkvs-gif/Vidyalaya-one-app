"""Four entry tiles, wing registers, staged forms, PINs, leave exemption and NOC."""
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/workflow-test',lambda r:r.fulfill(content_type='text/html',body='<meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/cbse-roll-call.css><section id=host class=roll-workspace></section>'))
 page.goto('http://127.0.0.1:8000/workflow-test')
 page.evaluate("""async()=>{window.model=await import('./cbse-roll-call-model.js');window.rm=await import('./cbse-reporting-model.js');window.leaveModel=await import('./cbse-advance-leave-model.js');window.testNow=Date.parse('2026-11-12T04:00:00Z');window.saved={};window.calls=[];window.staff={'support:one':{name:'Synthetic Teacher',designation:'TGT',wing:'secondary',status:'active'},'support:two':{name:'Other Teacher',designation:'PGT',wing:'secondary',status:'active',classTeacher:true,classRoles:[{classId:'X',sectionName:'A',sectionId:'a',role:'CT'}]},'support:prt':{name:'Primary Teacher',designation:'PRT',wing:'primary',status:'active'}};window.snapshot=()=>({ok:true,staff,reporting:rm.publishedReporting(null),serverDate:model.rollToday(testNow),serverTime:testNow,rollCall:{...saved,advanceLeaves:leaveModel.publicAdvanceLeaves(saved.advanceLeaves)}});} """)
 def api(route):
  v=route.request.post_data_json
  try:
   if v['action']=='pin-submit':
    if v.get('pin')!='123':route.fulfill(status=401,json={'error':'Incorrect PIN'});return
    value=page.evaluate("v=>{calls.push(v);saved=model.applyRollCall(saved,v,{id:v.staffId,name:staff[v.staffId].name},staff,testNow,'ref_'+calls.length);return snapshot()}",v)
   elif v['action']=='roll-call-principal':
    value=page.evaluate("v=>{saved=model.applyRollCall(saved,v,{id:'principal',name:'Principal'},staff,testNow);return {...snapshot(),rollCall:saved,principal:true}}",v)
   else:value=page.evaluate('snapshot()')
   route.fulfill(json=value)
  except Exception as e:route.fulfill(status=409,json={'error':str(e)})
 page.route('**/api/staff-access',api)
 page.evaluate("async()=>{const {renderRollCall}=await import('./cbse-roll-call-view.js');renderRollCall(document.querySelector('#host'));}")
 page.locator('.roll-area-navigation button').first.wait_for();page.screenshot(path='/tmp/chamber-menu.png',full_page=True);assert page.locator('.roll-area-navigation button').count()==4
 page.get_by_role('button',name='Morning Roll Call reporting',exact=True).click();page.locator('[name=roll-reporting-wing]').select_option('secondary')
 page.locator('.roll-daily-register tr[data-staff-id="support:one"]').wait_for();assert page.locator('.roll-daily-register tbody tr').count()==45 # official roster plus synthetic staff
 page.get_by_role('button',name='Submit Roll Call for Synthetic Teacher',exact=True).click();page.get_by_role('dialog',name='Employee Roll Call',exact=True).wait_for();assert page.locator('.roll-management,.roll-pending-entry').count()==0
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('.roll-employee-dialog').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/tmp/roll-popup-v3.png',full_page=True)
 assert not page.locator('[name=roll-reported]').is_visible();assert not page.get_by_role('button',name='Submit with PIN',exact=True).is_visible()
 page.locator('[name=roll-morning-mode]').select_option('other');assert page.get_by_role('button',name='Fill leave details',exact=True).is_visible()
 page.get_by_role('button',name='Fill leave details',exact=True).click();page.locator('.advance-leave-form').wait_for()
 assert all(n.input_value()=='yes' for n in page.locator('.advance-leave-form select[name^=roll-]').all());assert page.locator('.advance-leave-form .roll-question-comment:visible').count()==0;assert page.locator('[name=advance-leave-reason]').count()==0;assert page.locator('[name=advance-leave-kind] option').all_text_contents()==['Choose Leave / OD outside type','Casual leave (CL)','Earned leave (EL)','Unpaid contractual leave','Paid contractual leave','OD outside','Other'];page.locator('[name=advance-leave-kind]').select_option('Other');page.locator('[name=other-leave-kind]').fill('Mock special leave');page.locator('[data-leave-date="2026-11-12"]').click();page.locator('[name=advance-leave-kind]').select_option('OD outside')
 for n in ['advance_approval','advance_cover','advance_exam','advance_tasks']:page.locator('[name=roll-'+n+']').select_option('yes')
 page.locator('[name=leave-undertaking]').check();page.get_by_role('button',name='Submit advance Leave / OD outside report',exact=True).click();page.locator('[name=roll-submit-pin]').fill('999');page.get_by_role('button',name='Confirm submission',exact=True).click();page.locator('.roll-leave-submit-status').get_by_text('Incorrect PIN',exact=True).wait_for();assert page.locator('.advance-leave-form').is_visible();assert page.locator('[data-leave-date="2026-11-12"]').get_attribute('aria-pressed')=='true';page.get_by_role('button',name='Submit advance Leave / OD outside report',exact=True).click();page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click();page.get_by_text('Submitted successfully. Check the reported leave list below.',exact=True).wait_for();assert page.locator('.advance-leave-form').count()==0;assert page.locator('[name=roll-staff]').input_value()==''
 assert page.evaluate("saved.advanceLeaves.ref_1.undertaking") is True
 assert 'OD outside' in page.locator('.roll-leave-register').inner_text()
 assert not errors,errors
 b.close()
print('PASS OD outside labels, dropdown, PIN submission and saved register')
