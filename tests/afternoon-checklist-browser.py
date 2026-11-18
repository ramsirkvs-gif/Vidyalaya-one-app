"""Common afternoon checklist, real renderer, synthetic staff/API only."""
import socket,subprocess
from pathlib import Path
from datetime import datetime,timezone,timedelta
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parent.parent
with socket.socket() as probe:
 probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
server=subprocess.Popen(['python3','-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
words=lambda n:' '.join(['synthetic']*n)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for wing in ['primary','secondary']:
   for first in [False,True]:
    page=browser.new_page(viewport={'width':390,'height':844});day=(datetime.now(timezone.utc)+timedelta(hours=5,minutes=30)).strftime('%Y-%m-%d');now=int(datetime.now(timezone.utc).timestamp()*1000);calls=[]
    reports={'morning':{'staffId':'one','name':'Synthetic Teacher','wing':wing,'date':day,'period':'morning','workflowVersion':5,'reported':'no' if first else 'yes','status':'recorded',**({'leaveType':'half','halfDay':'first'} if first else {})}}
    objections={};confirm_save=True
    def api(route):
     v=route.request.post_data_json
     if v['action']=='pin-submit':
      if v['pin']!='123':
       route.fulfill(status=403,json={'error':'Incorrect PIN'});return
      if v.get('rollOperation')=='report':
       if not confirm_save:
        route.fulfill(json={'ok':False});return
       assert 'leaveType' not in v and 'halfDay' not in v
       assert len(v['answers'])==10
       calls.append(v)
       reports['afternoon']={**{k:value for k,value in v.items() if k!='pin'},'staffId':'one','date':day,'status':'blocked' if 'hold' in objections else 'recorded','submittedAt':now}
     private=v['action']=='pin-submit'
     visible_reports={key:{k:value for k,value in r.items() if private or k not in ['answers','answerComments']} for key,r in reports.items()}
     route.fulfill(json={'ok':True,'serverDate':day,'serverTime':now,'staff':{'one':{'name':'Synthetic Teacher','wing':wing}},'rollCall':{'reports':visible_reports,'objections':objections}})
    page.route('**/api/staff-access',api);page.route('**/firebase-client.js',lambda r:r.fulfill(content_type='application/javascript',body='export const auth={currentUser:null,authStateReady:async()=>{}};'));page.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js',lambda r:r.fulfill(content_type='application/javascript',body=''))
    page.goto(f'http://127.0.0.1:{port}/cbse-roll-call-view.js');page.set_content('<link rel="stylesheet" href="/cbse-roll-call.css"><main id="root"></main>');page.evaluate("async()=>{const {renderRollCall}=await import('/cbse-roll-call-view.js');window.controller=renderRollCall(document.querySelector('#root'));}")
    page.get_by_role('button',name='Afternoon Roll Call',exact=True).click();page.locator('[name=roll-reporting-wing]').select_option(wing);page.get_by_role('button',name='Submit Roll Call for Synthetic Teacher',exact=True).click()
    dialog=page.get_by_role('dialog',name='Employee Roll Call');dialog.wait_for(state='visible')
    assert dialog.locator('[name=roll-on-leave],[name=roll-reported]').count()==0
    assert dialog.get_by_text('Returning after first-half leave:',exact=False).count()==int(first)
    selects=dialog.locator('select[name^="roll-afternoon_check_"]');assert selects.count()==9;assert selects.evaluate_all('(nodes)=>nodes.every(n=>n.value==="yes" && n.options.length===2)')
    assert dialog.locator('[name=roll-comment-afternoon_check_1]').is_hidden()
    selects.first.select_option('no');comment=dialog.locator('[name=roll-comment-afternoon_check_1]');assert comment.is_visible()
    for count,valid in [(19,False),(20,True),(50,True),(51,False)]:
     comment.fill(words(count));assert comment.evaluate('(n)=>n.checkValidity()')==valid
    expect(dialog.get_by_text('51 / 50 words',exact=True)).to_be_visible()
    selects.first.select_option('yes')
    assert comment.is_hidden() and comment.is_disabled() and comment.evaluate('(n)=>n.checkValidity()')
    selects.first.select_option('no');comment.fill(words(50));remark=dialog.locator('[name=roll-afternoon_reflection]')
    for count,valid in [(49,False),(50,True),(100,True),(101,False)]:
     remark.fill(words(count));assert remark.evaluate('(n)=>n.checkValidity()')==valid
    remark.fill(words(50));dialog.locator('[name=roll-undertaking]').check()
    submit=dialog.get_by_role('button',name='Submit roll call',exact=True)
    success=page.locator('.roll-afternoon-success')
    if wing=='primary' and not first:
     objections['ic']={'staffId':'one','status':'open','kind':'task','remark':'Synthetic task','createdName':'Synthetic IC'}
     submit.click()
     objection=page.get_by_role('dialog',name='Pending tasks — NOC required')
     expect(objection).to_contain_text('Contact the concerned IC')
     objection.get_by_role('button',name='Return to my form').click()
     expect(dialog.get_by_role('status')).to_contain_text('not submitted')
     assert success.count()==0 and not calls
     objections.clear()
    if first:
     objections['hold']={'id':'hold','staffId':'one','status':'open','kind':'principal-hold','remark':'Meet the Principal'}
    submit.click()
    page.locator('[name=roll-submit-pin]').fill('999');page.get_by_role('button',name='Confirm submission',exact=True).click()
    expect(dialog.get_by_role('status')).to_have_text('Incorrect PIN')
    assert success.count()==0 and not calls
    if wing=='secondary' and not first:
     confirm_save=False
     submit.click()
     page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click()
     expect(dialog.get_by_role('status')).to_contain_text('The save was not confirmed')
     assert success.count()==0 and not calls
     confirm_save=True
    submit.click()
    page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click()
    expect(success).to_have_text('✓ Submitted successfully')
    assert len(calls)==1 and calls[0]['answerComments']['afternoon_check_1']==words(50)
    if first:
     hold=page.get_by_role('dialog',name='Meet the Principal before leaving')
     expect(hold).to_contain_text('obtain NOC before leaving')
     assert page.get_by_text('Complete biometric sign-out',exact=False).count()==0
     hold.get_by_role('button',name='Understood',exact=False).click()
    expect(page.locator('.roll-daily-register [data-staff-id=one]')).to_contain_text('✓ Submitted successfully')
    assert page.locator('.roll-daily-register').get_by_text(words(50),exact=True).count()==0
    expect(page.get_by_role('button',name='Edit Roll Call for Synthetic Teacher',exact=True)).to_have_count(0)
    page.close()
  browser.close()
 print('PASS same ten questions in both wings and return modes, word limits, PIN attempts, no edit action for present teachers, confirmation and objection handling')
finally:
 server.terminate();server.wait(timeout=10)
