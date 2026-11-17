"""Common afternoon checklist, real renderer, synthetic staff/API only."""
import socket,subprocess
from pathlib import Path
from datetime import datetime,timezone,timedelta
from playwright.sync_api import sync_playwright
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
    def api(route):
     v=route.request.post_data_json
     if v['action']=='pin-submit' and v.get('rollOperation')=='report':
      assert v['pin']=='123';assert len(v['questionSnapshot'])==10;assert v['answers']['afternoon_check_1']=='no';assert len(v['answerComments']['afternoon_check_1'].split())==20;assert len(v['answers']['afternoon_reflection'].split())==50
      calls.append(v);reports['afternoon']={**v,'staffId':'one','date':day,'status':'recorded','submittedAt':now}
     route.fulfill(json={'ok':True,'serverDate':day,'serverTime':now,'staff':{'one':{'name':'Synthetic Teacher','wing':wing}},'rollCall':{'reports':reports,'objections':{}}})
    page.route('**/api/staff-access',api);page.route('**/firebase-client.js',lambda r:r.fulfill(content_type='application/javascript',body='export const auth={currentUser:null,authStateReady:async()=>{}};'));page.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js',lambda r:r.fulfill(content_type='application/javascript',body=''))
    page.goto(f'http://127.0.0.1:{port}/cbse-roll-call-view.js');page.set_content('<link rel="stylesheet" href="/cbse-roll-call.css"><main id="root"></main>');page.evaluate("async()=>{const {renderRollCall}=await import('/cbse-roll-call-view.js');window.controller=renderRollCall(document.querySelector('#root'));}")
    page.get_by_role('button',name='Afternoon Roll Call',exact=True).click();page.locator('[name=roll-reporting-wing]').select_option(wing);page.get_by_role('button',name='Submit Roll Call for Synthetic Teacher',exact=True).click();page.locator('[name=roll-on-leave]').select_option('no')
    dialog=page.get_by_role('dialog',name='Employee Roll Call')
    selects=dialog.locator('select[name^="roll-afternoon_check_"]');assert selects.count()==9;assert selects.evaluate_all('(nodes)=>nodes.every(n=>n.value==="yes" && n.options.length===2)')
    assert dialog.locator('[name=roll-comment-afternoon_check_1]').is_hidden()
    selects.first.select_option('no');comment=dialog.locator('[name=roll-comment-afternoon_check_1]');assert comment.is_visible()
    for count,valid in [(19,False),(20,True),(30,True),(31,False)]:
     comment.fill(words(count));assert comment.evaluate('(n)=>n.checkValidity()')==valid
    comment.fill(words(20));remark=dialog.locator('[name=roll-afternoon_reflection]')
    for count,valid in [(49,False),(50,True),(100,True),(101,False)]:
     remark.fill(words(count));assert remark.evaluate('(n)=>n.checkValidity()')==valid
    remark.fill(words(50));dialog.locator('[name=roll-undertaking]').check();dialog.get_by_role('button',name='Submit roll call',exact=True).click();page.locator('[name=roll-submit-pin]').fill('123');page.get_by_role('button',name='Confirm submission',exact=True).click();page.get_by_text('Roll call submitted successfully.',exact=False).wait_for();assert len(calls)==1
    page.close()
  browser.close()
 print('PASS same ten questions in both wings and return modes, default Yes, word limits and PIN submission')
finally:
 server.terminate();server.wait(timeout=10)
