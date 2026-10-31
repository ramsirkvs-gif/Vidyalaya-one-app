"""Persistent Firebase API selection and deployment reloads using synthetic auth."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8001/'
VERSION=json.loads((Path(__file__).resolve().parent.parent/'public/app-version.json').read_text())['version']
APP='export function initializeApp(c){return c;} export function getApps(){return [];}'
AUTH='''
const user={uid:'principal-test',email:'ramsirkvs@gmail.com'};let listener;
const auth={currentUser:localStorage.getItem('persistentTestSession')?user:null};
export function getAuth(){return auth;}
export const browserLocalPersistence={type:'LOCAL'};
export async function setPersistence(a,p){if(p!==browserLocalPersistence)throw Error('Expected persistent local authentication');window.__persistenceMode='LOCAL';}
export function onAuthStateChanged(a,cb){listener=cb;cb(a.currentUser);}
export async function signInWithEmailAndPassword(a,e,p){if(e!==user.email||p!=='synthetic-password')throw {code:'auth/invalid-credential'};a.currentUser=user;localStorage.setItem('persistentTestSession','yes');listener?.(user);}
export async function signOut(a){a.currentUser=null;localStorage.removeItem('persistentTestSession');listener?.(null);}
window.addEventListener('storage',event=>{if(event.key==='persistentTestSession'){auth.currentUser=event.newValue?user:null;listener?.(auth.currentUser);}});
'''
DB='''export function getDatabase(){return {}}export function ref(d,p){return p;}export async function get(){return {val:()=> 'principal-test'}}export function onValue(p,cb){cb({val:()=>null});return ()=>{};}'''
def sdk(route):
    url=route.request.url
    route.fulfill(content_type='application/javascript',body=APP if url.endswith('firebase-app.js') else AUTH if url.endswith('firebase-auth.js') else DB)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context();context.route('https://www.gstatic.com/firebasejs/**',sdk)
    release={'version':VERSION}
    context.route('**/app-version.json',lambda route:route.fulfill(content_type='application/json',body=json.dumps(release)))
    page=context.new_page();page.goto(BASE+'cbse-admin.html');page.wait_for_function('!document.querySelector("#login-button").disabled')
    assert page.evaluate('window.__persistenceMode')=='LOCAL'
    page.locator('#login-password').fill('synthetic-password');page.locator('#login-button').click();page.locator('#workspace').wait_for(state='visible')
    page.get_by_role('link',name='Faculty & teacher roles').click();page.locator('#faculty-workspace').wait_for(state='visible');assert page.locator('#faculty-locked').is_hidden()
    page.goto(BASE+'cbse-settings.html');page.locator('#settings-panel').wait_for(state='visible');page.reload();page.locator('#settings-panel').wait_for(state='visible')
    second=context.new_page();second.goto(BASE+'cbse-faculty.html');second.locator('#faculty-workspace').wait_for(state='visible')
    page.goto(BASE+'cbse-admin.html');page.locator('#workspace').wait_for(state='visible')
    print('PASS one password login covers Students, Faculty, Settings, reloads and a second tab')
    page.locator('#add-record').click();page.locator('#editor input[name=name]').fill('Unsaved Synthetic Student')
    release['version']='new-deployment-test'
    page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    page.locator('#portal-update-notice').wait_for(state='visible');assert page.locator('#editor').is_visible();assert page.locator('#editor input[name=name]').input_value()=='Unsaved Synthetic Student'
    # The navigation represents loading the new deployment. Reset the mocked
    # manifest so the unchanged local fixture does not repeatedly reload.
    release['version']=VERSION
    with page.expect_navigation():page.locator('#cancel-editor').click()
    page.locator('#workspace').wait_for(state='visible');assert page.locator('#login-panel').is_hidden()
    print('PASS a deployment waits for the edit dialog to close, then reloads without signing out')
    page.evaluate("document.documentElement.dataset.portalBusy='true'")
    release['version']='another-deployment-test';page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    page.locator('#portal-update-notice').wait_for(state='visible');assert page.locator('#workspace').is_visible()
    page.evaluate("document.documentElement.dataset.portalBusy='false'")
    with page.expect_navigation():page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    release['version']=VERSION
    page.locator('#workspace').wait_for(state='visible')
    print('PASS a deployment waits for pending writes before reloading')
    page.locator('#signout').click();page.locator('#login-panel').wait_for(state='visible');second.locator('#faculty-locked').wait_for(state='visible');assert second.locator('#faculty-workspace').is_hidden()
    print('PASS explicit Sign out clears access across open tabs')
    browser.close()
