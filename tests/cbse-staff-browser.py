"""Verified staff page workflow with synthetic API/SDK responses."""
import json
from playwright.sync_api import sync_playwright
APP="const apps=[];export function initializeApp(c,name){const a={name,options:c};apps.push(a);return a;}export function getApps(){return apps;}"
AUTH="""const user={uid:'staff-test',getIdToken:async()=> 'mock-staff-token'};const states={};let cb;export const browserLocalPersistence={};export async function setPersistence(){}export function getAuth(app){return states[app.name]||=( {currentUser:null} );}export function onAuthStateChanged(a,listener){cb=listener;listener(a.currentUser);}export async function signInWithCustomToken(a,token){if(token!=='mock-custom-token')throw Error('Invalid mock token');a.currentUser=user;cb(user);}export async function signOut(a){a.currentUser=null;cb(null);} """
DB='export function getDatabase(){return {}}'
comments=[];denied={'value':False}
def sdk(route):
 url=route.request.url;route.fulfill(content_type='application/javascript',body=APP if url.endswith('firebase-app.js') else AUTH if url.endswith('firebase-auth.js') else DB)
def api(route):
 data=route.request.post_data_json;action=data['action'];status=200
 if action=='directory':body={'staff':[{'id':'X:one','name':'Synthetic Teacher','role':'Class X faculty'}]}
 elif action=='login':body={'customToken':'mock-custom-token','name':'Synthetic Teacher'}
 elif denied['value']:status=403;body={'error':'Staff access has been disabled.'}
 elif action=='students':body={'staff':'Synthetic Teacher','students':[{'key':'X:a:one','name':'Synthetic Student','roll':'001','classId':'X','section':'A','assigned':True}]}
 elif action=='profile':body={'student':{'key':'X:a:one','name':'Synthetic Student','roll':'001','classId':'X','section':'A'},'assigned':True,'progress':{'academic':'green','attendance':95,'subjects':[{'name':'English','latest':{'score':85,'maximum':100,'absent':False},'band':'green'}]},'contact':None,'tasks':[],'records':comments.copy()}
 elif action=='comment':comments.append({'date':'2026-10-31','authorName':'Synthetic Teacher','notes':data['notes']});body={'ok':True}
 else:body={'ok':True}
 route.fulfill(status=status,content_type='application/json',body=json.dumps(body))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();page.route('https://www.gstatic.com/firebasejs/**',sdk);page.route('**/api/staff-access',api)
 page.goto('http://127.0.0.1:8000/cbse-staff.html?student=X%3Aa%3Aone');page.wait_for_function('!document.querySelector("#staff-enter").disabled')
 page.locator('#staff-name').select_option('X:one');page.locator('#staff-pin').fill('654321');page.locator('#staff-enter').click();page.locator('#staff-workspace').wait_for(state='visible');page.get_by_role('heading',name='Synthetic Student',exact=True).wait_for(state='visible');assert page.locator('#staff-pin').input_value()==''
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('textarea[name=progress-comment]').fill('Synthetic verified progress comment');page.get_by_role('button',name='Save progress comment').click();page.get_by_text('Synthetic verified progress comment',exact=True).wait_for(state='visible');assert comments[0]['authorName']=='Synthetic Teacher'
 denied['value']=True;page.locator('textarea[name=progress-comment]').fill('Should not save');page.get_by_role('button',name='Save progress comment').click();page.locator('#staff-login').wait_for(state='visible');assert page.locator('#staff-workspace').is_hidden();assert page.locator('#staff-profile').inner_text()=='';assert len(comments)==1
 print('PASS PIN entry, direct student link, assigned progress, verified comment, responsive layout and revoked-access cleanup')
 browser.close()
