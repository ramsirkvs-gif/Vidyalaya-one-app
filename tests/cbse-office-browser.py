"""Office dashboards against the real server service with synthetic data (port 8012)."""
from playwright.sync_api import sync_playwright
import json, subprocess, socket, os, atexit, time
from urllib.request import urlopen
with socket.socket() as probe:
 probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
BASE=f'http://127.0.0.1:{port}/'
server=subprocess.Popen(['node','tests/office-test-server.mjs'],env={**os.environ,'OFFICE_TEST_PORT':str(port)},stdout=subprocess.DEVNULL)
atexit.register(server.terminate)
for attempt in range(100):
 try:
  with urlopen(BASE+'cbse-office.html',timeout=1) as response:assert response.status==200
  break
 except OSError:
  if server.poll() is not None:raise RuntimeError('Office test server failed to start')
  time.sleep(.1)
else:raise RuntimeError('Office test server did not become ready')
APP='export function initializeApp(c,n){return {name:n}}; export function getApps(){return []}'
AUTH='''const listeners=[]; const makeUser=()=>({uid:'principal-uid',email:'ramsirkvs@gmail.com',getIdToken:async()=> 'principal'});const auth={currentUser:localStorage.getItem('officePrincipal')==='1'?makeUser():null}; export function getAuth(){return auth};export const browserLocalPersistence={};export async function setPersistence(){};export function onAuthStateChanged(a,cb){listeners.push(cb);cb(a.currentUser);return ()=>{}};export async function signInWithEmailAndPassword(a,email,password){if(email!=='ramsirkvs@gmail.com'||password!=='synthetic-principal')throw Error('Incorrect password');localStorage.setItem('officePrincipal','1');a.currentUser=makeUser();listeners.forEach(cb=>cb(a.currentUser));return {user:a.currentUser}};export async function signOut(a){localStorage.removeItem('officePrincipal');a.currentUser=null;listeners.forEach(cb=>cb(null))};'''
def sdk(route):
 route.fulfill(content_type='application/javascript',body=APP if route.request.url.endswith('firebase-app.js') else AUTH if route.request.url.endswith('firebase-auth.js') else 'export function getDatabase(){return {}}')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 admin=browser.new_context(viewport={'width':390,'height':844});admin.route('https://www.gstatic.com/firebasejs/**',sdk);admin.add_init_script("localStorage.setItem('officePrincipal','1')")
 page=admin.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'cbse-office.html#settings')
 page.get_by_role('heading',name='Office members — separate PIN list').wait_for()
 for name in ['Mr. Arjun Bori','Mr. Pramod Paswan','Mr. Sumit Puri']:
  page.get_by_label('Office PIN for '+name,exact=True).fill('123')
  page.get_by_label('Office PIN for '+name,exact=True).locator('..').locator('..').get_by_role('button').click()
  page.get_by_label('Office PIN for '+name,exact=True).locator('..').locator('..').locator('..').get_by_role('status').filter(has_text='Office PIN saved').wait_for()
 page.get_by_role('button',name='Office login / dashboards',exact=True).click();page.get_by_role('heading',name='Office member dashboards').wait_for();assert page.get_by_role('button',name='Open ASO dashboard').count()==1;assert page.get_by_role('button',name='Open JSA dashboard').count()==1
 page.get_by_role('button',name='Open SSA dashboard').click();page.get_by_role('heading',name='Mr. Pramod Paswan · SSA dashboard').wait_for()
 # One prepared register represents both workbook sheets; real workbook parsing is also tested in Node.
 prepared={'version':1,'memberId':'pramod-paswan','notes':'Synthetic office bank notes','rows':[{'task':'Pre-National audit Vidyalaya Level internal audit Paras','fund':'SF','voucherNo':'222','voucherDate':'2026-03-01','amount':'5000','details':'Synthetic audit voucher','objections':'Signed receipt required','sourceResponsible':'Mr. Jitender Paul\nSSA','chequeNo':'2876','bank':'SBI','chequeAmount':'5000','resolution':'','status':'pending','assignedIds':[],'sourceKey':'synthetic-browser:row1'}]}
 page.get_by_role('button',name='Import audit workbook / prepared register').click();dialog=page.locator('dialog[open]')
 from openpyxl import Workbook
 from io import BytesIO
 workbook=Workbook();sheet=workbook.active;sheet.title='SF';sheet.append([])
 for index,value in enumerate(['1','2026-03-01','2876','SBI','5000','1','222','4','1','36 SBI'],1):sheet.cell(5,index,value)
 vouchers=workbook.create_sheet('SF Vouchers')
 for index,value in enumerate(['222','2026-03-01','5000','Synthetic audit voucher','Signed receipt required','Mr. Jitender Paul\nSSA',''],1):vouchers.cell(4,index,value)
 buffer=BytesIO();workbook.save(buffer)
 dialog.locator('input[type=file]').set_input_files({'name':'synthetic-audit.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':buffer.getvalue()})
 dialog.get_by_text('1 combined records ready.',exact=False).wait_for()
 dialog.get_by_text('All voucher, cheque and responsibility details',exact=True).click()
 assert 'Cheque source: SF row 5' in dialog.inner_text()
 # Prepared JSON is an alternative single-file import, with the same review and PIN protections.
 dialog.locator('input[type=file]').set_input_files({'name':'combined.json','mimeType':'application/json','buffer':json.dumps(prepared).encode()});dialog.get_by_text('1 combined records ready.',exact=False).wait_for();dialog.get_by_role('button',name='Save reviewed import').click();page.get_by_role('status').filter(has_text='Combined register saved').wait_for()
 page.get_by_role('button',name='Publish to all staff',exact=True).click();page.get_by_role('status').filter(has_text='Published to the office staff view').wait_for()
 # Office staff use a separate session. Every save prompts again for this member's PIN.
 office=browser.new_context(viewport={'width':390,'height':844});office.route('https://www.gstatic.com/firebasejs/**',sdk);staff=office.new_page();staff.on('pageerror',lambda e:errors.append(str(e)));staff.goto(BASE+'cbse-office.html');staff.get_by_role('heading',name='Office login',exact=True).wait_for();staff.locator('[name=office-member]').select_option('pramod-paswan');staff.locator('[name=office-login-pin]').fill('123');staff.get_by_role('button',name='Office login',exact=True).click();staff.get_by_role('heading',name='Mr. Pramod Paswan · SSA dashboard').wait_for();assert staff.get_by_role('button',name='Publish to all staff',exact=True).count()==0
 staff.get_by_role('button',name='Add row / new task',exact=True).click();dialog=staff.locator('dialog[open]');dialog.locator('[name=details]').fill('Private new office task');dialog.locator('[name=objections]').fill('Pending Principal publication');dialog.locator('[name=assignedIds]').select_option('X:two');dialog.get_by_role('button',name='Save office record').click();pin=staff.get_by_role('dialog',name='Confirm office save',exact=True);pin.get_by_role('button',name='Cancel',exact=True).click();dialog.get_by_role('status').filter(has_text='PIN entry cancelled').wait_for();assert dialog.locator('[name=details]').input_value()=='Private new office task'
 dialog.get_by_role('button',name='Save office record').click();pin=staff.get_by_role('dialog',name='Confirm office save',exact=True);pin.locator('input').fill('999');pin.get_by_role('button',name='Confirm save').click();dialog.get_by_role('status').filter(has_text='office PIN is incorrect').wait_for();assert dialog.locator('[name=details]').input_value()=='Private new office task'
 dialog.get_by_role('button',name='Save office record').click();pin=staff.get_by_role('dialog',name='Confirm office save',exact=True);pin.locator('input').fill('123');pin.get_by_role('button',name='Confirm save').click();staff.get_by_role('status').filter(has_text='Office record saved.').wait_for()
 assert staff.evaluate('document.documentElement.scrollWidth<=innerWidth')
 # Published staff view uses the existing curtain and never leaks new office drafts.
 teacher=browser.new_context(viewport={'width':390,'height':844});teacher.route('https://www.gstatic.com/firebasejs/**',sdk);view=teacher.new_page();view.on('pageerror',lambda e:errors.append(str(e)));view.goto(BASE+'cbse-office.html#staff');view.locator('[name=office-staff-password]').fill('synthetic-view');view.get_by_role('button',name='Open staff office view',exact=True).click();view.get_by_role('button',name='Pre-National audit Vidyalaya Level internal audit Paras · Mr. Pramod Paswan').click();view.locator('[name=staff-office-teacher]').select_option('XII:linked');view.get_by_text('1 pending office notifications',exact=False).wait_for();assert 'Synthetic audit voucher' in view.locator('main').inner_text();assert 'Private new office task' not in view.locator('main').inner_text();view.screenshot(path='/tmp/office-staff-mobile.png',full_page=True);view.locator('[name=office-search]').fill('2876');assert view.locator('.office-card').count()==1;view.locator('[name=office-search]').fill('not-present');assert view.locator('.office-card').count()==0
 assert view.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.get_by_role('button',name='Publish to all staff',exact=True).click();page.get_by_role('status').filter(has_text='records changed').wait_for();page.get_by_role('button',name='Refresh records',exact=True).click();page.get_by_role('button',name='Publish to all staff',exact=True).click();page.get_by_role('status').filter(has_text='Published to the office staff view').wait_for()
 assert not errors,errors
 browser.close()
print('PASS mobile office PIN settings, dashboards, combined import, concerned-PIN saves, draft retention, Principal-only publication, staff notifications and search')
