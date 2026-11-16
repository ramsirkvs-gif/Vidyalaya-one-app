"""Generated-site UI against the real task/PIN service with synthetic database/auth.
Run after npm run build. No real Firebase access or school records are used.
"""
import json, subprocess, urllib.request, base64, zipfile
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
        page.reload();card.get_by_role('button',name='Stop publication',exact=True).wait_for();assert card.evaluate("card=>Boolean(card.querySelector('.task-results').compareDocumentPosition(card.querySelector('.task-editor'))&Node.DOCUMENT_POSITION_FOLLOWING)");assert card.get_by_role('button',name='View submission status',exact=True).count()==1;assert page.get_by_label('Principal password',exact=True).count()==0
        print('PASS Principal persistent login, exact Task 1 private draft, assignment/header import, save and publication')
        release={'version':json.loads((ROOT/'public/app-version.json').read_text())['version']}
        staffctx=browser.new_context();staffctx.route('**/app-version.json',lambda route:route.fulfill(json=release));staffctx.route('https://www.gstatic.com/firebasejs/**',sdk);teacher=staffctx.new_page();teacher.on('pageerror',lambda e:errors.append(str(e)))
        teacher.goto(BASE+'cbse-task-manager.html#staff');teacher.locator('[data-task-class="IX A"]').wait_for();assert teacher.locator('.task-public-list tbody tr').count()==18;assert teacher.locator('.task-urgent-heading .task-alarm-icon').inner_text()=='🚨';assert teacher.locator('.task-importance-label').text_content()=='Highly important · Most urgent';assert teacher.locator('.task-count').count()==0;assert teacher.locator('[name=teacher-remarks]').count()==0;assert teacher.locator('[name=curtain]').count()==0
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
        anonymous=browser.new_context();anonymous.route('https://www.gstatic.com/firebasejs/**',sdk);status_page=anonymous.new_page();status_page.goto(BASE+'cbse-task-manager.html')
        status_page.locator('[data-task-class="IX A"] .task-row-submitted').wait_for();assert status_page.locator('[data-task-class="IX A"] .task-row-submitted').inner_text()=='✓ Submitted'
        assert status_page.locator('[data-task-class="IX B"] .task-row-pending').evaluate('(node)=>getComputedStyle(node).color')=='rgb(180, 35, 41)';anonymous.close()
        print('PASS green submitted ticks, red pending labels and Principal answer corrections with confirmed saves and updated totals')

        card.get_by_text('Closing comments for the whole report',exact=True).click()
        for key in ['ro','deputyCommissioner','assistantCommissioner','principalAction','higherOfficials']:
            card.locator('[name=closing-'+key+']').fill('Synthetic closing comment for '+key+'.')
        card.get_by_role('button',name='Save closing report comments',exact=True).click();page.get_by_role('status').get_by_text('Closing report comments saved successfully.',exact=False).wait_for()
        assert api({'action':'task-principal','operation':'read'})['tasks']['task1']['reportComments']['ro']=='Synthetic closing comment for ro.'
        card.get_by_role('button',name='Class-wise survey PDF',exact=True).click();class_preview=page.locator('.task-presentation');class_preview.locator('[data-export-class="IX A"]').wait_for()
        assert class_preview.locator('.presentation-main-page').count()==0;assert '19' in class_preview.locator('.presentation-class-report').inner_text()
        page.emulate_media(media='print');page.pdf(path='/tmp/task-class-report-synthetic.pdf',prefer_css_page_size=True,print_background=True)
        class_text=subprocess.check_output(['pdftotext','-layout','/tmp/task-class-report-synthetic.pdf','-'],text=True);assert 'Total students' in class_text;assert 'Number of students who passed' in class_text;assert 'Q1.' in class_text;assert 'Synthetic revised perspective' in class_text
        page.emulate_media(media='screen');class_preview.get_by_role('checkbox',name='Include class report IX A',exact=True).uncheck();assert class_preview.get_by_role('button',name='Print / Save PDF',exact=True).is_disabled();class_preview.get_by_role('checkbox',name='Include class report IX A',exact=True).check()
        class_preview.get_by_role('button',name='Close report',exact=True).click()
        card.get_by_role('button',name='Prepare presentation report',exact=True).click()
        preview=page.locator('.task-presentation');preview.wait_for();assert preview.locator('.presentation-main-page').count()==4
        chart_questions=preview.locator('.presentation-point h4').all_text_contents();assert len([q for q in chart_questions if 'living in hostels /' in q])==2;assert not any(q.startswith('Q') for q in chart_questions);assert len([q for q in chart_questions if '(either one or both parents are uneducated)' in q])==2
        assert preview.locator('.presentation-main-page').first.get_by_role('heading',name='I · Class IX · Overview',exact=True).count()==1
        assert preview.locator('.presentation-main-page').nth(2).get_by_role('heading',name='II · Classes IX–XII consolidated · Overview',exact=True).count()==1
        assert preview.locator('.presentation-main-page').first.locator('.presentation-count').first.inner_text()=='96'
        assert preview.locator('.presentation-main-page').first.locator('.presentation-count').nth(1).inner_text()=='0.0%'
        assert preview.locator('.presentation-main-page').first.locator('.presentation-count-context').first.inner_text()=='0 out of 96 students'
        assert preview.locator('.presentation-main-page').first.locator('.presentation-count').nth(3).inner_text()=='79.2%'
        assert preview.locator('.presentation-main-page').first.locator('.presentation-count-context').nth(1).inner_text()=='19 out of 24 students'
        preview.get_by_role('combobox',name='Report class grouping',exact=True).select_option('custom');preview.get_by_role('button',name='IX + XI',exact=True).click()
        group_scope=[c for c in current['published']['selectedClasses'] if c.split()[0] in ['IX','XI']]
        assert preview.locator('.presentation-main-page').count()==2;assert preview.locator('.presentation-main-page h2').first.inner_text().startswith('Combined report · IX + XI')
        assert 'Classes covered: 1 of '+str(len(group_scope)) in preview.locator('.presentation-overview').inner_text()
        assert preview.locator('.presentation-count').first.inner_text()==str(sum(current['published']['headers'][c]['total'] for c in group_scope))
        preview.get_by_role('button',name='X + XII',exact=True).click();assert 'Classes covered: 0 of ' in preview.locator('.presentation-overview').inner_text()
        with page.expect_download() as group_deck_info:preview.get_by_role('button',name='Download PPTX',exact=True).click()
        group_deck_info.value.save_as('/tmp/task-custom-group-synthetic.pptx')
        with zipfile.ZipFile('/tmp/task-custom-group-synthetic.pptx') as deck:
            group_xml='\n'.join(deck.read(name).decode() for name in deck.namelist() if name.startswith('ppt/slides/slide') and name.endswith('.xml'))
            assert 'Combined report · X + XII' in group_xml;assert 'I · Class IX' not in group_xml
        preview.get_by_role('button',name='Clear class group',exact=True).click();assert preview.get_by_role('button',name='Print / Save PDF',exact=True).is_disabled()
        preview.get_by_role('combobox',name='Report class grouping',exact=True).select_option('standard');assert preview.locator('.presentation-main-page').count()==4
        preview.get_by_text('Select presentation questions',exact=True).click()
        preview.get_by_role('button',name='Clear question selection',exact=True).click();assert preview.get_by_role('button',name='Print / Save PDF',exact=True).is_disabled()
        preview.get_by_role('checkbox',name='Include Q4. Number of students who passed the latest examination',exact=True).check()
        assert preview.locator('.presentation-main-page').count()==2
        assert preview.locator('.presentation-main-page .presentation-point h4').all_text_contents()==['Number of students who passed the latest examination']*2
        assert preview.locator('.presentation-appendix').count()==0;assert preview.locator('.presentation-overview').count()==1
        assert preview.locator('.presentation-point h4').first.evaluate('(node)=>getComputedStyle(node).fontWeight')=='500'
        assert preview.locator('.presentation-point h4').first.evaluate('(node)=>getComputedStyle(node).backgroundColor')=='rgb(241, 246, 243)'
        page.emulate_media(media='print');page.pdf(path='/tmp/task-presentation-selected-synthetic.pdf',prefer_css_page_size=True,print_background=True)
        selected_text=subprocess.check_output(['pdftotext','-layout','/tmp/task-presentation-selected-synthetic.pdf','-'],text=True).split('\f');assert 'Main report' in selected_text[0] and 'Main report' in selected_text[1] and len([p for p in selected_text if p.strip()])==2;assert 'Cat-V students' not in ''.join(selected_text)
        page.emulate_media(media='screen');preview.get_by_role('button',name='Select all questions',exact=True).click();assert preview.locator('.presentation-main-page').count()==4
        preview.get_by_text('Select presentation questions',exact=True).click()
        preview.get_by_role('checkbox',name='Include teacher comments appendix in PDF',exact=True).check();assert preview.locator('.presentation-closing').count()==0
        with page.expect_download() as download_info:
            preview.get_by_role('button',name='Download PPTX',exact=True).click()
        download=download_info.value;download.save_as('/tmp/task-presentation-browser-synthetic.pptx')
        with zipfile.ZipFile('/tmp/task-presentation-browser-synthetic.pptx') as deck:
            slide_xml='\n'.join(deck.read(name).decode() for name in deck.namelist() if name.startswith('ppt/slides/slide') and name.endswith('.xml'))
            assert '79.2%' in slide_xml;assert 'Report overview' in slide_xml;assert 'Synthetic closing comment for ro.' not in slide_xml;assert 'Class-wise survey report' not in slide_xml;assert 'Synthetic revised perspective' not in slide_xml
            assert any(name.startswith('ppt/charts/chart') and name.endswith('.xml') for name in deck.namelist())
        preview.get_by_role('status').get_by_text('PowerPoint download prepared.',exact=True).wait_for()
        preview.get_by_role('checkbox',name='Include class-wise reports in PPTX',exact=True).check();preview.get_by_role('checkbox',name='Include teacher comments in PPTX',exact=True).check();preview.get_by_role('checkbox',name='Include closing remarks in PPTX',exact=True).check()
        assert preview.locator('.presentation-class-report').count()==0
        preview.get_by_role('checkbox',name='Include Efforts / guidance by Deputy Commissioner in PPTX',exact=True).uncheck()
        with page.expect_download() as full_deck_info:preview.get_by_role('button',name='Download PPTX',exact=True).click()
        full_deck_info.value.save_as('/tmp/task-presentation-with-all-options-synthetic.pptx')
        with zipfile.ZipFile('/tmp/task-presentation-with-all-options-synthetic.pptx') as deck:
            full_xml='\n'.join(deck.read(name).decode() for name in deck.namelist() if name.startswith('ppt/slides/slide') and name.endswith('.xml'))
            assert 'Class-wise survey report' in full_xml;assert 'Synthetic closing comment for ro.' in full_xml;assert 'Synthetic revised perspective' in full_xml;assert 'Synthetic closing comment for deputyCommissioner.' not in full_xml
        preview.get_by_role('checkbox',name='Include class-wise reports in PDF',exact=True).check();preview.get_by_role('checkbox',name='Include closing remarks in PDF',exact=True).check();assert preview.locator('.presentation-class-report').count()==1;assert preview.locator('.presentation-closing').count()==1
        preview.get_by_role('checkbox',name='Include Efforts by Regional Office (RO) in PDF',exact=True).uncheck();assert 'Synthetic closing comment for ro.' not in preview.locator('.presentation-closing').inner_text();assert 'Synthetic closing comment for deputyCommissioner.' in preview.locator('.presentation-closing').inner_text()
        preview.get_by_role('checkbox',name='Include class-wise reports in PDF',exact=True).uncheck();preview.get_by_role('checkbox',name='Include closing remarks in PDF',exact=True).uncheck()

        preview.get_by_role('checkbox',name='Include teacher comments appendix in PDF',exact=True).uncheck()
        preview.get_by_role('textbox').fill('Counsellor — Synthetic Co-opted Member');preview.get_by_role('button',name='Update participant list',exact=True).click()
        assert 'Synthetic Co-opted Member' in preview.locator('.presentation-main-page').last.inner_text()
        assert preview.locator('.presentation-appendix').count()==0;assert 'Classes covered: 1 of 18' in preview.locator('.presentation-overview').inner_text();assert 'Students covered by submitted reports: 24' in preview.locator('.presentation-overview').inner_text()
        page.emulate_media(media='print')
        assert preview.locator('.presentation-main-page').evaluate_all('(pages)=>pages.every(p=>p.scrollHeight<=p.clientHeight+1 && [...p.querySelectorAll(".presentation-point,.presentation-overview")].every(c=>c.scrollHeight<=c.clientHeight+1))'),preview.locator('.presentation-main-page').evaluate_all('(pages)=>pages.map(p=>({height:p.clientHeight,scroll:p.scrollHeight,cards:[...p.querySelectorAll(".presentation-point,.presentation-overview")].filter(c=>c.scrollHeight>c.clientHeight+1).map(c=>({text:c.innerText,height:c.clientHeight,scroll:c.scrollHeight}))}))')
        page.pdf(path='/tmp/task-presentation-synthetic.pdf',prefer_css_page_size=True,print_background=True)
        pdftext=subprocess.check_output(['pdftotext','-layout','/tmp/task-presentation-synthetic.pdf','-'],text=True).split('\f')
        assert len([p for p in pdftext if p.strip()])==4
        for i in range(4):assert 'Main report' in pdftext[i],(i,pdftext[i])
        assert 'Report overview' in pdftext[3];assert 'Synthetic Co-opted Member' in pdftext[3]
        page.emulate_media(media='screen');preview.get_by_role('checkbox',name='Include teacher comments appendix in PDF',exact=True).check()
        page.emulate_media(media='print');page.pdf(path='/tmp/task-presentation-with-comments-synthetic.pdf',prefer_css_page_size=True,print_background=True)
        with_comments=subprocess.check_output(['pdftotext','-layout','/tmp/task-presentation-with-comments-synthetic.pdf','-'],text=True).split('\f');assert 'Report overview' in with_comments[3];assert 'Teacher comments' in with_comments[4];assert 'Synthetic revised perspective' in ''.join(with_comments[4:])
        page.emulate_media(media='screen');preview.get_by_role('button',name='Close report',exact=True).click();assert page.locator('.task-presentation').count()==0
        card.get_by_role('button',name='Comments annexure PDF',exact=True).click();comments_preview=page.locator('.task-presentation');comments_preview.get_by_role('button',name='Download PPTX',exact=True).wait_for();assert comments_preview.get_by_role('button',name='Download PPTX',exact=True).count()==1;assert OVERALL_UPDATED in comments_preview.locator('.presentation-appendix').first.inner_text();comments_preview.get_by_role('button',name='Close report',exact=True).click()
        print('PASS four-page private presentation, chart coverage, participant list and separate comments appendix in PDF')
        # Full completion and every participating teacher must still fit four main pages.
        page.evaluate("""async task=>{const {openTaskPresentation}=await import('/cbse-task-presentation.js');const people={};task.reports={};task.comment='Synthetic Principal summary.';for(const [i,c] of task.published.selectedClasses.entries()){const id='synthetic_'+i;people[id]={name:'Synthetic Participating Teacher '+(i+1)};task.published.headers[c]={total:24,catV:12,st:6};task.reports[c]={submittedBy:id,questions:task.published.questions,values:Object.fromEntries(task.published.questions.map(q=>[q.id,q.kind==='text'?'Synthetic written observations.':q.kind==='meetings'?2:10]))};task.reports[c].values.remarks='Synthetic class comments.';}openTaskPresentation(task,people);} """,current)
        page.emulate_media(media='print')
        assert page.locator('.presentation-main-page').evaluate_all('(pages)=>pages.every(p=>p.scrollHeight<=p.clientHeight+1 && [...p.querySelectorAll(".presentation-point,.presentation-overview")].every(c=>c.scrollHeight<=c.clientHeight+1))')
        page.pdf(path='/tmp/task-presentation-complete-synthetic.pdf',prefer_css_page_size=True,print_background=True)
        complete_text=subprocess.check_output(['pdftotext','-layout','/tmp/task-presentation-complete-synthetic.pdf','-'],text=True).split('\f')
        assert all('Main report' in complete_text[i] for i in range(4));assert len([p for p in complete_text if p.strip()])==4;assert 'Report overview' in complete_text[3]
        page.emulate_media(media='screen');page.set_viewport_size({'width':360,'height':900});assert page.locator('.task-presentation').evaluate('(node)=>node.scrollWidth<=node.clientWidth')
        page.get_by_role('button',name='Close report',exact=True).click();page.set_viewport_size({'width':1440,'height':950})


        if not card.locator('.task-editor').evaluate('(node)=>node.open'):card.get_by_text('Edit task, survey questions and teacher assignments',exact=True).click()
        card.get_by_role('button',name='Clear class selection',exact=True).click();card.get_by_label('Apply task to IX A',exact=True).check();card.get_by_label('Apply task to XI E',exact=True).check();card.get_by_role('button',name='Save private draft',exact=True).click();page.get_by_role('status').get_by_text('Private draft saved.',exact=False).wait_for()
        assert len(api({'action':'task-read'},token='')['tasks']['task1']['rows'])==18
        card.get_by_role('button',name='Save and publish task',exact=True).click();page.get_by_role('status').get_by_text('Published. Reports remain restricted',exact=False).wait_for();assert [r['classId'] for r in api({'action':'task-read'},token='')['tasks']['task1']['rows']]==['IX A','XI E']
        staged=base64.urlsafe_b64encode(json.dumps({'taskId':'task1','rows':[['IX A',41,4,3],['XI E',25,2,3]]}).encode()).decode().rstrip('=')
        before=api({'action':'task-principal','operation':'read'})['tasks']['task1']['draft']['headers']['IX A']['total']
        prepared=ctx.new_page();prepared.goto(BASE+'cbse-task-manager.html#principal&figures='+staged);prepared.locator('.task-import-ready').wait_for();assert prepared.url.endswith('#principal');assert prepared.locator('[name=preview-class]').count()==0;assert prepared.get_by_label('Total students · IX A',exact=True).input_value()=='41';assert api({'action':'task-principal','operation':'read'})['tasks']['task1']['draft']['headers']['IX A']['total']==before
        prepared.get_by_role('button',name='Save and publish task',exact=True).click();prepared.get_by_role('status').get_by_text('Published. Reports remain restricted',exact=False).wait_for();assert api({'action':'task-principal','operation':'read'})['tasks']['task1']['published']['headers']['IX A']['total']==41;prepared.close()
        outsider=browser.new_context();outsider.route('https://www.gstatic.com/firebasejs/**',sdk);unverified=outsider.new_page();unverified.goto(BASE+'cbse-task-manager.html#principal&figures='+staged);unverified.get_by_label('Principal password',exact=True).wait_for();assert unverified.locator('.task-import-ready').count()==0;assert unverified.locator('.task-assignment-section').count()==0;outsider.close()
        page.get_by_role('button',name='Refresh tasks',exact=True).click();card.get_by_role('button',name='Stop publication',exact=True).wait_for()
        card.get_by_role('button',name='Stop publication',exact=True).click();page.get_by_role('status').get_by_text('Publication stopped.',exact=False).wait_for()
        current=api({'action':'task-principal','operation':'read'})['tasks']['task1'];assert not current.get('published');assert len(current['reports'])==1;assert current['comment']=='Synthetic private review'
        card.get_by_role('button',name='Prepare presentation report',exact=True).click();page.locator('.task-presentation').wait_for()
        page.locator('#task-nav button').evaluate('(button)=>button.click()');page.get_by_label('Principal password',exact=True).wait_for();assert page.locator('#task-task1').count()==0;assert page.locator('.task-presentation').count()==0;assert not page.locator('.task-app').evaluate('(node)=>node.inert')
        assert not errors,errors
        print('PASS Principal totals/comment, stop publication retains reports, and explicit logout clears protected DOM')
        browser.close()
finally:
    server.terminate();server.wait(timeout=10)
