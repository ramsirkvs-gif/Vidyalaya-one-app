"""Unified, touch-friendly public dashboard with synthetic published data."""
import json
from playwright.sync_api import sync_playwright
PUB={'schemaVersion':1,'publishedAt':1793400000000,'includesStudents':True,'sections':{
 'X_a':{'classId':'X','section':'A','stream':'','count':2,'students':{'one':{'name':'Synthetic Alpha','roll':'10001'},'two':{'name':'Synthetic Beta','roll':'10002'}}},
 'XII_c':{'classId':'XII','section':'C','stream':'Commerce','count':1,'students':{'three':{'name':'Synthetic Gamma','roll':'12003'}}}}}
APP='export function initializeApp(c){return {options:c}}export function getApps(){return [];}'
AUTH='export function getAuth(){return {}}export const browserLocalPersistence={};export async function setPersistence(){}export function onAuthStateChanged(a,cb){cb(null);}export async function signOut(){}'
DB='''window.__reads=[];export function getDatabase(){return {}}export function ref(d,p){return p;}export async function get(p){window.__reads.push(p);throw Error('Private read attempted');}export function onValue(p,cb,error){window.__reads.push(p);if(window.__offline){error({code:'unavailable'});return ()=>{};}const data=DATA;if(window.__countsOnly)for(const s of Object.values(data.sections))delete s.students;cb({val:()=>window.__empty?null:data});return ()=>{};}'''.replace('DATA',json.dumps(PUB))
def sdk(route):
 url=route.request.url;route.fulfill(content_type='application/javascript',body=APP if url.endswith('firebase-app.js') else AUTH if url.endswith('firebase-auth.js') else DB)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();page.route('https://www.gstatic.com/firebasejs/**',sdk)
 page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-message').filter(has_text='Published school information').wait_for()
 assert page.locator('#mission-summary .summary-item strong').first.inner_text()=='3'
 assert page.locator('#mission-tools').is_hidden();assert page.locator('#mission-manage').is_hidden();assert page.get_by_role('link',name='Published search',exact=True).count()==0
 for width in [320,360,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width<760:
   assert page.locator('.mobile-mission-nav').is_visible()
   for b in page.locator('.mobile-mission-nav button').all():assert b.bounding_box()['height']>=44
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/tmp/mission-public-mobile.png',full_page=True)
 page.locator('#mission-search-input').fill('XA');page.locator('#mission-global-search').evaluate('node=>node.requestSubmit()');page.wait_for_function('document.querySelectorAll(".student-card").length===2')
 page.get_by_role('button',name='Synthetic Alpha',exact=True).click();page.get_by_role('heading',name='Synthetic Alpha',exact=True).wait_for();assert 'Roll 10001' in page.locator('#mission-view').inner_text();assert page.get_by_role('button',name='Record marks',exact=True).count()==0
 page.locator('#mobile-mission-search').click();page.locator('#mission-search-input').fill('Commerce');page.locator('#mission-global-search').evaluate('node=>node.requestSubmit()');page.wait_for_function('document.querySelectorAll(".student-card").length===1');assert page.get_by_role('button',name='Synthetic Gamma',exact=True).is_visible()
 assert page.evaluate('window.__reads')==['cbse/public']
 page.goto('http://127.0.0.1:8000/cbse-students.html?q=Synthetic');page.wait_for_url('**/cbse-mission.html#*');page.wait_for_function('document.querySelectorAll(".student-card").length===3')
 print('PASS one public URL, legacy redirect, global search, XA shorthand, profiles, touch targets and no private reads')
 counts=browser.new_page();counts.add_init_script('window.__countsOnly=true');counts.route('https://www.gstatic.com/firebasejs/**',sdk);counts.goto('http://127.0.0.1:8000/cbse-mission.html');counts.locator('#mission-summary .summary-item strong').first.filter(has_text='3').wait_for();counts.get_by_role('button',name='Class X',exact=True).click();counts.get_by_role('heading',name='Class X zone').wait_for();assert counts.locator('.stat strong').first.inner_text()=='2'
 empty=browser.new_page();empty.add_init_script('window.__empty=true');empty.route('https://www.gstatic.com/firebasejs/**',sdk);empty.goto('http://127.0.0.1:8000/cbse-mission.html');empty.get_by_text('Published information is not available yet',exact=True).wait_for();assert empty.locator('#mission-summary .summary-item strong').first.inner_text()=='—'
 offline=browser.new_page();offline.add_init_script('window.__offline=true');offline.route('https://www.gstatic.com/firebasejs/**',sdk);offline.goto('http://127.0.0.1:8000/cbse-mission.html');offline.locator('#mission-message').filter(has_text='currently unavailable').wait_for();assert offline.locator('#mission-summary .summary-item strong').first.inner_text()=='—'
 print('PASS counts-only publication, honest empty state and connection errors without false zero counts')
 browser.close()
