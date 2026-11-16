"""Real protected task service -> 54/158 -> consistent HTML and printed PDF."""
import json,os,re,socket,subprocess,urllib.request
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
    sections=[('IX A',43,13),('IX B',48,14),('IX C',40,12),('IX D',38,15)]
    task=api({'action':'task-principal','operation':'create-task1'})['tasks']['task1'];draft={**task['draft'],'selectedClasses':[c for c,_,_ in sections],'assignments':{c:'X:one' for c,_,_ in sections},'headers':{c:{'total':n} for c,n,_ in sections}}
    task=api({'action':'task-principal','operation':'save','taskId':'task1','expectedRevision':task['revision'],'draft':draft})['tasks']['task1'];task=api({'action':'task-principal','operation':'publish','taskId':'task1','expectedRevision':task['revision']})['tasks']['task1']
    for c,n,passed in sections:
        api({'action':'pin-submit','operation':'task-manager','taskOperation':'submit','staffId':'X:one','pin':'123','taskId':'task1','classId':c,'expectedRevision':task['publishedRevision'],'reportRevision':0,'report':{'firstGeneration':1}})
        task=api({'action':'task-principal','operation':'read'})['tasks']['task1'];task=api({'action':'task-principal','operation':'edit-report','taskId':'task1','classId':c,'expectedRevision':task['revision'],'reportRevision':task['reports'][c]['revision'],'report':{'passed':passed}})['tasks']['task1']
    api({'action':'task-principal','operation':'comment','taskId':'task1','expectedRevision':task['revision'],'comment':'Synthetic continuation note.\n'*120})
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.route('**/firebase-client.js*',lambda r:r.fulfill(content_type='application/javascript',body="export const auth={currentUser:{uid:'principal-uid',getIdToken:async()=> 'principal'}};"))
        page.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js',lambda r:r.fulfill(content_type='application/javascript',body="export function onAuthStateChanged(auth,fn){fn(auth.currentUser);}"))
        page.goto(BASE+'cbse-task-manager.html#principal');page.get_by_role('button',name='Prepare presentation report',exact=True).click()
        card=page.locator('.presentation-point').filter(has=page.get_by_role('heading',name='Number of students who passed the latest examination',exact=True)).first
        expect(card.locator('.presentation-count')).to_have_text('34.18%');expect(card).to_contain_text('54 out of 158 appeared students');expect(card).to_contain_text('Exam pass rate among appeared students');assert '32.0%' not in card.inner_text()
        other=page.locator('.presentation-point').filter(has=page.get_by_role('heading',name='First-generation learners (either one or both parents are uneducated)',exact=True)).first
        expect(other).to_contain_text('4 out of 169 students')
        assert page.locator('.presentation-main-page > .presentation-staffing-strip').count()==page.locator('.presentation-main-page').count()
        assert all('31.34%' in text for text in page.locator('.presentation-main-page > .presentation-staffing-strip').all_text_contents())
        page.get_by_role('checkbox',name='Include teacher comments appendix in PDF',exact=True).check()
        page.pdf(path='/tmp/task-exam-percentage.pdf',print_background=True,prefer_css_page_size=True)
        pdf_text=subprocess.check_output(['pdftotext','-layout','/tmp/task-exam-percentage.pdf','-'],text=True);assert '34.18%' in pdf_text;assert len([text for text in pdf_text.split('\f') if text.strip()])>page.locator('.presentation-main-page').count();assert all('31.34%' in text and 'Teaching posts sanctioned: 67' in text for text in pdf_text.split('\f') if text.strip());assert re.search(r'54\s+out\s+of\s+158\s+appeared\s+students',pdf_text)
        assert not errors,errors;browser.close()
    print('PASS authenticated presentation and PDF show 54/158 = 34.18%; other survey percentages retain enrollment and no Fail entry returns')
finally:
    server.terminate();server.wait(timeout=10)
