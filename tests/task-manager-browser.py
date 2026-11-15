"""Generated-site UI against the real task/PIN service with synthetic database/auth.
Run after npm run build. No real Firebase access or school records are used.
"""
import json, subprocess, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
BASE='http://127.0.0.1:8012/'
APP='export function initializeApp(c){return c} export function getApps(){return []}'
AUTH='''const listeners=[];const user={uid:'principal-uid',getIdToken:async()=> 'principal'};const auth={currentUser:localStorage.getItem('task-test-session')?user:null};export function getAuth(){return auth}export const browserLocalPersistence={};export async function setPersistence(){}export function onAuthStateChanged(a,fn){listeners.push(fn);fn(a.currentUser)}export async function signInWithEmailAndPassword(a,email,password){if(password!=='synthetic-password')throw Error('Wrong password');a.currentUser=user;localStorage.setItem('task-test-session','yes');listeners.forEach(fn=>fn(user));}export async function signOut(a){a.currentUser=null;localStorage.removeItem('task-test-session');listeners.forEach(fn=>fn(null));}'''
DB='export function getDatabase(){return {}}'
def sdk(route):
    url=route.request.url
    route.fulfill(content_type='application/javascript',body=APP if url.endswith('firebase-app.js') else AUTH if url.endswith('firebase-auth.js') else DB)
def api(payload,token='principal'):
    req=urllib.request.Request(BASE+'api/staff-access',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+token})
    with urllib.request.urlopen(req) as result:return json.load(result)
server=subprocess.Popen(['node','tests/task-manager-browser-server.mjs'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
    line=server.stdout.readline()
    assert 'READY' in line,server.stderr.read()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        ctx=browser.new_context();ctx.route('https://www.gstatic.com/firebasejs/**',sdk)
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'cbse-task-manager.html#principal')
        page.get_by_label('Principal password',exact=True).fill('synthetic-password');page.get_by_role('button',name='Sign in here',exact=True).click()
        page.get_by_role('button',name='Create Task 1 unpublished draft',exact=True).click()
        card=page.locator('#task-task1');card.get_by_text('Unpublished — private to Principal',exact=True).wait_for()
        assert card.locator('.task-survey-preview').evaluate('(node)=>node.open');assert card.locator('.task-survey-preview .task-count').count()==16;assert card.locator('.task-survey-preview [name=passed]').is_disabled();assert card.locator('.task-class-status').count()==18;assert card.locator('.task-totals').count()==0;assert not card.locator('.task-consolidation').evaluate('(node)=>node.open')
        for width in [360,768,1440]:
            page.set_viewport_size({'width':width,'height':950});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path='/tmp/task-manager-principal-layout.png',full_page=True)
        card.get_by_text('Edit task, survey questions and teacher assignments',exact=True).click()
        card.get_by_label('Task title',exact=True).wait_for(state='visible');assert card.get_by_label('Deadline (leave blank if not provided)',exact=True).input_value()==''
        assert card.get_by_label('Teacher for IX A',exact=True).locator('option[value="X:one"]').inner_text()=='Synthetic Teacher one'
        assert card.locator('.task-question-editor').count()==16
        card.get_by_label('Question 10',exact=True).fill('Students frequently sleepy during class this week')
        card.get_by_role('button',name='Add survey question',exact=True).click();card.get_by_label('Question 17',exact=True).fill('Synthetic additional student category')
        card.get_by_label('Teacher for IX A',exact=True).select_option('X:one')
        card.get_by_label('Teacher for XI E',exact=True).select_option('X:two')
        card.locator('[name=header-import]').set_input_files({'name':'synthetic-figures.json','mimeType':'application/json','buffer':json.dumps({'IX A':{'total':24,'catV':0,'st':None}}).encode()})
        page.get_by_role('status').get_by_text('Figures imported into the form.',exact=False).wait_for()
        with page.expect_download() as download_info:card.get_by_role('link',name='Download class figures CSV template',exact=True).click()
        template=Path(download_info.value.path()).read_text();assert len(template.strip().splitlines())==19
        csv=template.replace('IX A,,,,','IX A,Synthetic Teacher one,24,0,').replace('XI E,,,,','XI E,Synthetic Teacher two,30,,')
        card.locator('[name=header-import]').set_input_files({'name':'synthetic-all-classes.csv','mimeType':'text/csv','buffer':csv.encode()})
        page.get_by_role('status').get_by_text('Figures imported into the form.',exact=False).wait_for()
        assert card.get_by_label('Teacher for XI E',exact=True).input_value()=='X:two';assert card.get_by_label('Total students · XI E',exact=True).input_value()=='30'
        with urllib.request.urlopen(BASE+'synthetic-strength.xlsx') as response:workbook=response.read()
        card.locator('[name=header-import]').set_input_files({'name':'synthetic-strength.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':workbook})
        page.get_by_role('status').get_by_text('Figures imported into the form.',exact=False).wait_for()
        assert card.get_by_label('Teacher for XI E',exact=True).input_value()=='X:two';assert card.get_by_label('Total students · XII E',exact=True).input_value()=='24'
        card.get_by_role('button',name='Save private draft',exact=True).click();page.get_by_role('status').get_by_text('Private draft saved.',exact=False).wait_for()
        assert card.locator('details').first.get_attribute('open') is not None;assert card.locator('.task-survey-preview .task-count').count()==17;assert card.get_by_label('Question 10',exact=True).input_value()=='Students frequently sleepy during class this week'
        page.on('dialog',lambda d:d.accept())
        card.get_by_role('button',name='Publish',exact=True).click();page.get_by_role('status').get_by_text('Published. Reports remain restricted',exact=False).wait_for()
        page.reload();card.get_by_role('button',name='Stop publication',exact=True).wait_for();assert page.get_by_label('Principal password',exact=True).count()==0
        print('PASS Principal persistent login, exact Task 1 private draft, assignment/header import, save and publication')
        release={'version':json.loads((ROOT/'public/app-version.json').read_text())['version']}
        staffctx=browser.new_context();staffctx.route('**/app-version.json',lambda route:route.fulfill(json=release));staffctx.route('https://www.gstatic.com/firebasejs/**',sdk);teacher=staffctx.new_page();teacher.on('pageerror',lambda e:errors.append(str(e)))
        teacher.goto(BASE+'cbse-task-manager.html#staff');teacher.get_by_label('Your existing staff identity',exact=True).select_option('X:one');teacher.get_by_label('Existing personal portal PIN',exact=True).fill('000');teacher.get_by_role('button',name='Verify PIN and open my tasks',exact=True).click();teacher.get_by_role('status').get_by_text('PIN does not match',exact=False).wait_for();assert teacher.locator('.task-card').count()==0
        assert teacher.get_by_label('Your existing staff identity',exact=True).locator('option[value="X:one"]').inner_text()=='Synthetic Teacher one'
        teacher.get_by_label('Existing personal portal PIN',exact=True).fill('123');teacher.get_by_role('button',name='Verify PIN and open my tasks',exact=True).click()
        teacher.get_by_role('heading',name='IX A',exact=True).wait_for();assert teacher.locator('.task-count').count()==17;assert teacher.get_by_label('Students frequently sleepy during class this week status',exact=True).count()==1;assert teacher.locator('.task-header').inner_text().count('Unprovided')==1;assert teacher.locator('.task-header input').count()==0
        teacher.get_by_label('Latest examination name / context (no student details)',exact=True).fill('Synthetic preboard')
        for name,value in [('passed','20'),('failed','4'),('ptms','40')]:
            row=teacher.locator('.task-count').filter(has=teacher.locator('[name='+name+']'));row.locator('select').select_option('known');row.locator('input').fill(value)
        teacher.get_by_label('Your existing personal PIN to submit / update',exact=True).fill('123');teacher.get_by_role('button',name='Submit class report',exact=True).click();teacher.get_by_role('status').get_by_text('IX A report saved.',exact=False).wait_for()
        assert teacher.locator('[name=examContext]').input_value()=='Synthetic preboard';assert teacher.locator('[name=submission-pin]').input_value()=='';assert teacher.locator('[name=classId]').input_value()=='IX A'
        teacher.locator('[name=passed]').fill('19');teacher.locator('[name=submission-pin]').fill('123');teacher.get_by_role('button',name='Update class report',exact=True).click();teacher.get_by_role('status').get_by_text('IX A report saved.',exact=False).wait_for()
        current=api({'action':'task-principal','operation':'read'})['tasks']['task1'];assert len(current['reports'])==1;assert current['summary']['totals']['passed']=={'total':19,'classes':['IX A'],'missing':[c for c in current['summary']['pending']]};assert current['summary']['totals']['firstGeneration']['total'] is None
        for width in [360,768,1440]:
            teacher.set_viewport_size({'width':width,'height':900});assert teacher.evaluate('document.documentElement.scrollWidth<=innerWidth')
        teacher.locator('[name=passed]').fill('18');release['version']='synthetic-new-release';teacher.evaluate("document.dispatchEvent(new Event('visibilitychange'))");teacher.locator('#portal-update-notice').wait_for();assert teacher.locator('[name=passed]').input_value()=='18';assert teacher.locator('#portal-update-notice button').is_disabled();release['version']=json.loads((ROOT/'public/app-version.json').read_text())['version'];
        print('PASS existing PIN verification, read-only/unprovided figures, aggregate report submission/update without duplicate classes and responsive layout')
        page.get_by_role('button',name='Refresh tasks',exact=True).click();card.get_by_role('button',name='Open report for IX A',exact=True).wait_for();assert card.locator('.task-totals').count()==1;assert card.locator('.task-survey-preview [name=passed]').input_value()=='19';card.get_by_role('button',name='Open report for IX A',exact=True).click();assert card.locator('[data-report-class="IX A"]').evaluate('(node)=>node.open');card.get_by_label('Principal comment (private, after results)',exact=True).fill('Synthetic private review');card.get_by_role('button',name='Save Principal comment',exact=True).click();page.get_by_role('status').get_by_text('Principal comment saved.',exact=True).wait_for()
        card.get_by_role('button',name='Stop publication',exact=True).click();page.get_by_role('status').get_by_text('Publication stopped.',exact=False).wait_for()
        current=api({'action':'task-principal','operation':'read'})['tasks']['task1'];assert not current.get('published');assert len(current['reports'])==1;assert current['comment']=='Synthetic private review'
        page.get_by_role('button',name='Sign out',exact=True).click();page.get_by_label('Principal password',exact=True).wait_for();assert page.locator('#task-task1').count()==0
        assert not errors,errors
        print('PASS Principal totals/comment, stop publication retains reports, and explicit logout clears protected DOM')
        browser.close()
finally:
    server.terminate();server.wait(timeout=10)
