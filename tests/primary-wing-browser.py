"""Protected Primary Settings against the real service with a synthetic database."""
import subprocess, socket, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
with socket.socket() as probe:
    probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
BASE='http://127.0.0.1:'+str(port)+'/'
server=subprocess.Popen(['node','tests/task-manager-browser-server.mjs'],cwd=ROOT,env={**os.environ,'TASK_BROWSER_PORT':str(port)},stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
    assert 'READY' in server.stdout.readline(),server.stderr.read()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        # Enter as staff first: no Principal screen or PIN Settings has run yet.
        direct=browser.new_page(viewport={'width':390,'height':844})
        direct.goto(BASE+'cbse-primary-roster.js');direct.set_content('<main id="root"></main>')
        direct.evaluate('''async()=>{const {renderRollCall}=await import('/cbse-roll-call-view.js');renderRollCall(document.querySelector('#root'));}''')
        direct.locator('[name=roll-view-password]').fill('synthetic-view');direct.get_by_role('button',name='Open Roll Call',exact=True).click()
        direct.get_by_role('button',name='Morning Roll Call reporting',exact=True).click();direct.locator('[name=roll-reporting-wing]').select_option('primary')
        direct_rows=direct.locator('.roll-daily-register .roll-staff-row');direct_rows.first.wait_for();assert direct_rows.count()==29
        assert direct_rows.first.locator('strong').inner_text()=='Mr. Rothash'
        assert direct_rows.last.locator('strong').inner_text()=='Mr. Bibek Kumar Dubey'
        search=direct.get_by_role('searchbox',name='Search by name')
        search.fill('bibek');assert direct.locator('.roll-daily-register .roll-staff-row:visible').count()==1
        assert 'Bibek Kumar Dubey' in direct.locator('.roll-daily-register .roll-staff-row:visible').inner_text()
        search.fill('NO SUCH NAME');assert direct.locator('.roll-daily-register .roll-staff-row:visible').count()==0
        search.fill('')
        assert direct.locator('.roll-leave-register').count()==0

        direct_rows.first.get_by_role('button',name='Submit Roll Call for Mr. Rothash',exact=True).click();direct.locator('[name=roll-morning-mode]').wait_for()
        direct.get_by_role('button',name='← Back to staff list',exact=True).last.click()
        direct.get_by_role('button',name='← Back to Roll Call menu',exact=True).click()
        direct.get_by_role('button',name='Afternoon Roll Call',exact=True).click()
        for wing,query in [('primary','bibek'),('secondary','avinash')]:
            direct.locator('[name=roll-reporting-wing]').select_option(wing)
            direct.get_by_role('searchbox',name='Search by name').fill(query)
            visible=direct.locator('.roll-daily-register .roll-staff-row:visible')
            assert visible.count()==1;assert query in visible.inner_text().lower()
            assert direct.locator('.roll-leave-register').count()==0
        direct.get_by_role('button',name='← Back to Roll Call menu',exact=True).click()
        direct.get_by_role('button',name='Morning Roll Call reporting',exact=True).click()
        direct.get_by_role('searchbox',name='Search by name').fill('avinash')
        assert direct.locator('.roll-daily-register .roll-staff-row:visible').count()==1
        direct.close()
        page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'cbse-primary-roster.js');page.set_content('<link rel="stylesheet" href="/cbse.css"><link rel="stylesheet" href="/cbse-roll-call.css"><main class="roll-workspace" id="root"></main>')
        page.evaluate('''async()=>{const {renderRollPrincipalDashboard}=await import('/cbse-roll-call-principal.js');window.holdPINGeneration=true;window.primaryApi=async body=>{if(body.generateMissing&&window.holdPINGeneration)await new Promise(resolve=>window.releasePINGeneration=()=>{window.holdPINGeneration=false;resolve();});const r=await fetch('/api/staff-access',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer principal'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};window.drawPrimary=()=>{document.querySelector('#root').replaceChildren();renderRollPrincipalDashboard(document.querySelector('#root'),{data:{rollCall:{reports:{}},serverDate:'2026-11-15'},state:{scope:'settings',tab:'pins'},api:window.primaryApi,run:async fn=>fn(),refresh:async()=>{},close:()=>{},signout:()=>{}});};window.drawPrimary();}''')
        page.locator('[name=principal-pin-wing]').wait_for()
        assert page.locator('.roll-status-card').count()>0
        assert 'Generating only missing staff PINs' in page.locator('#root').inner_text()
        page.evaluate('window.releasePINGeneration()')
        page.get_by_text('missing staff PIN(s) prepared.',exact=False).wait_for();page.locator('[name=principal-pin-wing]').select_option('primary')
        cards=page.locator('.roll-status-card');assert cards.count()==29;assert cards.first.locator('strong').inner_text()=='1. Mr. Rothash';assert cards.last.locator('strong').inner_text().endswith('Mr. Bibek Kumar Dubey')
        assert cards.first.locator('input').get_attribute('type')=='password';assert len(cards.first.locator('input').input_value())==3
        cards.first.get_by_role('button',name='Show PIN',exact=True).click();assert cards.first.locator('input').get_attribute('type')=='text';cards.first.get_by_role('button',name='Hide PIN',exact=True).click()
        preserved=page.evaluate("async()=>{const r=await primaryApi({action:'list'});return r.access['X:one'].pin==='123'&&r.access['X:two'].pin==='456';}");assert preserved
        all_pins=page.evaluate("async()=>{const r=await primaryApi({action:'list'});return Object.entries(r.staff).filter(([,p])=>p.wing==='primary').map(([id])=>r.access[id].pin);}");assert len(set(all_pins))==29;assert not {'123','456'}&set(all_pins)
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        public=page.evaluate("async()=>primaryApi({action:'chamber-principal',operation:'read'})");assert len([p for p in public['staff'].values() if p['wing']=='primary'])==29;assert all('pin' not in p for p in public['staff'].values())
        page.locator('[name=principal-pin-wing]').select_option('primary')
        with page.expect_download() as download_info:
            page.get_by_role('button',name='Download PIN list (CSV)',exact=True).click()
        csv_text=Path(download_info.value.path()).read_text(encoding='utf-8-sig')
        assert 'Mr. Bibek Kumar Dubey' in csv_text;assert len(csv_text.splitlines())==30
        page.evaluate('window.drawPrimary()');page.locator('[name=principal-pin-wing]').wait_for();assert 'Existing portal PINs are kept unchanged' in page.locator('#root').inner_text()
        # A generation failure must leave the existing PIN list available.
        def fail_generation(route):
            request=route.request.post_data_json
            if request.get('action')=='list' and request.get('generateMissing'):
                route.fulfill(status=503,json={'error':'Synthetic generation unavailable'})
            elif request.get('action')=='list':
                response=route.fetch();payload=response.json()
                primary_id=next(id for id,p in payload['staff'].items() if p.get('wing')=='primary')
                payload['access'].pop(primary_id,None)
                route.fulfill(response=response,json=payload)
            else:
                route.continue_()
        page.route('**/api/staff-access',fail_generation)
        page.evaluate('window.drawPrimary()');page.locator('[name=principal-pin-wing]').wait_for()
        page.get_by_text('Existing PINs are shown, but missing PINs could not be generated:',exact=False).wait_for()
        page.locator('[name=principal-pin-wing]').select_option('primary')
        assert page.locator('.roll-status-card').count()==29
        page.unroute('**/api/staff-access',fail_generation)
        page.set_content('<link rel="stylesheet" href="/cbse.css"><link rel="stylesheet" href="/cbse-roll-call.css"><main id="root"></main>')
        page.evaluate('''async()=>{const {renderRollCall}=await import('/cbse-roll-call-view.js');renderRollCall(document.querySelector('#root'));}''')
        page.locator('[name=roll-view-password]').fill('synthetic-view');page.get_by_role('button',name='Open Roll Call',exact=True).click()
        page.get_by_role('button',name='Morning Roll Call reporting',exact=True).click();page.locator('[name=roll-reporting-wing]').select_option('primary')
        register=page.locator('.roll-daily-register .roll-staff-row');register.first.wait_for();assert register.count()==29;assert register.first.locator('strong').inner_text()=='Mr. Rothash'
        register.first.get_by_role('button',name='Submit Roll Call for Mr. Rothash',exact=True).click();page.locator('[name=roll-morning-mode]').wait_for()
        assert page.locator('[name=principal-pin-wing]').count()==0;assert page.locator('[name^=principal-pin-]').count()==0
        page.evaluate("""async()=>{const {renderReportedLeaveRegister}=await import('/cbse-roll-call-register.js');const {renderRollPending}=await import('/cbse-roll-call-pending.js');const root=document.querySelector('#root');root.replaceChildren();const data={serverDate:'2026-11-15',staff:{p:{name:'Mr. Rothash',wing:'primary'},s:{name:'Synthetic Secondary',wing:'secondary'}},rollCall:{reports:{},advanceLeaves:{p:{staffId:'p',name:'Mr. Rothash',wing:'primary',dates:['2026-11-15'],status:'pending'},s:{staffId:'s',name:'Synthetic Secondary',wing:'secondary',dates:['2026-11-15'],status:'pending'}}}};renderReportedLeaveRegister(root,data,'primary');renderRollPending(root,data,()=>{},{wing:'primary'});} """)
        assert page.locator('.roll-leave-register tbody tr').count()==1
        assert 'Synthetic Secondary' not in page.locator('#root').inner_text()
        assert page.locator('[name=roll-pending-wing]').input_value()=='primary'
        assert not errors,errors;browser.close()
        print('PASS protected 29-person Primary PIN list, original Mission PINs retained, unique new PINs, idempotent setup and mobile layout')
finally:
    server.terminate();server.wait(timeout=10)
