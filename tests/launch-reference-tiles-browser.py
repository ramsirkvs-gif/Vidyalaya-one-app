"""Reference images persist with old live catalogues; PIS becomes Samvida Sathi."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
catalogue={'old_pis':{'title':'KVS PERSONNEL INFORMATION SYSTEM (PIS)','note':'Old personnel portal','url':'https://pis.kvs.gov.in/'},'samagam':{'title':'KVS SAMAGAM','note':'Old icon catalogue','url':'https://samagam.kvs.gov.in/'},'mission':{'title':'CBSE BOARD EXAMINATION — PROGRESS MONITORING','note':'Old placeholder','url':'#'},'extra':{'title':'Student timetable viewer','note':'Keep other configured applications','url':'https://example.test/student-timetable'},'cbse':{'title':'CBSE OFFICIAL WEBSITE','note':'CBSE resources','url':'https://www.cbse.gov.in/'}}
def sdk(route):
 if route.request.url.endswith('firebase-app.js'):body='export const initializeApp=()=>({});'
 else:body='export const getDatabase=()=>({}),ref=()=>({}),onValue=(_,cb)=>cb({val:()=>('+json.dumps(catalogue)+')});'
 route.fulfill(content_type='application/javascript',body=body)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1100});page.route('https://www.gstatic.com/firebasejs/**',sdk);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/index.html');
 try:page.get_by_text('Keep other configured applications',exact=True).wait_for(timeout=8000)
 except Exception:
  print('errors',errors,'body',page.locator('body').inner_text()[-2000:],flush=True);raise
 assert page.locator('.launch-reference-card').count()==15
 assert page.locator('a[href="https://example.test/student-timetable"]').count()==1
 assert page.locator('a[href="https://pis.kvs.gov.in/"]').count()==0
 assert page.locator('a[href="https://samvida-sathi.kvs.gov.in/"]').count()==1
 for url in ['https://www.cbse.gov.in/','https://igotkarmayogi.gov.in/#/','https://ncert.nic.in/?ln=en','https://diksha.gov.in/index.html','https://ciet.ncert.gov.in/nishtha']:
  assert page.locator('a[href="'+url+'"] .launch-tile-image').count()==1
 assert page.locator('a[href="cbse-mission.html"]').count()==1
 for img in page.locator('.launch-tile-image').all():img.scroll_into_view_if_needed();img.evaluate('(n)=>n.loading="eager"')
 page.wait_for_function('[...document.querySelectorAll(".launch-tile-image")].every(n=>n.complete&&n.naturalWidth>0)')
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('.launch-reference-card').count()==15
 page.evaluate('scrollTo(0,0)');page.screenshot(path='/tmp/launch-tiles-desktop.png',full_page=True);page.set_viewport_size({'width':390,'height':1000});page.screenshot(path='/tmp/launch-tiles-mobile.png',full_page=True)
 assert not errors,errors;b.close()
print('PASS fifteen PDF image tiles, Samvida URL, PIS removal, old live catalogue, existing links and mobile/tablet/desktop layout')
