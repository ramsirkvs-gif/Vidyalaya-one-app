"""Calendar leave dates, PIN submission, daily exemptions and Principal question editing."""
import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.route('**/advance-test',lambda r:r.fulfill(content_type='text/html',body='<meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/cbse-roll-call.css><section id=host class=roll-workspace></section>'));page.goto('http://127.0.0.1:8000/advance-test');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate("""async()=>{window.models=await import('./cbse-roll-call-model.js');window.reportingModel=await import('./cbse-reporting-model.js');window.leaveStore={};window.reportingStore=null;window.testNow=Date.parse('2026-11-08T05:00:00Z');window.testStaff={'X:one':{name:'Synthetic Teacher',status:'active',designation:'TGT',wing:'secondary'}};window.snapshot=()=>({ok:true,staff:testStaff,rollCall:leaveStore,serverDate:models.rollToday(testNow),serverTime:testNow,reporting:reportingModel.publishedReporting(reportingStore)});window.saved=0;}""")
 def api(route):
  v=route.request.post_data_json
  try:
   if v['action']=='chamber-principal':
    if v['operation']=='read':value=page.evaluate("()=>({reporting:reportingStore||{draft:reportingModel.defaultReporting(),revision:0},staff:testStaff})")
    else:value=page.evaluate("v=>{reportingStore=reportingModel.applyReporting(reportingStore,v,testNow);return {ok:true}}",v)
   elif v['action']=='pin-submit':
    if v.get('pin')!='123':route.fulfill(status=401,json={'error':'Incorrect PIN'});return
    value=page.evaluate("v=>{leaveStore=models.applyRollCall(leaveStore,v,{id:'X:one',name:'Synthetic Teacher'},testStaff,testNow,'leave_'+(++saved),reportingStore);return snapshot()}",v)
   else:value=page.evaluate('snapshot()')
   route.fulfill(json=value)
  except Exception as e:route.fulfill(status=409,json={'error':str(e)})
 page.route('**/api/staff-access',api);page.evaluate("""async()=>{const {renderRollCall}=await import('./cbse-roll-call-view.js');renderRollCall(document.querySelector('#host'));}""")
 page.locator('[name=roll-reporting-wing]').select_option('secondary');page.get_by_role('button',name='Advance leave reporting (to avoid Roll Call)',exact=True).click();page.locator('[name=roll-staff]').select_option('X:one');page.get_by_role('button',name='Open advance leave reporting',exact=True).click();page.locator('[data-leave-date="2026-11-09"]').click();page.locator('[data-leave-date="2026-11-11"]').click();assert '2 dates selected' in page.locator('.advance-leave-selected').inner_text()
 for name in ['advance_approval','advance_cover','advance_exam','advance_tasks']:page.locator('[name=roll-'+name+']').select_option('yes')
 page.get_by_role('button',name='Submit advance leave report',exact=True).click();page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click();page.locator('.advance-leave-record').wait_for();assert page.evaluate('leaveStore.advanceLeaves.leave_1.dates')==['2026-11-09','2026-11-11'];assert page.evaluate('leaveStore.advanceLeaves.leave_1.status')=='recorded'
 page.evaluate("testNow=Date.parse('2026-11-09T05:00:00Z')");page.get_by_role('button',name='Employee Roll Call',exact=True).click();page.locator('[name=roll-staff]').select_option('X:one');page.get_by_role('button',name='Open my roll call',exact=True).click();page.get_by_text('Advance leave reporting done for today. Morning and afternoon Roll Call are not required.',exact=True).wait_for();assert page.locator('.roll-report-form').count()==0
 for day,excused in [('10',False),('11',True),('12',False)]:
  page.evaluate("testNow=Date.parse('2026-11-"+day+"T05:00:00Z')");page.get_by_role('button',name='Refresh status',exact=True).click();page.wait_for_function("document.querySelector('#host').dataset.busy==='false'");assert (page.locator('.roll-report-form').count()==0)==excused
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 # Principal-only question editor via the same dashboard used after authentication.
 page.evaluate("""async()=>{document.querySelector('#host').replaceChildren();const {renderRollPrincipalDashboard}=await import('./cbse-roll-call-principal.js');renderRollPrincipalDashboard(document.querySelector('#host'),{data:snapshot(),state:{scope:'roll',tab:'advance-leave'},run:fn=>fn(),api:async input=>{const r=await fetch('/api/staff-access',{method:'POST',body:JSON.stringify(input)});return r.json();},refresh:async()=>{},close:()=>{}});} """)
 page.get_by_role('button',name='Add / edit / delete leave questions',exact=True).click();page.locator('[name=question-label]').first.wait_for();assert page.locator('[name=question-label]').count()==4;page.get_by_role('button',name='Delete question',exact=True).nth(2).click();page.get_by_role('button',name='Add question',exact=True).click();page.locator('[name=question-label]').last.fill('Have you handed over the library keys?');page.get_by_role('button',name='Publish for teachers',exact=True).click();page.wait_for_function("reportingStore?.published?.groups?.advanceLeave?.some(q=>q.label==='Have you handed over the library keys?')");assert page.evaluate('reportingStore.published.groups.morning.length')>0;assert not errors,errors;b.close()
print('PASS selected dates, existing PIN, daily exemption/gaps/last day, mobile layout and Principal add/delete/publish questions')
