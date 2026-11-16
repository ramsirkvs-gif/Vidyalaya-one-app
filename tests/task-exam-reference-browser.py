"""Principal toolbar -> read-only preview -> audited pass correction -> updated report."""
import json,os,socket,subprocess,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parent.parent
with socket.socket() as probe:
    probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
BASE=f'http://127.0.0.1:{port}/'
server=subprocess.Popen(['node','tests/task-manager-browser-server.mjs'],cwd=ROOT,env={**os.environ,'TASK_BROWSER_PORT':str(port)},stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def api(data):
    request=urllib.request.Request(BASE+'api/staff-access',data=json.dumps(data).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer principal'})
    with urllib.request.urlopen(request) as result:return json.load(result)
try:
    assert 'READY' in server.stdout.readline(),server.stderr.read()
    task=api({'action':'task-principal','operation':'create-task1'})['tasks']['task1']
    draft={**task['draft'],'selectedClasses':['IX A','IX B'],'assignments':{'IX A':'X:one','IX B':'X:two'},'headers':{'IX A':{'total':43},'IX B':{'total':48}}}
    task=api({'action':'task-principal','operation':'save','taskId':'task1','expectedRevision':task['revision'],'draft':draft})['tasks']['task1']
    task=api({'action':'task-principal','operation':'publish','taskId':'task1','expectedRevision':task['revision']})['tasks']['task1']
    api({'action':'pin-submit','operation':'task-manager','taskOperation':'submit','staffId':'X:one','pin':'123','taskId':'task1','classId':'IX A','expectedRevision':task['publishedRevision'],'reportRevision':0,'report':{'passed':15,'failed':27,'firstGeneration':4}})
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.route('**/firebase-client.js*',lambda r:r.fulfill(content_type='application/javascript',body="export const auth=window.testAuth={currentUser:{uid:'principal-uid',getIdToken:async()=> 'principal'}};"))
        page.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js',lambda r:r.fulfill(content_type='application/javascript',body="let listener;export function onAuthStateChanged(auth,fn){listener=fn;fn(auth.currentUser);}export async function signOut(auth){auth.currentUser=null;listener(null);}"))
        page.goto(BASE+'cbse-task-manager.html#principal');page.get_by_role('button',name='Apply supplied exam pass counts',exact=True).click();dialog=page.get_by_role('dialog',name='Verified exam pass counts');expect(dialog).to_be_visible()
        expect(dialog.locator('[data-exam-class="IX A"]')).to_contain_text('33.33%');expect(dialog.locator('[data-exam-class="IX B"]')).to_contain_text('No submitted report')
        assert api({'action':'task-principal','operation':'read'})['tasks']['task1']['reports']['IX A']['values']['passed']==15
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert dialog.evaluate('d=>d.getBoundingClientRect().width<=innerWidth')
        dialog.get_by_role('button',name='Confirm and apply verified pass counts',exact=True).click();expect(dialog).to_have_count(0)
        task=api({'action':'task-principal','operation':'read'})['tasks']['task1'];report=task['reports']['IX A'];assert report['values']['passed']==13 and report['values']['failed']==27 and report['values']['firstGeneration']==4;assert report['principalEditHistory']['revision_1']['values']['passed']==15;assert 'IX B' not in task['reports']
        page.get_by_role('button',name='Prepare presentation report',exact=True).click();page.get_by_text('Verified exam pass rate: 33.33% (13/39 appeared). Chart percentage uses enrolled students.',exact=True).first.wait_for();assert '30.2%' in page.locator('.task-presentation').inner_text();page.get_by_role('button',name='Close report',exact=True).click()
        page.get_by_role('button',name='Apply supplied exam pass counts',exact=True).click();expect(dialog).to_be_visible();page.get_by_role('button',name='Sign out',exact=True).evaluate('(button)=>button.click()');expect(dialog).to_have_count(0);assert page.locator('#task-task1').count()==0
        assert not errors,errors;browser.close()
    print('PASS protected toolbar preview, explicit apply, preserved Fail/other answers and history, skipped missing reports, corrected chart/exam percent and mobile/sign-out checks')
finally:
    server.terminate();server.wait(timeout=10)
