"""Generated-site UI against the real task/PIN service with synthetic database/auth.
Run after npm run build. No real Firebase access or school records are used.
"""
import json, subprocess, urllib.request, base64, zipfile, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
BASE='http://127.0.0.1:8012/'
SAMPLE='These are synthetic class-level observations for testing the survey. Regular practice, accessible materials, guided revision, and coordinated support may improve participation. Teachers can review progress weekly, discuss general learning barriers, provide clear feedback, and adjust classroom activities. No student names, identifying family details, private health information, or real school records are included.'
OVERALL_FIRST='Synthetic class observation: irregular practice.\nSuggested support: guided revision. '+SAMPLE
OVERALL_UPDATED='Synthetic revised perspective: guided revision and regular practice. '+SAMPLE
WRITTEN='Synthetic counselling observation: guided practice is recommended.\nReview progress after two weeks. '+SAMPLE
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
        sign_in=page.get_by_role('button',name='Principal sign-in',exact=True)
        sign_in.wait_for();assert page.get_by_label('Principal password',exact=True).count()==0
        sign_in.click()
        page.get_by_label('Principal password',exact=True).fill('synthetic-password');page.get_by_role('button',name='Sign in here',exact=True).click()
        page.get_by_role('button',name='Create Task 1 unpublished draft',exact=True).click()
        card=page.locator('#task-task1');card.get_by_text('Unpublished — private to Principal',exact=True).wait_for()
        assert card.locator('.task-question-editor').count()==15;assert card.locator('[name=preview-class]').count()==0;assert card.locator('[name=preview-version]').count()==0;assert page.get_by_role('button',name='Staff view',exact=True).count()==0;assert page.get_by_role('button',name='Principal view',exact=True).count()==0;assert card.locator('.task-class-status').count()==18;assert card.locator('.task-totals').count()==0;assert not card.locator('.task-consolidation').evaluate('(node)=>node.open')
        for width in [360,768,1440]:
            page.set_viewport_size({'width':width,'height':950});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path='/tmp/task-manager-principal-layout.png',full_page=True)
        if not card.locator('.task-editor').evaluate('(node)=>node.open'):card.get_by_text('Edit task, survey questions and teacher assignments',exact=True).click()
        card.get_by_label('Task title',exact=True).wait_for(state='visible');assert card.get_by_label('Deadline (leave blank if not provided)',exact=True).input_value()==''
        assert card.get_by_label('Teacher for IX A',exact=True).locator('option[value="X:one"]').inner_text()=='Synthetic Teacher one'
        assert card.locator('[name=fixed-class]').count()==0;assert card.locator('.task-class-choices input:checked').count()==18;card.get_by_label('Apply task to VI A',exact=True).check();assert card.locator('[data-assignment-class="VI A"]').is_visible();card.get_by_label('Apply task to VI A',exact=True).uncheck();assert card.locator('[data-assignment-class="VI A"]').is_hidden();assert card.locator('.task-question-editor').count()==15;assert card.locator('.task-question-editor select').count()==0;assert card.locator('.task-final-comment').count()==1;assert card.get_by_label('Overall situation — comments by CT / Prime mentor / Survey IC',exact=True).is_disabled();assert card.get_by_label('Question 4',exact=True).input_value()=='Number of students who passed the latest examination';assert card.locator('.task-fixed-editor [data-fixed-question]').count()==3
        card.get_by_label('Question 12',exact=True).fill('Students frequently sleepy during class this week')
        card.get_by_role('button',name='Add survey question',exact=True).click();card.get_by_label('Question 19',exact=True).fill('Remarks / observations obtained from the Counselor, Special Educator, or Yoga Teacher')
        card.get_by_role('button',name='Add survey question',exact=True).click();card.get_by_label('Question 20',exact=True).fill('Temporary synthetic question');page.once('dialog',lambda dialog:dialog.accept());card.get_by_role('button',name='Delete Question 19',exact=True).click();assert card.locator('.task-question-editor').count()==16;assert card.get_by_label('Question 20',exact=True).count()==0;assert card.get_by_label('Question 19',exact=True).input_value()=='Temporary synthetic question';card.get_by_label('Question 19',exact=True).fill('Remarks / observations obtained from the Counselor, Special Educator, or Yoga Teacher')
        card.get_by_label('Teacher for IX A',exact=True).select_option('X:one')
        card.get_by_label('Teacher for XI E',exact=True).select_option('X:two')
        card.locator('[name=header-import]').set_input_files({'name':'synthetic-figures.json','mimeType':'application/json','buffer':json.dumps({'IX A':{'total':24,'catV':0,'st':None}}).encode()})
        page.get_by_role('status').get_by_text('Class figures saved',exact=False).wait_for()
        with page.expect_download() as download_info:card.get_by_role('link',name='Download class figures CSV template',exact=True).click()
        template=Path(download_info.value.path()).read_text();assert len(template.strip().splitlines())==19
        csv=template.replace('IX A,,,,','IX A,Synthetic Teacher one,24,0,').replace('XI E,,,,','XI E,Synthetic Teacher two,30,,')
        card.locator('[name=header-import]').set_input_files({'name':'synthetic-all-classes.csv','mimeType':'text/csv','buffer':csv.encode()})
        page.get_by_role('status').get_by_text('Class figures saved',exact=False).wait_for()
        assert card.get_by_label('Teacher for XI E',exact=True).input_value()=='X:two';assert card.get_by_label('Total students · XI E',exact=True).input_value()=='30'
        with urllib.request.urlopen(BASE+'synthetic-strength.xlsx') as response:workbook=response.read()
        with page.expect_file_chooser() as chooser_info:card.get_by_role('button',name='Import and save class figures',exact=True).click()
        chooser_info.value.set_files({'name':'synthetic-strength.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':workbook})
        page.get_by_role('status').get_by_text('Class figures saved',exact=False).wait_for()
        assert card.get_by_label('Teacher for XI E',exact=True).input_value()=='X:two';assert card.get_by_label('Total students · XII E',exact=True).input_value()=='24';assert card.locator('.task-fixed-editor [data-figure-class="IX A"] [data-figure-field=total]').inner_text()=='24';assert card.locator('.task-fixed-editor [data-figure-class="IX A"] [data-figure-field=catV]').inner_text()=='0';assert api({'action':'task-principal','operation':'read'})['tasks']['task1']['draft']['headers']['XII E']['total']==24;assert api({'action':'task-principal','operation':'read'})['classFigures']['XII E']['total']==24
        card.get_by_role('button',name='Save private draft',exact=True).click();page.get_by_role('status').get_by_text('Private draft saved.',exact=False).wait_for()
        assert card.locator('.task-editor').get_attribute('open') is not None;assert card.locator('.task-question-editor').count()==16;assert card.get_by_label('Question 12',exact=True).input_value()=='Students frequently sleepy during class this week'
        page.on('dialog',lambda d:d.accept())
        card.get_by_role('button',name='Save and publish task',exact=True).click();page.get_by_role('status').get_by_text('Published. Reports remain restricted',exact=False).wait_for()
        page.reload();page.get_by_role('row').filter(has_text='Vidyalaya Level Confidential Survey').get_by_role('button').click();card.get_by_role('button',name='Stop publication',exact=True).wait_for();assert card.evaluate("card=>Boolean(card.querySelector('.task-results').compareDocumentPosition(card.querySelector('.task-editor'))&Node.DOCUMENT_POSITION_FOLLOWING)");assert card.get_by_role('button',name='View submission status',exact=True).count()==1;assert page.get_by_label('Principal password',exact=True).count()==0
        print('PASS Principal persistent login, exact Task 1 private draft, assignment/header import, save and publication')
        freeze_page=ctx.new_page()
        scopes=[{'classId':'X','section':'A','subject':'English','maximum':80,'approvedAt':1},
                {'classId':'X','section':'B','subject':'Science','maximum':80},
                {'classId':'XII','section':'A','subject':'Chemistry','maximum':70},
                {'classId':'XII','section':'B','subject':'Physics','maximum':70}]
        for scope in scopes:
            scope['paperName']=scope['subject']
            scope['date']='2026-11-12'
        marks=[{'scope':0,'current':{'maximum':80,'score':0}},{'scope':1,'current':None},
               {'scope':2,'current':{'maximum':70,'score':None,'absent':True}},{'scope':3,'current':{'maximum':80,'score':30}}]
        for row in marks:
            row.update(name='Synthetic Student',roll='001')
        hq={'updated':'23/11/2026 13:07:32 IST','groups':[{
            'classId':'X','stream':'','subject':'English','total':[1,1,0,0,1,0,0,0,0,0,0,0],
            'sections':[{'section':'XA','paper':'English','frozen':True,'counts':[1,1,0,0,1,0,0,0,0,0,0,0]}]
        }]}
        def freeze_report_api(route):
            if route.request.post_data_json.get('operation')=='pb1-read':
                route.fulfill(json={'scopes':scopes,'rows':marks,'hqVerification':hq})
            else:route.continue_()
        freeze_page.route('**/api/staff-access',freeze_report_api)
        freeze_page.goto(BASE+'cbse-task-manager.html#principal')
        freeze_page.get_by_role('button',name='PB-1 Marks and Freeze Report',exact=True).click()
        class_x=freeze_page.get_by_role('region',name='Class X PB-1 papers',exact=True)
        class_x.get_by_role('cell',name='Frozen',exact=True).wait_for()
        class_x.get_by_role('cell',name='Marks pending · 1 missing',exact=True).wait_for()
        class_xii=freeze_page.get_by_role('region',name='Class XII PB-1 papers',exact=True)
        class_xii.get_by_role('cell',name='Filled · awaiting freeze',exact=True).wait_for()
        class_xii.get_by_role('cell',name='Paper maximum needs correction',exact=True).wait_for()
        freeze_page.get_by_label('Paper status',exact=True).select_option('Frozen')
        assert class_x.get_by_role('cell',name='Frozen',exact=True).is_visible()
        assert class_x.get_by_role('cell',name='Marks pending · 1 missing',exact=True).count()==0
        with freeze_page.expect_download() as freeze_pdf:
            freeze_page.get_by_role('button',name='Download PDF',exact=True).click()
        report=freeze_pdf.value
        assert report.suggested_filename=='PB-1-Marks-and-Freeze-Report.pdf'
        text=subprocess.check_output(['pdftotext',str(report.path()),'-'],text=True)
        assert 'Class XII' in text and 'XA' in text and 'English' in text and 'Frozen' in text
        assert 'Science' not in text and 'Chemistry' not in text
        with freeze_page.expect_download() as hq_excel:
            freeze_page.get_by_role('button',name='Download HQ marks Excel',exact=True).click()
        download=hq_excel.value
        assert download.suggested_filename=='PB-1-HQ-Written-Marks-X-XII.xlsx'
        with zipfile.ZipFile(download.path()) as workbook:
            strings=workbook.read('xl/sharedStrings.xml').decode()
            assert all(value in strings for value in ['Synthetic Student','Pending','Absent','Check paper maximum','12/11/2026'])
            assert '<c r="I2"><v>0</v></c>' in workbook.read('xl/worksheets/sheet2.xml').decode()
        with freeze_page.expect_download() as verification_pdf:
            freeze_page.get_by_role('button',name='HQ/RO Analysis Verification PDF',exact=True).click()
        full_pdf=subprocess.check_output(['pdftotext',str(verification_pdf.value.path()),'-'],text=True)
        assert all(value in full_pdf for value in ['HQ/RO Analysis Verification','XA / English','subject total','Subject teacher signature','Consolidated result'])
        class_x.get_by_role('button',name='Open paper · Class X A · English',exact=True).click()
        with freeze_page.expect_download() as paper_pdf:
            freeze_page.get_by_role('button',name='HQ/RO Analysis Verification PDF',exact=True).click()
        assert paper_pdf.value.suggested_filename=='HQ-RO-Analysis-Verification-XA-English.pdf'
        freeze_page.unroute('**/api/staff-access',freeze_report_api)
        def advisory_api(route):
            if route.request.post_data_json.get('operation')!='portfolio-read':
                route.continue_();return
            route.fulfill(json={'updated':'23/11/2026 15:00:33 IST',
                'teachers':{'t':{'name':'Synthetic Advisory Teacher','designation':'TGT English'}},
                'students':[{'key':name,'name':name,'section':'XA','remedialCount':2,'mcq':[{}],
                    'issues':[{'issues':'CT reading concern'}],
                    'subjects':[{'key':'case-'+name,'subject':'English','teacher':'Synthetic Advisory Teacher',
                        'teacherKeys':['t'],'score':20,'maximum':80,'remedialCount':1,'mcqCount':1,
                        'evidence':[],'actions':[{'taken':'Practice worksheet completed','plan':'Review weekly'}],
                        'advisory':{'instructions':'1. Carefully study the attached assessment report.\nRead with the student.',
                                    'additional':'Weekly reading review for '+name}}]}
                    for name in ['Synthetic Advisory Student One','Synthetic Advisory Student Two']]})
        freeze_page.route('**/api/staff-access',advisory_api)
        freeze_page.reload()
        freeze_page.get_by_role('button',name='Task 5 · Student Support Portfolio',exact=True).click()
        freeze_page.get_by_label('Advisory letter for',exact=True).select_option('t')
        with freeze_page.expect_download() as letter_download:
            freeze_page.get_by_role('button',name='Download advisory PDF',exact=True).click()
        assert letter_download.value.suggested_filename=='Preventive-Advisory-Letter.pdf'
        letter=subprocess.check_output(['pdftotext',str(letter_download.value.path()),'-'],text=True)
        assert all(value in letter for value in ['PM SHRI Kendriya Vidyalaya No. 1 Itanagar','To the Subject Teacher',
            'Synthetic Advisory Student One','Synthetic Advisory Student Two','2 verified remedial classes attended','Page 1 of'])
        assert letter.count('Conduct retests on time')==1 and 'Synthetic Advisory Teacher' not in letter
        assert letter.count('Carefully study the attached assessment report')==1
        assert all(text in letter for text in ['Student-wise teacher response','CT reading concern',
            'Practice worksheet completed','Review weekly','Subject teacher signature'])
        assert letter.index('Student-wise teacher response')<letter.index('Subject teacher signature')
        assert all('Weekly reading review for Synthetic Advisory Student '+name in letter for name in ['One','Two'])
        freeze_page.close()
        release={'version':json.loads((ROOT/'public/app-version.json').read_text())['version']}
        staffctx=browser.new_context();staffctx.route('**/app-version.json',lambda route:route.fulfill(json=release));staffctx.route('https://www.gstatic.com/firebasejs/**',sdk);teacher=staffctx.new_page();teacher.on('pageerror',lambda e:errors.append(str(e)))
        api({'action':'task-principal','operation':'monitoring-publish','expectedRevision':0})
        teacher.goto(BASE+'cbse-task-manager.html#staff')
        strips=teacher.locator('.task-stage-strip')
        strips.last.wait_for()
        assert strips.count()==4
        assert teacher.get_by_text('HQ Survey',exact=True).count()==0
        assert strips.nth(1).inner_text().splitlines()[:2]==['Task 3','Class IX Pre-Annual Exam']
        assert 'Running' in strips.nth(1).inner_text()
        assert teacher.locator('.task-public-list').count()==0
        assert teacher.locator('button.task-stage-strip').count()==4
        for width in [320,390,768,1440]:
            teacher.set_viewport_size({'width':width,'height':900})
            assert teacher.evaluate('document.documentElement.scrollWidth<=innerWidth')
        def portfolio_api(route):
            payload=route.request.post_data_json
            if payload.get('operation')=='portfolio-directory':
                route.fulfill(json={'teachers':[{'id':'X:one','name':'Synthetic Teacher one'}]})
            elif payload.get('taskOperation') in ('portfolio-read','portfolio-save'):
                saved=payload['taskOperation']=='portfolio-save'
                assert payload['pin']=='123' and payload['staffId']=='X:one'
                if saved:assert payload['caseKey']=='case-one' and payload['taken']=='Practice completed' and 'issues' not in payload
                photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGNUrYxnoCVgoqnpoxaMWjBqwagFoxaMWjBqwagFoxaMWjBqARUBAIpPAT1/hp27AAAAAElFTkSuQmCC'
                route.fulfill(json={'updated':'23/11/2026 15:00:33 IST',
                    'teachers':{'X:one':{'name':'Synthetic Teacher one','designation':'TGT English','photo':photo}},'students':[{
                    'key':'one','name':'Synthetic Student','roll':'1','section':'XA','photo':photo,'subjects':[{
                        'key':'case-one','subject':'English','teacher':'Synthetic Teacher one','teacherKeys':['X:one'],'canRecordPlan':True,'score':20,'maximum':80,
                        'evidence':[{'source':'Verified remedial attendance','date':'2026-11-23','detail':'Reading practice'}],
                        'actions':[{'taken':'Practice completed','at':1795420000000,'teacher':'Synthetic Teacher one'}] if saved else []
                    }]
                }]})
            else:route.continue_()
        teacher.route('**/api/staff-access',portfolio_api)
        strips.nth(3).click()
        teacher.get_by_label('Select your name',exact=True).select_option('X:one')
        teacher.get_by_label('Personal PIN',exact=True).fill('123')
        teacher.get_by_role('button',name='Open assigned portfolios',exact=True).click()
        teacher.get_by_role('button',name='Class XII · 0',exact=True).click()
        teacher.get_by_text('No matching students',exact=True).wait_for()
        teacher.get_by_role('button',name='Class X · 1',exact=True).click()
        teacher.get_by_role('button',name='Synthetic Student',exact=True).click()
        teacher.get_by_text('Reading practice',exact=False).wait_for()
        teacher.get_by_text('TGT English',exact=True).wait_for()
        assert teacher.get_by_role('button',name='Synthetic Student',exact=True).locator('img').count()==1
        assert teacher.locator('.portfolio-teacher-profile img').count()==1
        teacher.get_by_text('English · PB-1 20/80',exact=True).wait_for()
        assert teacher.get_by_text('MCQ participation',exact=False).count()==0
        assert teacher.get_by_text('Awaiting teacher update.',exact=True).count()==0
        assert teacher.get_by_label('Brief issues about the student',exact=True).count()==0
        teacher.get_by_label('Efforts made so far',exact=True).fill('Practice completed')
        teacher.get_by_label('Personal PIN to save',exact=True).fill('123')
        teacher.get_by_role('button',name='Save portfolio update',exact=True).click()
        teacher.get_by_text('Efforts made so far · Practice completed',exact=True).wait_for()
        teacher.get_by_role('button',name='Back to task list',exact=True).click()
        teacher.unroute('**/api/staff-access',portfolio_api)
        strips.nth(2).click()
        teacher.get_by_text('The retest list is awaiting publication.',exact=True).wait_for()
        teacher.get_by_role('button',name='Back to task list',exact=True).click()
        retest=ctx.new_page()
        retest.goto(BASE+'cbse-task-manager.html#principal')
        retest.get_by_role('button',name='Open Task 4 — PB-1 / HE Absentees Retest on Medical Ground',exact=True).click()
        retest_csv=('Name,Class with section,Roll number,Subject,Exam date,Subject teacher,Class teacher\n'
                    'Synthetic retest student,X D,10423,Maths Basic,2026-11-16,Synthetic Teacher one,Synthetic Teacher two\n')
        retest.get_by_label('Task 4 absentee CSV',exact=True).set_input_files({
            'name':'synthetic-retest.csv','mimeType':'text/csv','buffer':retest_csv.encode()})
        retest.get_by_role('button',name='Import Task 4 CSV',exact=True).click()
        retest.get_by_role('cell',name='Synthetic retest student',exact=True).wait_for()
        retest.get_by_role('button',name='Edit retest details',exact=True).click()
        retest.get_by_label('Synthetic retest student · Maths Basic · Retest date planned',exact=True).fill('2026-11-25')
        retest.get_by_role('button',name='Save retest details',exact=True).click()
        retest.get_by_role('cell',name='25/11/2026',exact=True).wait_for()
        retest.get_by_role('button',name='Publish to staff',exact=True).click()
        retest.get_by_text('Published to staff',exact=True).wait_for()
        retest.close()
        retest_ctx=browser.new_context()
        retest_ctx.route('https://www.gstatic.com/firebasejs/**',sdk)
        retest_staff=retest_ctx.new_page()
        retest_staff.goto(BASE+'cbse-task-manager.html#staff')
        retest_staff.get_by_role('button',name=re.compile(r'Task 4')).click()
        retest_staff.get_by_label('Staff viewing password',exact=True).fill('synthetic-view')
        retest_staff.get_by_role('button',name='Open retest tracker',exact=True).click()
        remark_button=retest_staff.get_by_role('button',name='Add remark / update for Synthetic retest student · Maths Basic',exact=True)
        assert remark_button.inner_text()=='Add remark / update'
        retest_staff.locator('.task-retest-teacher-table td').first.evaluate("(cell)=>{cell.closest('.task-exam-table-scroll').scrollLeft=400}")
        assert retest_staff.locator('.task-retest-teacher-table td').first.evaluate("(cell)=>getComputedStyle(cell).position")=='sticky'
        remark_button.click()
        progress=retest_staff.get_by_role('dialog',name='Update retest progress')
        progress.get_by_label('Retest step',exact=True).select_option('retestDate')
        progress.get_by_label('Select your name',exact=True).select_option('X:two')
        progress.get_by_label('Retest date planned',exact=True).fill('2026-11-26')
        progress.get_by_label('Retest date planned comment',exact=True).fill('Synthetic room confirmation')
        progress.get_by_label('Personal PIN',exact=True).fill('456')
        progress.get_by_role('button',name='Save progress',exact=True).click()
        retest_staff.get_by_text('Synthetic room confirmation',exact=True).wait_for()
        retest_staff.locator('td').filter(has_text='26/11/2026').wait_for()
        with retest_staff.expect_download() as task4_pdf:
            retest_staff.get_by_role('button',name='Download PDF',exact=True).click()
        download=task4_pdf.value
        assert download.suggested_filename=='Task-4-Retest-Tracker.pdf'
        pdf=Path(download.path())
        assert pdf.read_bytes().startswith(b'%PDF-')
        text=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True)
        assert 'High alert' in text and '26/11/2026' in text and 'Synthetic room' in text
        assert 'Add remark' not in text
        retest_ctx.close()
        strips.nth(1).click()
        teacher.get_by_role('cell',name='07/12/2026',exact=True).wait_for()
        teacher.get_by_role('cell',name='9321–9340',exact=True).wait_for()
        assert teacher.get_by_text('Room to be assigned',exact=True).count()==10
        assert teacher.locator('.task-exam-table').count()==3
        qp_math=teacher.locator('.task-exam-step').filter(has=teacher.get_by_role('heading',name='Question paper submission',exact=True)).get_by_role('row').filter(has_text='Mathematics')
        assert qp_math.locator('li').all_text_contents()==['IX A/C · Priyanka Mehta','IX B · Ranjan Chetry','IX D · Mr. Bikash Jyoti Das']
        assert teacher.get_by_role('columnheader',name='Instructions from Exam Department',exact=True).count()==1
        assert teacher.get_by_role('button',name='Edit QP assignments',exact=True).count()==0
        assignment_page=ctx.new_page()
        assignment_page.goto(BASE+'cbse-task-manager.html#principal')
        assignment_page.get_by_role('button',name='Open Task 3 — Class IX Pre-Annual Exam',exact=True).click()
        assignment_page.get_by_role('button',name='Edit QP assignments',exact=True).click()
        assert assignment_page.get_by_label('Science · Instructions from Exam Department',exact=True).count()==0
        assignment_page.get_by_label('Science · Exam / Principal',exact=True).fill('Synthetic assignment')
        assignment_page.get_by_role('button',name='Save QP assignments',exact=True).click()
        assignment_page.get_by_role('cell',name='Synthetic assignment',exact=True).wait_for()
        assignment_page.get_by_role('button',name='Import roster / open analyser',exact=True).click()
        assignment_page.get_by_text('Import Class IX roster and PT-2 marks',exact=True).click()
        csv=('Section,RollNo,StudentName,Subject,PreviousMarks,PreviousMM,PreAnnualMM,Teacher\n'
             'A,1,Synthetic IX student,Science,8,40,80,X:one\n'
             'A,1,Synthetic IX student,English,14,40,80,X:one\n'
             'B,1,Synthetic pending student,Hindi,29,40,80,Synthetic Unmatched Teacher\n')
        assignment_page.get_by_label('Class IX roster and PT-2 marks CSV',exact=True).set_input_files({
            'name':'synthetic-class-ix.csv','mimeType':'text/csv','buffer':csv.encode()})
        assignment_page.once('dialog',lambda dialog:dialog.accept())
        assignment_page.get_by_role('button',name='Import Class IX CSV',exact=True).click()
        assignment_page.get_by_role('heading',name='Subject-wise results by class section',exact=True).wait_for()
        assert assignment_page.get_by_role('columnheader',name='PT-2 average',exact=True).count()==0
        assignment_page.get_by_role('button',name='1 · PT-2 Failed · IX A · SCIENCE',exact=True).click()
        failed=assignment_page.get_by_role('dialog',name='PT-2 Failed · IX A · SCIENCE')
        failed.get_by_text('Synthetic IX student',exact=True).wait_for()
        failed.get_by_role('button',name='Close',exact=True).click()
        assignment_page.get_by_role('button',name='1 · PT-2 Passed · IX B · HINDI',exact=True).click()
        passed=assignment_page.get_by_role('dialog',name='PT-2 Passed · IX B · HINDI')
        passed.get_by_text('Synthetic pending student',exact=True).wait_for()
        passed.get_by_role('button',name='Close',exact=True).click()
        assignment_page.get_by_text('Teacher-wise results by subject',exact=True).first.click()
        assignment_page.get_by_role('heading',name='Teacher-wise results by subject',exact=True).wait_for()
        assert assignment_page.get_by_label('Search student results',exact=True).is_hidden()
        assignment_page.get_by_text('View student-by-student results',exact=True).click()
        assignment_page.get_by_label('Search student results',exact=True).wait_for()
        assignment_page.get_by_text('Synthetic Unmatched Teacher (PIN assignment pending) · IX · HINDI',exact=True).wait_for()
        assignment_page.get_by_text('Pre-Annual marks pending.',exact=True).wait_for()
        assignment_page.close()
        teacher.get_by_role('button',name='Open Wisdom Analyser',exact=True).click()
        teacher.get_by_role('heading',name='Subject-wise results by class section',exact=True).wait_for()
        teacher.get_by_text('Pre-Annual marks pending.',exact=True).wait_for()
        assert teacher.get_by_text('Synthetic IX student',exact=True).count()==0
        teacher.get_by_role('button',name='1 · PT-2 Failed · IX A · SCIENCE',exact=True).click()
        coded=teacher.get_by_role('dialog',name='PT-2 Failed · IX A · SCIENCE')
        coded.locator('.pb1-compact-marks li').first.wait_for()
        assert coded.get_by_text('Synthetic IX student',exact=True).count()==0
        assert 'Student ' in coded.locator('.pb1-compact-marks li').first.inner_text()
        coded.get_by_role('button',name='Close',exact=True).click()
        assert teacher.get_by_label('Personal PIN',exact=True).count()==0
        teacher.get_by_role('button',name='Update Pre-Annual marks',exact=True).click()
        teacher.get_by_label('Evaluator or cross-checker',exact=True).select_option('X:one')
        teacher.get_by_label('Personal PIN',exact=True).fill('123')
        teacher.get_by_role('button',name='Open marks entry',exact=True).click()
        teacher.get_by_label('Class / section and subject',exact=True).select_option(label='A · SCIENCE')
        teacher.get_by_label('Pre-Annual marks for Synthetic IX student',exact=True).fill('30')
        teacher.get_by_label('Personal PIN to save',exact=True).fill('123')
        teacher.get_by_role('button',name='Save Pre-Annual marks',exact=True).click()
        teacher.get_by_text('Marks saved successfully.',exact=True).wait_for()
        teacher.get_by_role('button',name='Back to Task 3',exact=True).click()
        teacher.get_by_role('button',name='Open weekly remedial action',exact=True).click()
        teacher.get_by_text('1 student needs support.',exact=False).wait_for()
        teacher.get_by_text('View student-wise overview',exact=True).click()
        teacher.get_by_text(re.compile(r'(?=.*SCIENCE · Borderline)(?=.*ENGLISH · Borderline)')).first.wait_for()
        science=teacher.locator('section.task-report').filter(has=teacher.get_by_role('heading',name='SCIENCE',exact=True))
        science.get_by_text('Borderline · 1',exact=True).click()
        science.get_by_text('Pre-Annual · 30/80',exact=True).wait_for()
        assert science.get_by_text('Critical fail · 0',exact=True).is_visible()
        english=teacher.locator('section.task-report').filter(has=teacher.get_by_role('heading',name='ENGLISH',exact=True))
        english.get_by_text('Borderline · 1',exact=True).click()
        english.get_by_text('PT-2 · Provisional · 14/40',exact=True).wait_for()
        teacher.get_by_label('Subject',exact=True).select_option('SCIENCE')
        teacher.get_by_label('Section',exact=True).select_option('B')
        teacher.get_by_text('0 students need support.',exact=False).wait_for()
        teacher.get_by_label('Section',exact=True).select_option('A')
        teacher.get_by_label('Teacher',exact=True).select_option(label='Synthetic Teacher one')
        teacher.get_by_text('1 student needs support.',exact=False).wait_for()
        assert english.count()==0
        science.get_by_text('Borderline · 1',exact=True).click()
        assert science.get_by_label('Personal PIN',exact=True).is_hidden()
        assert teacher.get_by_text('Synthetic IX student',exact=True).count()==0
        assert science.get_by_role('heading',name=re.compile(r'IX A · Student [0-9A-F]{10}')).is_visible()
        teacher.get_by_role('button',name='Show student names',exact=True).click()
        named=teacher.get_by_role('dialog',name='Show student names')
        named.get_by_label('Staff viewing password',exact=True).fill('synthetic-view')
        named.get_by_role('button',name='Show names',exact=True).click()
        science.get_by_text('Borderline · 1',exact=True).click()
        science.get_by_role('heading',name='IX A · Roll 9101 · Synthetic IX student',exact=True).wait_for()
        assert teacher.get_by_label('Subject',exact=True).input_value()=='SCIENCE'
        science.get_by_text('Action taken report',exact=True).click()
        science.get_by_label('Select your name',exact=True).select_option('X:one')
        science.get_by_label('Weekly action taken for Synthetic IX student · SCIENCE',exact=True).fill('Reteach one concept and reassess on Friday.')
        science.get_by_label('Personal PIN',exact=True).fill('123')
        science.get_by_role('button',name='Save weekly action',exact=True).click()
        teacher.get_by_text('Weekly action saved.',exact=True).wait_for()
        science.get_by_text('Action recorded for this week',exact=True).wait_for()
        teacher.get_by_role('button',name='Back to Task 3',exact=True).click()
        teacher.get_by_role('button',name='Back to task list',exact=True).click()
        strips.nth(0).click()
        teacher.get_by_role('button',name='Open Wisdom Analyser',exact=True).wait_for()
        teacher.get_by_role('button',name='Open XI Half-Yearly Analyser',exact=True).wait_for()
        xi=api({'action':'task-principal','operation':'half-yearly-import','exam':'half-yearly','expectedRevision':0,
                'csv':'Section,RollNo,StudentName,Subject,PreviousMarks,PreviousMM,HalfYearlyMM,Teacher\nB,1,Synthetic XI student,English,25,40,80,X:one\n'})
        paper=xi['scopes'][0]
        api({'action':'task-principal','operation':'pb1-save','exam':'half-yearly','expectedRevision':xi['revision'],
             **{key:paper[key] for key in ['classId','sectionId','subjectId']},'entries':[{'key':xi['rows'][0]['key'],'mark':50}]})
        xi_ctx=browser.new_context()
        xi_ctx.route('https://www.gstatic.com/firebasejs/**',sdk)
        xi_page=xi_ctx.new_page()
        xi_page.goto(BASE+'cbse-task-manager.html#staff')
        xi_page.get_by_role('button',name=re.compile('Task 2')).click()
        xi_page.get_by_role('button',name='Open XI Half-Yearly Analyser',exact=True).click()
        xi_page.get_by_text('Freeze status · Ready to freeze',exact=True).wait_for()
        xi_page.get_by_role('button',name='Principal review / freeze / print',exact=True).click()
        xi_login=xi_page.get_by_role('dialog',name='Principal review, freeze and print')
        xi_login.get_by_label('Principal password',exact=True).fill('synthetic-password')
        xi_login.get_by_role('button',name='Sign in here',exact=True).click()
        xi_page.get_by_role('heading',name='Class XI B · ENGLISH',exact=True).wait_for()
        xi_page.get_by_role('button',name='Freeze marks after Principal discussion',exact=True).click()
        xi_page.get_by_role('button',name='Confirm and freeze marks',exact=True).click()
        xi_page.get_by_text('Approved and frozen ·',exact=False).wait_for()
        xi_page.get_by_role('button',name='Preview marks slip / PDF',exact=True).click()
        xi_page.get_by_role('button',name='Print / Save as PDF',exact=True).wait_for()
        xi_ctx.close()
        staffctx.clear_cookies(name='mission_staff_view')
        teacher.get_by_role('button',name='Open Pre-Samagam Evaluation Monitoring',exact=True).click()
        teacher.get_by_label('Staff viewing password',exact=True).fill('synthetic-view')
        teacher.get_by_role('button',name='Open published plan',exact=True).click()
        teacher.get_by_label('Search by name',exact=True).wait_for()
        teacher.get_by_role('button',name='Back to Task 2',exact=True).click()
        teacher.get_by_role('button',name='Back to task list',exact=True).click()
        strips.last.wait_for()

        report_page=ctx.new_page()
        report_page.goto(BASE+'cbse-task-manager.html#principal')
        report_page.get_by_role('button',name='Open Task 2 — Pre-Samagam Evaluation Monitoring',exact=True).click()
        report_page.get_by_role('button',name='Task status report / PDF',exact=True).click()
        report=report_page.get_by_role('dialog',name='Task 2 status report')
        report.get_by_role('cell',name='Class 10-B · Maths Basic & Standard',exact=True).wait_for()
        math=report.get_by_role('row').filter(has_text='Class 10-B · Maths Basic & Standard')
        assert math.get_by_role('cell').first.inner_text()=='16/11/2026'
        assert 'Basic · Step 1' in math.inner_text() and 'Standard · Step 1' in math.inner_text()
        report_page.close()
        print('PASS Teacher task strips, mobile layout, Task 2 workflow and grouped report')

        # Exercise the generic survey UI with the same synthetic survey data under an active task ID.
        staffctx.set_extra_http_headers({'X-Synthetic-Active-Survey':'1'})
        teacher.reload();teacher.locator('[data-task-class="IX A"]').wait_for();assert teacher.locator('.task-public-list tbody tr').count()==18;assert teacher.locator('.task-urgent-heading .task-alarm-icon').inner_text()=='🚨';assert teacher.locator('.task-importance-label').text_content()=='Most urgent task · Handle with care';assert teacher.locator('.task-count').count()==0;assert teacher.locator('[name=teacher-remarks]').count()==0;assert teacher.locator('[name=curtain]').count()==0
        for width in [320,360,390,768,1440]:
            teacher.set_viewport_size({'width':width,'height':900});assert teacher.evaluate('document.documentElement.scrollWidth<=innerWidth'),teacher.evaluate("({w:innerWidth,s:document.documentElement.scrollWidth,x:scrollX,b:document.body.scrollWidth,items:[...document.querySelectorAll('body *')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>[e.tagName,e.className,e.scrollWidth,e.clientWidth,e.getBoundingClientRect().right]).slice(0,16)})")
        teacher.set_viewport_size({'width':390,'height':844});teacher.screenshot(path='/tmp/task-manager-public-mobile.png',full_page=False)
        teacher.locator('[data-task-class="IX A"]').get_by_role('button',name='Start & Submit Now',exact=True).click();teacher.locator('[name=start-pin]').fill('000');teacher.get_by_role('button',name='Verify PIN and open survey',exact=True).click();teacher.locator('dialog [role=alert]').get_by_text('PIN does not match',exact=False).wait_for();assert teacher.locator('.task-count').count()==0
        teacher.locator('[name=start-pin]').fill('123');teacher.get_by_role('button',name='Verify PIN and open survey',exact=True).click()
        teacher.get_by_role('heading',name='IX A',exact=True).wait_for();teacher.screenshot(path='/tmp/task-manager-survey-mobile.png',full_page=False);assert teacher.locator('.task-form-heading .task-urgent-heading').count()==1;assert teacher.locator('.task-count').count()==15;assert teacher.locator('.task-count select').count()==0;assert teacher.locator('.task-count label').first.inner_text().startswith('Q4. First-generation learners');assert teacher.locator('[data-fixed-question=total]').inner_text().startswith('Q1 · View only');assert teacher.locator('.task-header').inner_text().count('Unprovided')==1;assert teacher.locator('.task-header input').count()==0
        assert teacher.locator('[name=examContext]').count()==0;assert teacher.locator('input[placeholder=Unconfirmed]').count()==0;assert teacher.locator('.task-written-answer textarea').count()==1;teacher.locator('.task-written-answer textarea').fill('Too short');assert not teacher.locator('.task-written-answer textarea').evaluate('(input)=>input.checkValidity()');teacher.locator('.task-written-answer textarea').fill(WRITTEN);assert teacher.locator('.task-written-answer textarea').evaluate('(input)=>input.checkValidity()');assert '50–100 words' in teacher.locator('.task-written-answer .task-word-count').inner_text()
        for name,value in [('ptms','40')]:
            row=teacher.locator('.task-count').filter(has=teacher.locator('[name='+name+']'));row.locator('input').fill(value)
        assert teacher.get_by_label('Overall situation — comments by CT / Prime mentor / Survey IC (optional)',exact=True).is_editable();assert teacher.locator('form').last.evaluate("form=>[...form.querySelectorAll('textarea')].at(-1).name==='teacher-remarks'");teacher.locator('[name=teacher-remarks]').fill(OVERALL_FIRST)
        teacher.get_by_label('Your existing personal PIN to submit / update',exact=True).fill('456');teacher.get_by_role('button',name='Submit class report',exact=True).click();teacher.locator('.task-save-confirmation').get_by_text('PIN does not match',exact=False).wait_for();assert teacher.locator('[name=teacher-remarks]').input_value().startswith('Synthetic class observation')
        teacher.get_by_label('Your existing personal PIN to submit / update',exact=True).fill('123');teacher.get_by_role('button',name='Submit class report',exact=True).click();teacher.get_by_role('status').get_by_text('IX A report saved.',exact=False).wait_for()
        assert teacher.locator('[name=teacher-remarks]').input_value()==OVERALL_FIRST;assert teacher.locator('[name=examContext]').count()==0;assert teacher.locator('[name=submission-pin]').input_value()=='';assert teacher.locator('.task-save-confirmation').inner_text()=='Submission confirmed. Your class report and remarks are saved.';assert teacher.locator('.task-submission-page').count()==1;assert teacher.locator('.task-form-heading').inner_text().startswith('← Back to task list\nIX A')
        teacher.locator('[name=teacher-remarks]').fill(OVERALL_UPDATED);assert teacher.locator('[name=passed],[name=failed]').count()==0;teacher.locator('[name=submission-pin]').fill('123');teacher.get_by_role('button',name='Update class report',exact=True).click();teacher.get_by_role('status').get_by_text('IX A report saved.',exact=False).wait_for()
        current=api({'action':'task-principal','operation':'read'})['tasks']['task1'];assert len(current['reports'])==1;assert current['reports']['IX A']['values']['remarks']==OVERALL_UPDATED;assert current['summary']['totals']['passed']=={'total':None,'classes':[],'missing':current['summary']['selectedClasses']};assert current['summary']['totals']['firstGeneration']['total'] is None
        written=current['draft']['questions'][-1]['id'];assert current['reports']['IX A']['values'][written]==WRITTEN;assert written not in current['summary']['totals']
        public=api({'action':'task-read'},token='');assert public['tasks']['task1']['rows'][0]['status']=='Submitted';assert 'Synthetic preboard' not in json.dumps(public);assert 'Synthetic revised perspective' not in json.dumps(public);assert 'Synthetic counselling observation' not in json.dumps(public)
        for width in [320,360,390,768,1440]:
            teacher.set_viewport_size({'width':width,'height':900});assert teacher.evaluate('document.documentElement.scrollWidth<=innerWidth'),teacher.evaluate("({w:innerWidth,s:document.documentElement.scrollWidth,x:scrollX,b:document.body.scrollWidth,items:[...document.querySelectorAll('body *')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>[e.tagName,e.className,e.scrollWidth,e.clientWidth,e.getBoundingClientRect().right]).slice(0,16)})")
        teacher.locator('[name=outsideMeals]').fill('18');release['version']='synthetic-new-release';teacher.evaluate("document.dispatchEvent(new Event('visibilitychange'))");teacher.locator('#portal-update-notice').wait_for();assert teacher.locator('[name=outsideMeals]').input_value()=='18';assert teacher.locator('#portal-update-notice button').is_disabled();release['version']=json.loads((ROOT/'public/app-version.json').read_text())['version'];
        print('PASS existing PIN verification, read-only/unprovided figures, aggregate report submission/update without duplicate classes and responsive layout')
        page.get_by_role('button',name='Refresh tasks',exact=True).click();card.get_by_role('button',name='Open report for IX A',exact=True).wait_for();assert card.locator('.task-totals').count()==1;card.get_by_role('button',name='Open report for IX A',exact=True).click();assert card.locator('[data-report-class="IX A"]').evaluate('(node)=>node.open');assert card.locator('[data-report-class="IX A"] .task-teacher-remarks').inner_text()==OVERALL_UPDATED;assert 'Synthetic counselling observation' in card.locator('[data-report-class="IX A"]').inner_text();assert card.locator('.task-final-comment textarea').is_disabled();card.get_by_label('Principal comment (private, after results)',exact=True).fill('Synthetic private review');card.get_by_role('button',name='Save Principal comment',exact=True).click();page.get_by_role('status').get_by_text('Principal comment saved.',exact=True).wait_for()
        report=card.locator('[data-report-class="IX A"]');report.locator('summary').first.click() if not report.evaluate('(node)=>node.open') else None
        assert report.locator('.task-report-answer dt').all_text_contents()[:3]==['Q1. Total students · View only','Q2. Cat-V students · View only','Q3. Total ST students · View only']
        assert report.locator('.task-report-answer dd').all_text_contents()[:4]==['24','0','Unprovided','—']
        for width in [360,768,1440]:
            page.set_viewport_size({'width':width,'height':950})
            row=report.locator('.task-report-answer').first;question=row.locator('dt').bounding_box();answer=row.locator('dd').bounding_box()
            assert question['width']>row.bounding_box()['width']*.55;assert answer['x']>question['x'];assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert report.locator('.task-report-answer-written dd').first.bounding_box()['width']>row.bounding_box()['width']*.9
        page.screenshot(path='/tmp/task-submitted-report-layout.png',full_page=True)
        original_author=api({'action':'task-principal','operation':'read'})['tasks']['task1']['reports']['IX A']['submittedBy']
        for value in ['18','19']:
            report.get_by_role('button',name='Edit submitted answers — IX A',exact=True).click()
            editor=report.locator('.task-principal-report-editor');assert editor.locator('[name=submission-pin]').count()==0
            if value=='18':
                assert editor.locator('[name=passed]').input_value()=='';assert editor.locator('[name=failed]').count()==0
            editor.locator('[name=passed]').fill(value);editor.get_by_role('button',name='Save submitted answers',exact=True).click()
            page.get_by_role('status').get_by_text('IX A submitted answers saved successfully by Principal.',exact=True).wait_for()
            edited=api({'action':'task-principal','operation':'read'})['tasks']['task1'];assert edited['reports']['IX A']['values']['passed']==int(value);assert edited['reports']['IX A']['submittedBy']==original_author;assert edited['summary']['totals']['passed']['total']==int(value)
        assert report.locator('.task-save-confirmation').inner_text().startswith('Saved by Principal')
        assert '✓ Submitted' in card.locator('.task-class-status').first.inner_text()
        anonymous=browser.new_context(extra_http_headers={'X-Synthetic-Active-Survey':'1'});anonymous.route('https://www.gstatic.com/firebasejs/**',sdk);status_page=anonymous.new_page();status_page.goto(BASE+'cbse-task-manager.html')
        status_page.locator('[data-task-class="IX A"] .task-row-submitted').wait_for();assert status_page.locator('[data-task-class="IX A"] .task-row-submitted').inner_text()=='✓ Submitted'
        assert status_page.locator('[data-task-class="IX B"] .task-row-pending').evaluate('(node)=>getComputedStyle(node).color')=='rgb(180, 35, 41)';anonymous.close()
        print('PASS green submitted ticks, red pending labels and Principal answer corrections with confirmed saves and updated totals')

        card.get_by_text('Closing comments for the whole report',exact=True).click()
        for key in ['ro','deputyCommissioner','assistantCommissioner','principalAction','higherOfficials']:
            card.locator('[name=closing-'+key+']').fill('Synthetic closing comment for '+key+'.')
        card.get_by_role('button',name='Save closing report comments',exact=True).click();page.get_by_role('status').get_by_text('Closing report comments saved successfully.',exact=False).wait_for()
        assert api({'action':'task-principal','operation':'read'})['tasks']['task1']['reportComments']['ro']=='Synthetic closing comment for ro.'
        card.get_by_role('button',name='Class-wise reports annexure',exact=True).click();class_preview=page.locator('.task-presentation');class_preview.locator('[data-export-class="IX A"]').wait_for()
        assert class_preview.locator('.presentation-main-page').count()==0;assert '19' in class_preview.locator('.presentation-class-report').inner_text()
        page.emulate_media(media='print');page.pdf(path='/tmp/task-class-report-synthetic.pdf',prefer_css_page_size=True,print_background=True)
        class_text=subprocess.check_output(['pdftotext','-layout','/tmp/task-class-report-synthetic.pdf','-'],text=True);assert 'Total students' in class_text;assert 'Number of students who passed' in class_text;assert 'Q1.' in class_text;assert 'Synthetic revised perspective' in class_text
        page.emulate_media(media='screen');class_preview.get_by_role('checkbox',name='Include class report IX A',exact=True).uncheck();assert class_preview.get_by_role('button',name='Print / Save PDF',exact=True).is_disabled();class_preview.get_by_role('checkbox',name='Include class report IX A',exact=True).check()
        class_preview.get_by_role('button',name='Close report',exact=True).click()
        with page.expect_download() as excel_download:
            card.get_by_role('button',name='Download Excel · IX–X–XI–XII',exact=True).click()
        downloaded=excel_download.value
        assert downloaded.suggested_filename.endswith('-IX-X-XI-XII.xlsx')
        with zipfile.ZipFile(downloaded.path()) as workbook:
            names=workbook.read('xl/workbook.xml').decode()
            assert all('name="'+grade+'"' in names for grade in ['IX','X','XI','XII'])
            assert len([name for name in workbook.namelist() if name.startswith('xl/worksheets/sheet') and name.endswith('.xml')])==4
        card.get_by_role('button',name='Prepare presentation report',exact=True).click()
        preview=page.locator('.task-presentation');preview.wait_for()
        assert all(title=='Vidyalaya Level Confidential Survey by Prime Mentor Teachers Regarding Low Academic Performance and Social-Psychological Aspects of Naharlagun (Itanagar, Arunachal Pradesh)' for title in preview.locator('.presentation-main-page h1').all_text_contents())
        titles=['1 · Class IX','2 · Class XI','3 · Classes IX + XI','4 · Class X','5 · Class XII','6 · Classes X + XII','7 · Classes IX–XII consolidated']
        assert preview.locator('.presentation-main-page').count()==14
        assert preview.locator('.presentation-main-page h2').all_text_contents()==[title+' · '+suffix for title in titles for suffix in ['Overview','Continued']]
        assert preview.locator('.presentation-comparison-box').count()==4
        assert preview.locator('.presentation-comparison-box').evaluate_all('(boxes)=>boxes.map(box=>box.closest(".presentation-main-page").querySelector("h2").textContent)')==[title+' · Continued' for title in [titles[0],titles[1],titles[3],titles[4]]]
        assert preview.locator('.presentation-summary-row').evaluate_all('(rows)=>rows.map(row=>row.children.length)')==[3,3,2,3,3,2,2]
        assert preview.locator('.presentation-summary-row').evaluate_all('(rows)=>rows.every(row=>[...row.children].every(box=>Math.abs(box.getBoundingClientRect().top-row.firstElementChild.getBoundingClientRect().top)<1))')
        assert preview.locator('.presentation-overview').count()==7;assert preview.locator('.presentation-attendance-strip').count()==7;assert preview.locator('.presentation-staffing-card').count()==7
        assert preview.get_by_role('combobox',name='Report class grouping',exact=True).count()==0
        assert preview.locator('.presentation-appendix').count()==0
        assert preview.locator('.presentation-main-page').first.locator('.presentation-count').first.inner_text()=='96'
        assert preview.locator('.presentation-main-page').first.locator('.presentation-count').nth(1).inner_text()=='0.0%'
        assert 'matching appeared counts are missing' in preview.locator('.presentation-main-page').first.inner_text()
        preview.get_by_text('Select presentation questions',exact=True).click();preview.get_by_role('button',name='Clear question selection',exact=True).click();assert preview.get_by_role('button',name='Print / Save PDF',exact=True).is_disabled()
        preview.get_by_role('checkbox',name='Include Q4. Number of students who passed the latest examination',exact=True).check();assert preview.locator('.presentation-main-page').count()==7
        assert preview.locator('.presentation-main-page .presentation-point h4').all_text_contents()==['Number of students who passed the latest examination','Teaching vacancy']*7
        preview.get_by_role('button',name='Select all questions',exact=True).click();preview.get_by_text('Select presentation questions',exact=True).click()
        preview.get_by_role('textbox').fill('Counsellor — Synthetic Co-opted Member');preview.get_by_role('button',name='Update participant list',exact=True).click()
        page.emulate_media(media='print')
        assert preview.locator('.presentation-main-page').evaluate_all('(pages)=>pages.every(p=>p.scrollHeight<=p.clientHeight+1 && [...p.querySelectorAll(".presentation-point,.presentation-overview,.presentation-summary-row,.presentation-summary-box")].every(c=>c.scrollHeight<=c.clientHeight+1))'),preview.locator('.presentation-main-page').evaluate_all('(pages)=>pages.flatMap(p=>[...p.querySelectorAll(".presentation-point,.presentation-overview,.presentation-summary-row,.presentation-summary-box")].filter(c=>c.scrollHeight>c.clientHeight+1).map(c=>({text:c.innerText,height:c.clientHeight,scroll:c.scrollHeight})))')
        page.pdf(path='/tmp/task-presentation-synthetic.pdf',prefer_css_page_size=True,print_background=True)
        pdftext=subprocess.check_output(['pdftotext','-layout','/tmp/task-presentation-synthetic.pdf','-'],text=True)
        assert len([p for p in pdftext.split('\f') if p.strip()])==14
        assert pdftext.count('Three-year comparative results')==4;assert pdftext.count('Main report ·')==14
        assert 'Synthetic closing comment' not in pdftext;assert 'Synthetic revised perspective' not in pdftext
        page.emulate_media(media='screen')
        with page.expect_download() as download_info:preview.get_by_role('button',name='Download PPTX',exact=True).click()
        download_info.value.save_as('/tmp/task-presentation-browser-synthetic.pptx')
        with zipfile.ZipFile('/tmp/task-presentation-browser-synthetic.pptx') as deck:
            paths=sorted([n for n in deck.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')],key=lambda n:int(n.split('slide')[-1].split('.')[0]))
            slides=[deck.read(n).decode() for n in paths];xml='\n'.join(slides)
            assert len(slides)==14;assert xml.count('Three-year comparative results')==4
            assert 'Synthetic closing comment' not in xml;assert 'Synthetic revised perspective' not in xml
            assert [next(title for title in titles if title in slide) for slide in slides if 'Main report ·' in slide]==[title for title in titles for _ in range(2)]
        for mode,expected,excluded in [('remarks','Synthetic closing comment for ro.','Synthetic revised perspective'),('teachers','Synthetic revised perspective','Synthetic closing comment for ro.'),('classes','Synthetic revised perspective','Synthetic closing comment for ro.')]:
            preview.get_by_role('combobox',name='Report content',exact=True).select_option(mode)
            assert preview.locator('.presentation-main-page').count()==0;assert expected in preview.locator('.presentation-pages').inner_text();assert excluded not in preview.locator('.presentation-pages').inner_text()
            with page.expect_download() as annexure_info:preview.get_by_role('button',name='Download PPTX',exact=True).click()
            annexure_info.value.save_as('/tmp/task-'+mode+'-annexure.pptx')
            with zipfile.ZipFile('/tmp/task-'+mode+'-annexure.pptx') as deck:
                xml='\n'.join(deck.read(n).decode() for n in deck.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml'));assert expected in xml;assert excluded not in xml;assert 'Main report ·' not in xml
            page.emulate_media(media='print');page.pdf(path='/tmp/task-'+mode+'-annexure.pdf',prefer_css_page_size=True,print_background=True)
            text=subprocess.check_output(['pdftotext','-layout','/tmp/task-'+mode+'-annexure.pdf','-'],text=True);assert expected in text;assert excluded not in text;assert 'Main report ·' not in text;page.emulate_media(media='screen')
        preview.get_by_role('combobox',name='Report content',exact=True).select_option('remarks');preview.get_by_role('checkbox',name='Include Efforts by Regional Office (RO)',exact=True).uncheck();assert 'Synthetic closing comment for ro.' not in preview.locator('.presentation-pages').inner_text()
        preview.get_by_role('combobox',name='Report content',exact=True).select_option('main')
        page.set_viewport_size({'width':360,'height':900});assert preview.evaluate('(node)=>node.scrollWidth<=node.clientWidth');page.screenshot(path='/tmp/seven-report-mobile.png',full_page=False)
        preview.get_by_role('button',name='Close report',exact=True).click();page.set_viewport_size({'width':1440,'height':950})
        # Fully completed survey still fits two chart pages per group with comparison boxes on the same page.
        page.evaluate("""async task=>{const {openTaskPresentation}=await import('/cbse-task-presentation.js');const people={};task.reports={};for(const [i,c]of task.published.selectedClasses.entries()){const id='synthetic_'+i;people[id]={name:'Synthetic Participating Teacher '+(i+1)};task.published.headers[c]={total:24,catV:12,st:6};task.reports[c]={submittedBy:id,questions:task.published.questions,values:Object.fromEntries(task.published.questions.map(q=>[q.id,q.kind==='text'?'Synthetic written observations.':q.kind==='meetings'?2:10]))};}openTaskPresentation(task,people);}""",current)
        page.emulate_media(media='print')
        assert page.locator('.presentation-main-page').evaluate_all('(pages)=>pages.every(p=>p.scrollHeight<=p.clientHeight+1 && [...p.querySelectorAll(".presentation-point,.presentation-overview,.presentation-summary-row,.presentation-summary-box")].every(c=>c.scrollHeight<=c.clientHeight+1))'),page.locator('.presentation-main-page').evaluate_all('(pages)=>pages.flatMap(p=>[...p.querySelectorAll(".presentation-point,.presentation-overview,.presentation-summary-row,.presentation-summary-box")].filter(c=>c.scrollHeight>c.clientHeight+1).map(c=>({text:c.innerText,height:c.clientHeight,scroll:c.scrollHeight})))')
        page.pdf(path='/tmp/task-presentation-complete-synthetic.pdf',prefer_css_page_size=True,print_background=True)
        text=subprocess.check_output(['pdftotext','-layout','/tmp/task-presentation-complete-synthetic.pdf','-'],text=True);assert len([p for p in text.split('\f') if p.strip()])==14
        page.emulate_media(media='screen');page.get_by_role('button',name='Close report',exact=True).click()
        for name,mode in [('RO / DC / AC remarks annexure','remarks'),('Teachers’ comments annexure','teachers'),('Class-wise reports annexure','classes')]:
            card.get_by_role('button',name=name,exact=True).click();assert page.get_by_role('combobox',name='Report content',exact=True).input_value()==mode;page.get_by_role('button',name='Close report',exact=True).click()
        print('PASS seven ordered main-report groups, individual-grade comparisons, separate PDF/PPTX annexures and mobile layout')

        if not card.locator('.task-editor').evaluate('(node)=>node.open'):card.get_by_text('Edit task, survey questions and teacher assignments',exact=True).click()
        card.get_by_role('button',name='Clear class selection',exact=True).click();card.get_by_label('Apply task to IX A',exact=True).check();card.get_by_label('Apply task to XI E',exact=True).check();card.get_by_role('button',name='Save private draft',exact=True).click();page.get_by_role('status').get_by_text('Private draft saved.',exact=False).wait_for()
        assert len(api({'action':'task-read'},token='')['tasks']['task1']['rows'])==18
        card.get_by_role('button',name='Save and publish task',exact=True).click();page.get_by_role('status').get_by_text('Published. Reports remain restricted',exact=False).wait_for();assert [r['classId'] for r in api({'action':'task-read'},token='')['tasks']['task1']['rows']]==['IX A','XI E']
        staged=base64.urlsafe_b64encode(json.dumps({'taskId':'task1','rows':[['IX A',41,4,3],['XI E',25,2,3]]}).encode()).decode().rstrip('=')
        before=api({'action':'task-principal','operation':'read'})['tasks']['task1']['draft']['headers']['IX A']['total']
        prepared=ctx.new_page();prepared.goto(BASE+'cbse-task-manager.html#principal&figures='+staged);prepared.locator('.task-import-ready').wait_for();assert prepared.url.endswith('#principal');prepared.get_by_role('row').filter(has_text='Vidyalaya Level Confidential Survey').get_by_role('button').click();assert prepared.locator('[name=preview-class]').count()==0;assert prepared.get_by_label('Total students · IX A',exact=True).input_value()=='41';assert api({'action':'task-principal','operation':'read'})['tasks']['task1']['draft']['headers']['IX A']['total']==before
        prepared.get_by_role('button',name='Save and publish task',exact=True).click();prepared.get_by_role('status').get_by_text('Published. Reports remain restricted',exact=False).wait_for();assert api({'action':'task-principal','operation':'read'})['tasks']['task1']['published']['headers']['IX A']['total']==41;prepared.close()
        outsider=browser.new_context();outsider.route('https://www.gstatic.com/firebasejs/**',sdk);unverified=outsider.new_page();unverified.goto(BASE+'cbse-task-manager.html#principal&figures='+staged);unverified.get_by_role('button',name='Principal sign-in',exact=True).wait_for();assert unverified.get_by_label('Principal password',exact=True).count()==0;assert unverified.locator('.task-import-ready').count()==0;assert unverified.locator('.task-assignment-section').count()==0;outsider.close()
        page.get_by_role('button',name='Refresh tasks',exact=True).click();card.get_by_role('button',name='Stop publication',exact=True).wait_for()
        card.get_by_role('button',name='Stop publication',exact=True).click();page.get_by_role('status').get_by_text('Publication stopped.',exact=False).wait_for()
        current=api({'action':'task-principal','operation':'read'})['tasks']['task1'];assert not current.get('published');assert len(current['reports'])==1;assert current['comment']=='Synthetic private review'
        card.get_by_role('button',name='Prepare presentation report',exact=True).click();page.locator('.task-presentation').wait_for()
        page.locator('#task-nav button').evaluate('(button)=>button.click()');sign_in.wait_for();assert page.get_by_label('Principal password',exact=True).count()==0;assert page.locator('#task-task1').count()==0;assert page.locator('.task-presentation').count()==0;assert not page.locator('.task-app').evaluate('(node)=>node.inert')
        assert not errors,errors
        print('PASS Principal totals/comment, stop publication retains reports, and explicit logout clears protected DOM')
        browser.close()
finally:
    server.terminate();server.wait(timeout=10)
