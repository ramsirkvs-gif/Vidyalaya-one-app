from pathlib import Path
from playwright.sync_api import sync_playwright
# Include an older live catalogue: it must not remove or reorder the bundled Chamber tile.
def sdk(route):
 body='export const initializeApp=()=>({});' if route.request.url.endswith('firebase-app.js') else 'export const getDatabase=()=>({}),ref=()=>({}),onValue=(_,cb)=>cb({val:()=>({samagam:{title:"KVS SAMAGAM",note:"Old catalogue",url:"https://samagam.kvs.gov.in/"}})});'
 route.fulfill(content_type='application/javascript',body=body)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.route('https://www.gstatic.com/firebasejs/**',sdk);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8000/index.html');page.wait_for_function('document.querySelector(".principal-chamber-entry")!==null');assert page.locator('.grid>.app-card h3').all_text_contents()[:3]==['KVS SAMAGAM','ONLINE -Principal Chamber','TIMETABLE & SCHOOL DUTY HUB'];assert page.locator('#principal-chamber').is_hidden()
 page.locator('.principal-chamber-entry').click();page.locator('#chamber-title').wait_for();assert page.locator('section[aria-labelledby=apps-title]').is_hidden();assert page.locator('#chamber-title').inner_text()=='Online Principal Chamber';assert 'CCLE-TPE Monitoring and Support' in page.locator('.chamber-heading').inner_text();assert page.locator('.chamber-mini-tiles>a').count()==1;assert page.locator('.chamber-mini-tiles>a').get_attribute('href')=='#principal-chamber';assert 'Roll Call' in page.locator('.chamber-mini-tiles').inner_text();assert page.locator('#principal-chamber img').evaluate('(img)=>img.complete && img.naturalWidth>0');assert page.locator('.brand-name').inner_text()=='Vidyalaya One'
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.get_by_role('link',name='← All school applications',exact=True).click();page.locator('#principal-chamber').wait_for(state='hidden');assert page.locator('#principal-chamber').is_hidden();assert page.locator('section[aria-labelledby=apps-title]').is_visible();page.set_viewport_size({'width':390,'height':844});page.locator('.principal-chamber-entry').scroll_into_view_if_needed();page.screenshot(path='/tmp/online-principal-chamber-tile.png');assert not errors,errors;b.close()
print('PASS Chamber tile second after Samagam, old catalogue preservation, clean portrait page, back navigation and responsive layout')
