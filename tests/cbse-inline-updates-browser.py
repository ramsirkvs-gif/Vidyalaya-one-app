"""Website deployment updates preserve inline meeting remarks before Save."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();version={'value':'old'}
 page.route('**/inline-update-test',lambda r:r.fulfill(content_type='text/html',body='<main><form data-portal-track-dirty="true"><textarea id="notes"></textarea></form></main><script type="module" src="/live-update.js?v=old"></script>'))
 page.route('**/app-version.json',lambda r:r.fulfill(json={'version':version['value']}));page.goto('http://127.0.0.1:8000/inline-update-test');page.locator('#notes').fill('Unsaved meeting remark');version['value']='new';page.evaluate("document.dispatchEvent(new Event('visibilitychange'))");page.locator('#portal-update-notice').wait_for(state='visible');assert page.locator('#notes').input_value()=='Unsaved meeting remark'
 version['value']='old';page.evaluate("document.querySelector('form').dataset.portalDirty='false'")
 with page.expect_navigation():page.evaluate("document.dispatchEvent(new Event('input'))")
 assert page.locator('#notes').input_value()==''
 print('PASS deployment waits for unsaved inline meeting remarks and applies once the form is clean')
 b.close()
