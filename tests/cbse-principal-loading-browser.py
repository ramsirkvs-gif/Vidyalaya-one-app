"""Principal dashboard skips staff/history loading and recovers from stalled auth."""
from playwright.sync_api import sync_playwright, expect
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844});calls=[];errors=[];stall_network=[False];held_routes=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/firebase-client.js',lambda r:r.fulfill(content_type='application/javascript',body="""
      export const auth={currentUser:{uid:'principal-test',getIdToken:async()=>{if(window.stallToken)await new Promise(()=>{});return 'synthetic-token';}},authStateReady:async()=>{if(window.stallAuth)await new Promise(()=>{});}};
    """))
    page.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js',lambda r:r.fulfill(content_type='application/javascript',body="export function onAuthStateChanged(auth,fn){fn(auth.currentUser);return ()=>{};}"))
    def api(route):
        body=route.request.post_data_json;calls.append(body)
        assert route.request.headers.get('authorization')=='Bearer synthetic-token'
        assert body['action']=='remember-view',body
        if stall_network[0]:
            held_routes.append(route);return
        route.fulfill(json={'ok':True})
    page.route('**/api/staff-access',api)
    page.goto('http://127.0.0.1:8000/cbse-roll-call-view.js')
    page.set_content('<link rel="stylesheet" href="/cbse.css"><main id="root"></main>')
    page.evaluate("""async()=>{
      const actual=setTimeout;window.setTimeout=(fn,ms,...args)=>actual(fn,[15000,20000].includes(ms)?150:ms,...args);
      window.sessions=[];addEventListener('chamber-principal-session',e=>sessions.push(e.detail));
      const {renderRollCall}=await import('/cbse-roll-call-view.js');window.rc=renderRollCall(document.querySelector('#root'),{deferOpen:true});
    }""")
    assert calls==[]
    page.evaluate('window.stallAuth=true;void rc.openPrincipal()')
    page.get_by_text('Principal connection timed out.',exact=False).wait_for()
    expect(page.get_by_role('button',name='Retry opening this section')).to_be_enabled()
    assert calls==[];assert page.evaluate('sessions.filter(s=>s.signedIn).length')==0
    page.evaluate('window.stallAuth=false;window.stallToken=true')
    page.get_by_role('button',name='Retry opening this section').click()
    page.wait_for_function('document.querySelector("#root").dataset.busy==="false"')
    assert calls==[];assert page.evaluate('sessions.filter(s=>s.signedIn).length')==0
    page.evaluate('window.stallToken=false')
    page.get_by_role('button',name='Retry opening this section').click()
    expect(page.locator('#root')).to_be_hidden()
    assert [c['action'] for c in calls]==['remember-view']
    assert page.evaluate('sessions.at(-1).signedIn')
    page.evaluate('void rc.openPrincipal()');page.wait_for_function('document.querySelector("#root").dataset.busy==="false"')
    assert len(calls)==2
    stall_network[0]=True
    page.evaluate('void rc.openPrincipal()')
    page.get_by_role('button',name='Retry opening this section').wait_for()
    expect(page.get_by_role('button',name='Retry opening this section')).to_be_enabled()
    stall_network[0]=False
    for held in held_routes:
        try:held.abort()
        except Exception:pass
    page.get_by_role('button',name='Retry opening this section').click()
    expect(page.locator('#root')).to_be_hidden()
    assert page.evaluate('sessions.at(-1).signedIn');assert not errors,errors
    browser.close()
print('PASS Principal entry skips staff/history/PIN setup, reuses login, and retries stalled auth/token without signing out')
