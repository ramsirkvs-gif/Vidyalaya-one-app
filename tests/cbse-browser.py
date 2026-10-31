import json, tempfile, os
from playwright.sync_api import sync_playwright
# Synthetic students only: no real school records are used by this test.
seed={'schemaVersion':1,'revision':0,'streams':{'science':{'name':'Science'},'commerce':{'name':'Commerce'},'humanities':{'name':'Humanities'}},'classes':{}}
for cl,counts in [('X',[24,27,24,24]),('XII',[24,29,26,35,27])]:
 seed['classes'][cl]={'label':'Class '+cl,'sections':{}}
 for i,count in enumerate(counts):
  sec=chr(65+i); stream='' if cl=='X' else 'science' if i<2 else 'commerce' if i==2 else 'humanities'
  seed['classes'][cl]['sections'][sec.lower()]={'name':sec,'stream':stream,'subjects':{'english':{'name':'ENGLISH','code':''}},'students':{f'row_{n}':{'name':f'Synthetic Student {cl} {sec} {n}','roll':f'{cl}-{sec}-{n:03}','subjects':{'english':True}} for n in range(1,count+1)}}
fixture=tempfile.NamedTemporaryFile(mode='w',suffix='.json',delete=False)
json.dump(seed,fixture);fixture.close()
APP='export function initializeApp(c){return c;} export function getApps(){return [];}'
AUTH='''let listener; export function getAuth(){return {}} export const browserLocalPersistence={}; export async function setPersistence(){} export function onAuthStateChanged(a,cb){listener=cb;cb(null);} export async function signInWithEmailAndPassword(a,e,p){if(p!=="test-only-password")throw {code:"auth/invalid-credential"};if(e!=="ramsirkvs@gmail.com")throw Error("Principal account was not supplied automatically");window.__authUser={uid:"principal-test",email:e};listener(window.__authUser);} export async function signOut(){window.__authUser=null;listener(null);}'''
DB='''window.__dbData={};window.__reads=[];const listeners={};
export function getDatabase(){return {}} export function ref(d,path){return path;}
const snapshot=value=>({val:()=>structuredClone(value??null)});
export async function get(path){window.__reads.push(path);if(path==="cbse/adminUid")return snapshot(window.__wrongRole?"other-user":"principal-test");return snapshot(window.__dbData[path]);}
export function onValue(path,cb,error){window.__reads.push(path);(listeners[path]||=[]).push(cb);cb(snapshot(window.__dbData[path]));return ()=>{listeners[path]=listeners[path].filter(c=>c!==cb)};}
function notify(path){for(const cb of listeners[path]||[])cb(snapshot(window.__dbData[path]));}
export async function runTransaction(path,fn){const value=structuredClone(window.__dbData[path]??null);if(window.__staleNext){window.__staleNext=false;value.revision++;window.__dbData[path]=value;notify(path);}const next=fn(value);if(next===undefined)return {committed:false,snapshot:snapshot(value)};window.__dbData[path]=structuredClone(next);notify(path);return {committed:true,snapshot:snapshot(next)};}
export function serverTimestamp(){return Date.now();} export async function set(path,value){window.__dbData[path]=structuredClone(value);notify(path);} export async function remove(path){delete window.__dbData[path];notify(path);}
window.__emit=(path,value)=>{window.__dbData[path]=value;notify(path);};'''
def intercept(route):
 url=route.request.url
 body=APP if url.endswith('firebase-app.js') else AUTH if url.endswith('firebase-auth.js') else DB
 route.fulfill(content_type='application/javascript',body=body)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();page.route('https://www.gstatic.com/firebasejs/**',intercept)
 page.goto('http://127.0.0.1:8000/cbse-admin.html');page.wait_for_function('!document.querySelector("#login-button").disabled')
 assert page.locator('#workspace').is_hidden()
 assert page.locator('#login-form input').count()==1
 assert page.locator('#login-form input[type=password]').count()==1
 assert page.locator('#login-form input[type=email]').count()==0
 assert page.evaluate('window.__reads.length')==0
 page.locator('#login-password').fill('wrong-password');page.locator('#login-button').click();page.get_by_role('status').filter(has_text='incorrect').wait_for()
 assert page.locator('#workspace').is_hidden()
 page.evaluate('window.__wrongRole=true')
 page.locator('#login-password').fill('test-only-password');page.locator('#login-button').click();page.get_by_role('status').filter(has_text='not registered').wait_for()
 assert page.locator('#workspace').is_hidden()
 assert page.evaluate('!window.__reads.includes("cbse/draft")')
 page.locator('#signout').click();page.evaluate('window.__wrongRole=false')
 page.locator('#login-password').fill('test-only-password');page.locator('#login-button').click();page.locator('#workspace').wait_for(state='visible')
 page.locator('#backup-file').set_input_files(fixture.name);page.get_by_role('button',name='Replace private draft').click();page.wait_for_function('window.__dbData["cbse/draft"]?.revision===1')
 assert page.locator('#stats strong').first.inner_text()=='240'
 print('PASS authentication gate, wrong account denial, private import (240 records)')
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 print('PASS feeding layout at phone, tablet and desktop widths')
 page.locator('#add-record').click();page.locator('#editor input[name=name]').fill('Test Student');page.locator('#editor input[name=roll]').fill('TEST-001');page.locator('#editor input[name=subjects]').first.check();page.locator('#save-editor').click();page.locator('#editor').wait_for(state='hidden')
 page.locator('#student-search').fill('TEST-001');assert page.locator('#data-body tr').count()==1
 page.locator('#data-body button').filter(has_text='Edit').click();page.locator('#editor input[name=name]').fill('Edited Test Student');page.locator('#save-editor').click();page.locator('#editor').wait_for(state='hidden');assert 'Edited Test Student' in page.locator('#data-body').inner_text()
 page.locator('#data-body button').filter(has_text='Delete').click();page.get_by_role('button',name='Delete student',exact=True).click();page.locator('#review').wait_for(state='hidden');assert page.locator('#data-body tr').count()==0
 page.locator('#student-search').fill('')
 print('PASS student add, edit, subject selection, search and delete')
 page.locator('#tab-sections').click();page.locator('#add-record').click();page.locator('#editor input[name=name]').fill('Z');page.locator('#save-editor').click();page.locator('#editor').wait_for(state='hidden')
 row=page.locator('#data-body tr').filter(has=page.get_by_role('cell',name='Z',exact=True));row.get_by_role('button',name='Edit',exact=True).click();page.locator('#editor input[name=name]').fill('ZZ');page.locator('#save-editor').click();page.locator('#editor').wait_for(state='hidden')
 row=page.locator('#data-body tr').filter(has=page.get_by_role('cell',name='ZZ',exact=True));row.get_by_role('button',name='Delete',exact=True).click();page.get_by_role('button',name='Delete section and records').click();page.locator('#review').wait_for(state='hidden')
 print('PASS section add, rename and delete')
 page.locator('#tab-subjects').click();page.locator('#add-record').click();page.locator('#editor input[name=name]').fill('Test Subject');page.locator('#editor input[name=code]').fill('999');page.locator('#save-editor').click();page.locator('#editor').wait_for(state='hidden')
 row=page.locator('#data-body tr').filter(has_text='Test Subject');row.get_by_role('button',name='Edit',exact=True).click();page.locator('#editor input[name=name]').fill('Renamed Subject');page.locator('#save-editor').click();page.locator('#editor').wait_for(state='hidden')
 row=page.locator('#data-body tr').filter(has_text='Renamed Subject');row.get_by_role('button',name='Delete',exact=True).click();page.get_by_role('button',name='Delete subject',exact=True).click();page.locator('#review').wait_for(state='hidden')
 print('PASS subject add, rename and delete')
 page.locator('#tab-streams').click();page.locator('#add-record').click();page.locator('#editor input[name=name]').fill('Test Stream');page.locator('#save-editor').click();page.locator('#editor').wait_for(state='hidden')
 row=page.locator('#data-body tr').filter(has_text='Test Stream');row.get_by_role('button',name='Edit',exact=True).click();page.locator('#editor input[name=name]').fill('Edited Stream');page.locator('#save-editor').click();page.locator('#editor').wait_for(state='hidden')
 row=page.locator('#data-body tr').filter(has_text='Edited Stream');row.get_by_role('button',name='Delete',exact=True).click();page.get_by_role('button',name='Delete stream',exact=True).click();page.locator('#review').wait_for(state='hidden')
 print('PASS stream add, rename and delete')
 page.locator('#tab-students').click();page.locator('#add-record').click();page.locator('#editor input[name=name]').fill('Stale Student');page.locator('#editor input[name=roll]').fill('STALE-001');page.evaluate('window.__staleNext=true');page.locator('#save-editor').click();page.locator('#editor-error').wait_for(state='visible');assert 'Another session' in page.locator('#editor-error').inner_text();page.locator('#cancel-editor').click()
 print('PASS concurrent edit conflict prevents overwriting newer records')
 page.locator('#publish').click();page.get_by_role('button',name='Publish approved fields').click();page.locator('#review').wait_for(state='hidden');published=page.evaluate('window.__dbData["cbse/public"]');assert len(published['sections'])==9;assert sum(s['count'] for s in published['sections'].values())==240
 assert all(set(s)=={'name','roll'} for sec in published['sections'].values() for s in sec.get('students',{}).values())
 public=browser.new_page();public.route('https://www.gstatic.com/firebasejs/**',intercept);public.goto('http://127.0.0.1:8000/cbse-students.html');public.wait_for_function('typeof window.__emit === "function"');public.evaluate('data=>window.__emit("cbse/public",data)',published)
 assert public.locator('#public-body tr').count()==240
 for width in [360,768,1440]:
  public.set_viewport_size({'width':width,'height':900});assert public.evaluate('document.documentElement.scrollWidth <= innerWidth')
 public.locator('#public-class').select_option('XII');public.locator('#public-section').select_option('D');assert public.locator('#public-body tr').count()==35
 public.locator('#public-search').fill('Humanities');assert public.locator('#public-body tr').count()==35
 public.locator('#public-search').fill('ZZ-NO-SUCH-ROLL');assert public.locator('#public-body tr').count()==0
 public.locator('#public-search').fill('');public.evaluate('window.__emit("cbse/public",null)');assert public.locator('#public-body tr').count()==0
 print('PASS publication whitelist, 240-row public search, filters, live updates, unpublication and responsive layout')
 page.locator('#unpublish').click();page.get_by_role('button',name='Unpublish all',exact=True).last.click();page.locator('#review').wait_for(state='hidden');assert page.evaluate('window.__dbData["cbse/public"] === undefined')
 page.locator('#signout').click();page.locator('#login-panel').wait_for(state='visible');assert page.locator('#workspace').is_hidden();assert page.locator('#data-body').inner_text()==''
 print('PASS sign-out removes private DOM and closes protected workspace')
 browser.close()
os.unlink(fixture.name)
