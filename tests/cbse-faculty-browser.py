"""Private faculty workflow: real PDF.js parser, synthetic PDF, mocked Firebase."""
import tempfile, os
from playwright.sync_api import sync_playwright

def synthetic_pdf():
    rows=[(19,'Synthetic Faculty One','TGT-English','X-A','ENGLISH'),(33,'Synthetic Faculty Two','TGT-Science','X-B','SCIENCE'),(3,'Synthetic Faculty Three','PGT-English','XII-A','ENGLISH'),(16,'Synthetic Vacant Position','Vacant','XII-B','CHEMISTRY')]
    commands=[]
    def text(x,top,value):
        escaped=value.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')
        commands.append(f'BT /F1 7 Tf {x} {595-top} Td ({escaped}) Tj ET')
    for i,(serial,name,designation,cl,subject) in enumerate(rows):
        y=140+i*70
        text(27,y,str(serial));text(49,y,name);text(49,y+9,'('+designation+')');text(169,y,'Class '+cl);text(224,y,subject+' (24)')
    stream='\n'.join(commands).encode()
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream']
    data=b'%PDF-1.4\n';offsets=[0]
    for i,obj in enumerate(objects,1):offsets.append(len(data));data+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
    start=len(data);data+=b'xref\n0 6\n0000000000 65535 f \n'+b''.join(f'{offset:010} 00000 n \n'.encode() for offset in offsets[1:])+b'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+str(start).encode()+b'\n%%EOF'
    return data
APP='export function initializeApp(c){return c;} export function getApps(){return [];}'
AUTH='''let listener;const user={uid:'principal-test',email:'principal@example.invalid',getIdToken:async()=> 'principal-test-token'};export function getAuth(){return {}} export const browserLocalPersistence={}; export async function setPersistence(){} export function onAuthStateChanged(a,cb){listener=cb;cb(sessionStorage.getItem('facultySignedIn')?user:null);}export async function signOut(){sessionStorage.removeItem('facultySignedIn');listener(null);}'''
DB='''let state=null,students=null;window.__facultyReads=[];const callbacks={};export function getDatabase(){return {}} export function ref(d,p){return p;}
export async function get(path){window.__facultyReads.push(path);return {val:()=>sessionStorage.getItem('wrongFacultyRole')?'other':'principal-test'};}
export function onValue(path,cb,error){window.__facultyReads.push(path);if(window.__denyFaculty&&path==='cbse/facultyDraft'){error({code:'PERMISSION_DENIED'});return ()=>{};} (callbacks[path]||=[]).push(cb);cb({val:()=>path==='cbse/facultyDraft'?state:students});return ()=>{callbacks[path]=callbacks[path].filter(c=>c!==cb)};}
function notify(){for(const cb of callbacks['cbse/facultyDraft']||[])cb({val:()=>structuredClone(state)});}
export async function runTransaction(path,fn){if(path!=='cbse/facultyDraft')throw Error('Unexpected database path');if(window.__facultyConflict){state.revision++;window.__facultyConflict=false;notify();}const next=fn(structuredClone(state));if(next===undefined)return {committed:false,snapshot:{val:()=>state}};state=structuredClone(next);window.__savedFaculty=structuredClone(state);notify();return {committed:true,snapshot:{val:()=>structuredClone(state)}};}
window.__updateFaculty=next=>{state=structuredClone(next);notify();};
window.__studentSections=next=>{students=next;for(const cb of callbacks['cbse/draft']||[])cb({val:()=>students});};'''
def intercept(route):
    url=route.request.url
    route.fulfill(content_type='application/javascript',body=APP if url.endswith('firebase-app.js') else AUTH if url.endswith('firebase-auth.js') else DB)
fixture=tempfile.NamedTemporaryFile(suffix='.pdf',delete=False);fixture.write(synthetic_pdf());fixture.close()
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page();page.route('https://www.gstatic.com/firebasejs/**',intercept)
    pin_calls=[]
    def pin_access(route):
        body=route.request.post_data_json;assert body['action']=='generate-pins';assert route.request.headers.get('authorization')=='Bearer principal-test-token';pin_calls.append(body);route.fulfill(json={'created':[{'staffId':'X:synthetic','name':'Synthetic Faculty','pin':'047'}]})
    page.route('**/api/staff-access',pin_access)
    page.goto('http://127.0.0.1:8000/cbse-faculty.html');page.locator('#faculty-locked').wait_for(state='visible')
    assert page.locator('#faculty-workspace').is_hidden();assert page.evaluate('window.__facultyReads.length')==0
    page.evaluate("sessionStorage.setItem('facultySignedIn','yes');sessionStorage.setItem('wrongFacultyRole','yes')")
    page.reload();page.get_by_role('status').filter(has_text='not registered').wait_for();assert page.locator('#faculty-workspace').is_hidden()
    page.evaluate("sessionStorage.removeItem('wrongFacultyRole')");page.reload();page.locator('#faculty-workspace').wait_for(state='visible')
    assert page.locator('#faculty-roles tr').count()==4
    # Permission denial is setup, not a request to log in again.
    page.add_init_script("window.__denyFaculty=sessionStorage.getItem('denyFaculty')==='yes'")
    page.evaluate("sessionStorage.setItem('denyFaculty','yes')");page.reload();page.locator('#faculty-setup').wait_for(state='visible')
    assert page.locator('#faculty-locked').is_hidden()
    assert page.locator('#faculty-setup .setup-steps li').count()==3
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copiedRules=text}})")
    page.locator('#faculty-copy-rules').click();page.wait_for_function('!!window.__copiedRules')
    assert page.evaluate('JSON.parse(window.__copiedRules).rules.cbse.facultyDraft!==undefined')
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Clipboard blocked')}}})")
    page.locator('#faculty-copy-rules').click();page.locator('#faculty-manual-copy').wait_for(state='visible')
    assert 'facultyDraft' in page.locator('#faculty-rules-text').input_value()
    page.evaluate("sessionStorage.removeItem('denyFaculty')");page.reload();page.locator('#faculty-workspace').wait_for(state='visible');assert page.locator('#faculty-setup').is_hidden()
    print('PASS linear setup, clipboard copy/fallback and no repeated login on permission denial')
    page.locator('#faculty-file').set_input_files(fixture.name);page.get_by_role('button',name='Import faculty privately').wait_for();assert '2 new faculty' in page.locator('#faculty-review-content').inner_text();page.get_by_role('button',name='Import faculty privately').click();page.locator('#faculty-review').wait_for(state='hidden');assert page.locator('#faculty-body tr').count()==2;assert pin_calls;assert 'missing initial PIN(s) generated' in page.locator('#faculty-message').inner_text()
    # Download an editable CSV and upload a changed name using its stable ID.
    with page.expect_download() as download_event:page.locator('#faculty-export-csv').click()
    download=download_event.value
    csv_text=open(download.path(),encoding='utf-8-sig').read().replace('Synthetic Faculty One','CSV Edited Faculty')
    csv_file=tempfile.NamedTemporaryFile(mode='w',suffix='.csv',delete=False,encoding='utf-8-sig');csv_file.write(csv_text);csv_file.close()
    try:
        page.locator('#faculty-csv-file').set_input_files(csv_file.name);page.get_by_role('button',name='Import CSV privately').wait_for();page.get_by_role('button',name='Import CSV privately').click();page.locator('#faculty-review').wait_for(state='hidden')
    finally:os.unlink(csv_file.name)
    assert page.locator('#faculty-body tr').count()==2
    assert 'CSV Edited Faculty' in page.locator('#faculty-body').inner_text()
    revision=page.evaluate('window.__savedFaculty.revision')
    with page.expect_download() as converted_event:page.locator('#faculty-convert-file').set_input_files(fixture.name)
    assert 'FacultyID,Class,Name' in open(converted_event.value.path(),encoding='utf-8-sig').read()
    assert page.evaluate('window.__savedFaculty.revision')==revision
    print('PASS downloadable CSV, stable-ID updates and PDF-to-CSV conversion without database changes')
    page.locator('#faculty-tab-xii').click();assert page.locator('#faculty-body tr').count()==2;assert page.locator('#faculty-roles tr').count()==5;assert page.locator('#faculty-stats strong').nth(1).inner_text()=='1'
    page.locator('#faculty-tab-x').click()
    print('PASS Principal access gate, actual PDF.js import, separate X/XII faculty and vacancies')
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('#faculty-add').click();page.locator('#faculty-editor input[name=name]').fill('Synthetic New Faculty');page.locator('#faculty-editor input[name=designation]').fill('TGT');page.locator('#faculty-save').click();page.locator('#faculty-editor').wait_for(state='hidden');assert page.locator('#faculty-body tr').count()==3
    page.locator('#faculty-search').fill('Synthetic New Faculty');page.locator('#faculty-body').get_by_role('button',name='Edit',exact=True).click();page.locator('#faculty-editor input[name=subjects]').fill('English and Science');page.locator('#faculty-save').click();page.locator('#faculty-editor').wait_for(state='hidden');assert 'English and Science' in page.locator('#faculty-body').inner_text();page.locator('#faculty-search').fill('')
    ids=page.evaluate('Object.keys(window.__savedFaculty.classes.X.teachers)');first,second=ids[0:2]
    lead=page.get_by_role('combobox',name='Class teacher for Class X Section A',exact=True);lead.select_option(first);page.wait_for_function('window.__savedFaculty.classes.X.roles.a.classTeacher!==""')
    co=page.get_by_role('combobox',name='Co-class teacher for Class X Section A',exact=True);co.select_option(second);page.wait_for_function('window.__savedFaculty.classes.X.roles.a.coClassTeacher!==""')
    co.select_option(first);page.get_by_role('status').filter(has_text='different people').wait_for();assert co.input_value()==second
    page.locator('#faculty-roles tr').first.get_by_role('button',name='Other roles').click();page.get_by_role('button',name='Add responsibility').click();page.locator('input[name=role-label]').fill('Mentor');page.locator('select[name=role-teacher]').select_option(second);page.locator('#faculty-save').click();page.locator('#faculty-editor').wait_for(state='hidden');assert 'Mentor' in page.locator('#faculty-roles tr').first.inner_text()
    print('PASS faculty add/edit, dropdown role saves, same-person rejection and custom responsibility')
    changed=page.evaluate('window.__savedFaculty');changed['revision']+=1;changed['classes']['X']['teachers'][first]['subjects']='Updated on another device';page.evaluate('next=>window.__updateFaculty(next)',changed);assert 'Updated on another device' in page.locator('#faculty-body').inner_text()
    page.locator('#faculty-body tr').first.get_by_role('button',name='Edit',exact=True).click();page.locator('#faculty-editor input[name=subjects]').fill('Conflicting edit');page.evaluate('window.__facultyConflict=true');page.locator('#faculty-save').click();page.locator('#faculty-editor-error').wait_for(state='visible');assert 'Another session' in page.locator('#faculty-editor-error').inner_text();page.locator('#faculty-cancel').click()
    # Repeat import must preserve edits and keep the same faculty count.
    page.locator('#faculty-file').set_input_files(fixture.name);page.get_by_role('button',name='Import faculty privately').wait_for();assert '0 new faculty' in page.locator('#faculty-review-content').inner_text();page.get_by_role('button',name='Import faculty privately').click();page.locator('#faculty-review').wait_for(state='hidden');assert page.locator('#faculty-body tr').count()==3
    page.locator('#faculty-search').fill('Synthetic Faculty Two');page.locator('#faculty-body').get_by_role('button',name='Remove',exact=True).click();page.get_by_role('button',name='Remove faculty',exact=True).click();page.locator('#faculty-review').wait_for(state='hidden');assert page.evaluate('window.__savedFaculty.classes.X.roles.a.coClassTeacher')=='';assert page.evaluate('Object.keys(window.__savedFaculty.classes.X.roles.a.other||{}).length')==0
    page.locator('#faculty-search').fill('');assert page.locator('#faculty-body tr').count()==2
    print('PASS live snapshots, conflict protection, repeat import and removal clearing all assignments')
    page.locator('#faculty-signout').click();page.locator('#faculty-locked').wait_for(state='visible');assert page.locator('#faculty-body').inner_text()=='';assert page.locator('#faculty-roles').inner_text()==''
    assert not any('cbse/public' in read for read in page.evaluate('window.__facultyReads'))
    print('PASS sign-out cleanup; faculty workflow never reads or writes public student publication')
    browser.close()
finally:os.unlink(fixture.name)
