"""Password settings regression checks with synthetic credentials and mocked Firebase."""
from playwright.sync_api import sync_playwright
APP = 'export function initializeApp(c){return c;} export function getApps(){return [];}'
AUTH = '''
const user={uid:'principal-test',email:'ramsirkvs@gmail.com'};
let listener;
const auth={currentUser:sessionStorage.getItem('testSignedIn')==='yes'?user:null};
export function getAuth(){return auth;}
export const browserLocalPersistence={};export async function setPersistence(){}
export function onAuthStateChanged(a,cb){listener=cb;cb(a.currentUser);}
export const EmailAuthProvider={credential:(email,password)=>({email,password})};
export async function reauthenticateWithCredential(u,c){
 window.__reauthCalls=(window.__reauthCalls||0)+1;
 if(c.email!==user.email || c.password!==(sessionStorage.getItem('testPassword')||'synthetic-old-password'))throw {code:'auth/invalid-credential'};
}
export async function updatePassword(u,password){
 window.__updateCalls=(window.__updateCalls||0)+1;
 if(window.__rejectUpdate)throw {code:'auth/weak-password'};
 sessionStorage.setItem('testPassword',password);
}
export async function signOut(a){a.currentUser=null;sessionStorage.removeItem('testSignedIn');listener?.(null);}
export async function signInWithEmailAndPassword(a,email,password){
 if(email!==user.email || password!==(sessionStorage.getItem('testPassword')||'synthetic-old-password'))throw {code:'auth/invalid-credential'};
 a.currentUser=user;sessionStorage.setItem('testSignedIn','yes');listener?.(user);
}
'''
DB = '''export function getDatabase(){return {}}export function ref(d,p){return p;}
export async function get(){return {val:()=>sessionStorage.getItem('testWrongRole')==='yes'?'other-user':'principal-test'};}
export function onValue(path,cb){cb({val:()=>null});return ()=>{};}
'''
def intercept(route):
    url=route.request.url
    route.fulfill(content_type='application/javascript',body=APP if url.endswith('firebase-app.js') else AUTH if url.endswith('firebase-auth.js') else DB)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page();page.route('https://www.gstatic.com/firebasejs/**',intercept)
    page.goto('http://127.0.0.1:8000/cbse-settings.html')
    page.locator('#settings-locked').wait_for(state='visible')
    assert page.locator('#settings-panel').is_hidden()
    page.evaluate("sessionStorage.setItem('testSignedIn','yes')")
    page.evaluate("sessionStorage.setItem('testWrongRole','yes')")
    page.reload();page.get_by_role('status').filter(has_text='does not have access').wait_for()
    assert page.locator('#settings-panel').is_hidden()
    page.evaluate("sessionStorage.removeItem('testWrongRole')")
    page.reload();page.locator('#settings-panel').wait_for(state='visible')
    assert page.locator('#password-form input[type=password]').count()==3
    assert page.locator('input[type=email]').count()==0
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    print('PASS settings locked for anonymous/wrong account; three password fields; responsive layout')
    def fill(old,new,confirmation=None):
        page.locator('#old-password').fill(old)
        page.locator('#new-password').fill(new)
        page.locator('#confirm-password').fill(confirmation or new)
        page.locator('#change-password').click()
    fill('synthetic-old-password','synthetic-new-password','mismatched-password')
    page.get_by_role('status').filter(has_text='do not match').wait_for()
    assert page.evaluate('window.__reauthCalls||0')==0
    fill('synthetic-old-password','synthetic-old-password')
    page.get_by_role('status').filter(has_text='different').wait_for()
    assert page.evaluate('window.__updateCalls||0')==0
    fill('wrong-old-password','synthetic-new-password')
    page.get_by_role('status').filter(has_text='old password is incorrect').wait_for()
    assert page.evaluate('window.__updateCalls||0')==0
    page.evaluate('window.__rejectUpdate=true')
    fill('synthetic-old-password','synthetic-new-password')
    page.get_by_role('status').filter(has_text='password requirements').wait_for()
    assert page.locator('#settings-panel').is_visible()
    print('PASS mismatched confirmation, unchanged password, incorrect old password and backend policy rejection')
    page.evaluate('window.__rejectUpdate=false')
    fill('synthetic-old-password','synthetic-new-password')
    page.get_by_role('status').filter(has_text='Password changed successfully').wait_for()
    assert page.locator('#settings-panel').is_visible()
    assert page.evaluate("sessionStorage.getItem('testSignedIn')")=='yes'
    assert page.locator('#old-password').input_value()==''
    assert page.locator('#new-password').input_value()==''
    assert page.locator('#confirm-password').input_value()==''
    page.goto('http://127.0.0.1:8000/cbse-admin.html')
    page.locator('#workspace').wait_for(state='visible')
    page.locator('#signout').click()
    page.wait_for_function('!document.querySelector("#login-button").disabled')
    page.locator('#login-password').fill('synthetic-old-password');page.locator('#login-button').click()
    page.get_by_role('status').filter(has_text='Password is incorrect').wait_for()
    assert page.locator('#workspace').is_hidden()
    page.locator('#login-password').fill('synthetic-new-password');page.locator('#login-button').click()
    page.locator('#workspace').wait_for(state='visible')
    assert page.get_by_role('link',name='Password Settings').is_visible()
    print('PASS password update preserves session; explicit sign-out, field clearing and new password login work')
    browser.close()
