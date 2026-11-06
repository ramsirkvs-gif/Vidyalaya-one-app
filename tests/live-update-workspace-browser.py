"""Deployment updates wait for working screens and preserve routes on explicit update."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context();ctx.add_init_script("try{sessionStorage.setItem('test-document-loads',String(Number(sessionStorage.getItem('test-document-loads')||0)+1))}catch{}")
 ctx.route('**/app-version.json',lambda r:r.fulfill(json={'version':'new'}));ctx.route('**/cbse-mission.html',lambda r:r.fulfill(content_type='text/html',body='<main><h1>Working question paper</h1><section data-mcq-workspace><input id="filter" value="Electricity"><form data-portal-track-dirty="true"><textarea id="notes"></textarea></form></section></main><script type="module" src="/live-update.js?v=old"></script>'))
 page=ctx.new_page();page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq&mcqClass=X&mcq=paper');page.locator('#portal-update-notice').wait_for();assert page.evaluate("sessionStorage.getItem('test-document-loads')")=='1';assert page.locator('#filter').input_value()=='Electricity';assert 'mcq=paper' in page.url;page.locator('#notes').fill('Unsaved question');assert page.locator('#portal-update-notice button').is_disabled();assert page.evaluate("sessionStorage.getItem('test-document-loads')")=='1'
 page.locator('#notes').fill('');page.evaluate('document.querySelector("form").dataset.portalDirty="false"');page.locator('h1').click();page.wait_for_function('!document.querySelector("#portal-update-notice button").disabled');page.locator('#portal-update-notice button').click();page.wait_for_function('sessionStorage.getItem("test-document-loads")==="2"');assert 'mcq=paper' in page.url
 # Idle read-only launch pages continue to receive automatic updates.
 idle=b.new_context();idle.add_init_script("try{sessionStorage.setItem('test-idle-loads',String(Number(sessionStorage.getItem('test-idle-loads')||0)+1))}catch{}");idle.route('**/app-version.json',lambda r:r.fulfill(json={'version':'new'}));hits=[0]
 def index(route):
  hits[0]+=1;version='old' if hits[0]==1 else 'new';route.fulfill(content_type='text/html',body='<main>Launch page</main><script type="module" src="/live-update.js?v='+version+'"></script>')
 idle.route('**/index.html',index);ip=idle.new_page();ip.goto('http://127.0.0.1:8000/index.html');ip.wait_for_function('sessionStorage.getItem("test-idle-loads")==="2"');b.close()
print('PASS deployments wait in an active workspace, protect unsaved inputs, update only when ready, retain the route and still refresh idle launch pages')
