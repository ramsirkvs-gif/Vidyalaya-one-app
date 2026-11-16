"""Direct morning/afternoon reporting, optional comments and IC clearance on phones."""
from playwright.sync_api import sync_playwright, expect
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8000/cbse-roll-call-model.js')
    page.set_content('<link rel="stylesheet" href="/cbse.css"><link rel="stylesheet" href="/cbse-roll-call.css"><main><div id="register"></div><div id="principal"></div></main>')
    page.evaluate('''async()=>{
      const {applyRollCall,ROLL_CHECKS}=await import('/cbse-roll-call-model.js');
      const {renderDailyRollRegister}=await import('/cbse-roll-call-register.js');
      const {renderRollPrincipalDashboard}=await import('/cbse-roll-call-principal.js');
      window.setupDirect=(wing,period)=>{
        window.now=Date.parse('2026-11-16T04:00:00Z');window.wing=wing;window.period=period;
        window.staff={teacher:{name:'Synthetic '+wing,designation:wing==='primary'?'PRT':'TGT',wing,status:'active'}};
        window.saved=applyRollCall({},{rollOperation:'report',wing,period:'morning',reported:'yes',answers:Object.fromEntries(ROLL_CHECKS.map(([k])=>[k,'yes']))},{id:'teacher',name:staff.teacher.name},staff,now);
        if(period==='afternoon')saved=applyRollCall(saved,{rollOperation:'report',wing,period:'afternoon'},{id:'teacher',name:staff.teacher.name},staff,++now);
        window.draw=()=>{
          document.querySelector('#register').replaceChildren();document.querySelector('#principal').replaceChildren();
          const data={serverDate:'2026-11-16',serverTime:now,staff,rollCall:saved};
          renderDailyRollRegister(document.querySelector('#register'),data,wing,period,()=>{});
          renderRollPrincipalDashboard(document.querySelector('#principal'),{data,state:{scope:'roll',tab:'pending'},api:async input=>{saved=applyRollCall(saved,input,{id:'principal',name:'Principal'},staff,++now);return {ok:true};},run:async fn=>fn(),refresh:async()=>draw(),close:()=>{},signout:()=>{}});
        };draw();
      };
      window.toggleObjection=()=>{saved=applyRollCall(saved,{rollOperation:'object',wing,targets:['teacher'],remark:'Exam bundle pending'},{id:'principal',name:'Principal'},staff,++now,'ic');draw();};
      window.clearObjection=()=>{saved=applyRollCall(saved,{rollOperation:'clear',objectionId:'ic_teacher'},{id:'principal',name:'Principal'},staff,++now);draw();};
    }''')
    for wing in ['primary','secondary']:
        for period in ['morning','afternoon']:
            page.evaluate('([w,p])=>setupDirect(w,p)',[wing,period])
            row=page.locator('#register [data-staff-id=teacher]')
            expect(row).to_contain_text('Present')
            assert page.get_by_role('button',name='Approve RC',exact=True).count()==0
            page.locator('[name=roll-principal-comment]').last.fill('Please complete the register today.')
            page.get_by_role('button',name='Save review comment',exact=True).last.click()
            expect(row).to_contain_text('Principal: Please complete the register today.')
            assert page.evaluate("Object.values(saved.reports).every(r=>r.status==='recorded')")
            for width in [320,390,768,1440]:
                page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if period=='afternoon':
                page.evaluate('toggleObjection()');expect(row).to_contain_text('IC objection open · NOC required')
                page.evaluate('clearObjection()');expect(row).to_contain_text('Present')
    assert not errors,errors;browser.close()
print('PASS both wings/periods record directly, Principal comments persist in the list, IC block/NOC restore correctly, and mobile layouts fit')
