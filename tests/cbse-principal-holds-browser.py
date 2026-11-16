"""Principal departure holds, post-submission notice, and conditional Samagam OD details."""
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8000/cbse-roll-call-model.js');page.set_content('<link rel="stylesheet" href="/cbse.css"><link rel="stylesheet" href="/cbse-roll-call.css"><main id="host" class="roll-workspace"></main>')
    page.evaluate('''async()=>{
      window.model=await import('/cbse-roll-call-model.js');window.rm=await import('/cbse-reporting-model.js');window.now=Date.parse('2026-11-16T04:00:00Z');window.saved={};window.staff={teacher:{name:'Synthetic Secondary',designation:'TGT',status:'active',wing:'secondary'},primary:{name:'Synthetic Primary',designation:'PRT',status:'active',wing:'primary'}};
      window.snapshot=()=>({ok:true,staff,serverDate:'2026-11-16',serverTime:now,reporting:rm.publishedReporting(null),rollCall:saved});
      window.showHoldControls=async()=>{const {renderPrincipalHolds}=await import('/cbse-roll-call-hold-controls.js');const host=document.querySelector('#host');host.replaceChildren();renderPrincipalHolds(host,{data:snapshot(),api:async input=>{saved=model.applyRollCall(saved,input,{id:'principal',name:'Principal'},staff,++now,'hold_'+now);return snapshot();},run:async fn=>fn(),refresh:async()=>showHoldControls()});};await showHoldControls();
    }''')
    page.locator('[name=principal-hold-mode]').select_option('all');page.locator('[name=principal-hold-remark]').fill('Meet Principal for NOC')
    page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Place Principal hold',exact=True).click();page.get_by_text('Open Principal holds (2)',exact=True).wait_for()
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.set_viewport_size({'width':390,'height':844})
    def api(route):
        value=route.request.post_data_json
        if value['action']=='pin-submit':
            assert value['staffId']=='teacher' and value['pin']=='123'
            payload=page.evaluate("v=>{saved=model.applyRollCall(saved,v,{id:'teacher',name:staff.teacher.name},staff,++now);return snapshot()}",value)
        else:payload=page.evaluate('snapshot()')
        route.fulfill(json=payload)
    page.route('**/api/staff-access',api)
    page.evaluate("async()=>{const {renderRollCall}=await import('/cbse-roll-call-view.js');window.rc=renderRollCall(document.querySelector('#host'));}")
    page.get_by_role('button',name='Morning Roll Call reporting',exact=True).click();page.locator('[name=roll-reporting-wing]').select_option('secondary')
    page.get_by_role('button',name='Submit Roll Call for Synthetic Secondary',exact=True).click();page.locator('[name=roll-morning-mode]').select_option('present');page.locator('[name=roll-undertaking]').check();page.get_by_role('button',name='Submit with PIN',exact=True).click();page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click()
    popup=page.get_by_role('dialog',name='Meet the Principal before leaving');expect(popup).to_be_visible();expect(popup).to_contain_text('Your Roll Call is saved');expect(popup).to_contain_text('Meet Principal for NOC');page.get_by_role('button',name='Understood — I will meet the Principal',exact=True).click()
    row=page.locator('.roll-daily-register [data-staff-id=teacher]');expect(row).to_contain_text('Principal hold · NOC required')
    page.get_by_role('button',name='← Back to Roll Call menu',exact=True).click();page.get_by_role('button',name='Afternoon Roll Call',exact=True).click();page.get_by_role('button',name='Submit Roll Call for Synthetic Secondary',exact=True).click();page.locator('[name=roll-on-leave]').select_option('no');page.locator('[name=roll-undertaking]').check();page.get_by_role('button',name='Submit roll call',exact=True).click();page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click();expect(popup).to_be_visible();assert page.evaluate("saved.reports['2026-11-16_afternoon_teacher'].status")=='blocked';page.get_by_role('button',name='Understood — I will meet the Principal',exact=True).click()
    page.evaluate('showHoldControls()');page.locator('.roll-status-card').filter(has=page.get_by_text('Synthetic Secondary',exact=True)).get_by_role('button',name='Release hold / grant NOC',exact=True).click();page.get_by_text('Open Principal holds (1)',exact=True).wait_for();assert page.evaluate("saved.reports['2026-11-16_afternoon_teacher'].status")=='recorded'
    page.evaluate('''async()=>{const {renderAdvanceLeaveForm}=await import('/cbse-advance-leave-view.js');window.drawOD=()=>{document.querySelector('#host').replaceChildren();renderAdvanceLeaveForm(document.querySelector('#host'),{data:snapshot(),identity:'teacher',ids:['teacher'],submit:async(op,input)=>{saved=model.applyRollCall(saved,{...input,rollOperation:op},{id:'teacher',name:staff.teacher.name},staff,++now,'od');drawOD();}});};drawOD();}''')
    detail=page.locator('[name=advance-od-details]');expect(detail).to_be_hidden();page.locator('[name=advance-leave-kind]').select_option('OD outside');expect(detail).to_be_visible();assert detail.get_attribute('rows')=='2';detail.fill('CBSE workshop at regional office — update Samagam')
    page.locator('[data-leave-date="2026-11-17"]').click();page.locator('[name=leave-undertaking]').check();page.get_by_role('button',name='Submit advance Leave / OD outside report',exact=True).click();page.get_by_text('On-duty details for Samagam: CBSE workshop at regional office — update Samagam',exact=True).wait_for();assert page.evaluate('saved.advanceLeaves.od.odDetails').startswith('CBSE workshop')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors;browser.close()
print('PASS Principal all-wing holds, post-submission popup, retained attendance, Principal NOC release, conditional OD details saved, and mobile layouts')
