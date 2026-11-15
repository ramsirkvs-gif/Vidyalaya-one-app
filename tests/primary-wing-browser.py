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
        page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'cbse-primary-roster.js');page.set_content('<link rel="stylesheet" href="/cbse.css"><link rel="stylesheet" href="/cbse-roll-call.css"><main class="roll-workspace" id="root"></main>')
        page.evaluate('''async()=>{const {renderRollPrincipalDashboard}=await import('/cbse-roll-call-principal.js');window.primaryApi=async body=>{const r=await fetch('/api/staff-access',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer principal'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};window.drawPrimary=()=>{document.querySelector('#root').replaceChildren();renderRollPrincipalDashboard(document.querySelector('#root'),{data:{rollCall:{reports:{}},serverDate:'2026-11-15'},state:{scope:'settings',tab:'pins'},api:window.primaryApi,run:async fn=>fn(),refresh:async()=>{},close:()=>{},signout:()=>{}});};window.drawPrimary();}''')
        page.locator('[name=principal-pin-wing]').wait_for();page.locator('[name=principal-pin-wing]').select_option('primary')
        cards=page.locator('.roll-status-card');assert cards.count()==28;assert cards.first.locator('strong').inner_text()=='1. Mr. Rohtash';assert cards.last.locator('strong').inner_text().endswith('Mr. Panjib Sarkar')
        assert cards.first.locator('input').get_attribute('type')=='password';assert len(cards.first.locator('input').input_value())==3
        cards.first.get_by_role('button',name='Show PIN',exact=True).click();assert cards.first.locator('input').get_attribute('type')=='text';cards.first.get_by_role('button',name='Hide PIN',exact=True).click()
        preserved=page.evaluate("async()=>{const r=await primaryApi({action:'list'});return r.access['X:one'].pin==='123'&&r.access['X:two'].pin==='456';}");assert preserved
        all_pins=page.evaluate("async()=>{const r=await primaryApi({action:'list'});return Object.entries(r.staff).filter(([,p])=>p.wing==='primary').map(([id])=>r.access[id].pin);}");assert len(set(all_pins))==28;assert not {'123','456'}&set(all_pins)
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        public=page.evaluate("async()=>primaryApi({action:'chamber-principal',operation:'read'})");assert len([p for p in public['staff'].values() if p['wing']=='primary'])==28;assert all('pin' not in p for p in public['staff'].values())
        page.evaluate('window.drawPrimary()');page.locator('[name=principal-pin-wing]').wait_for();assert '0 new profiles' in page.locator('#root').inner_text()
        page.set_content('<link rel="stylesheet" href="/cbse.css"><link rel="stylesheet" href="/cbse-roll-call.css"><main id="root"></main>')
        page.evaluate('''async()=>{const {renderRollCall}=await import('/cbse-roll-call-view.js');renderRollCall(document.querySelector('#root'));}''')
        page.locator('[name=roll-view-password]').fill('synthetic-view');page.get_by_role('button',name='Open Roll Call',exact=True).click()
        page.get_by_role('button',name='Morning Roll Call reporting',exact=True).click();page.locator('[name=roll-reporting-wing]').select_option('primary')
        register=page.locator('.roll-daily-register .roll-staff-row');register.first.wait_for();assert register.count()==28;assert register.first.locator('strong').inner_text()=='Mr. Rohtash'
        register.first.get_by_role('button',name='Submit Roll Call for Mr. Rohtash',exact=True).click();page.locator('[name=roll-morning-mode]').wait_for()
        assert page.locator('[name=principal-pin-wing]').count()==0;assert page.locator('[name^=principal-pin-]').count()==0
        assert not errors,errors;browser.close()
        print('PASS protected 28-person Primary PIN list, original Mission PINs retained, unique new PINs, idempotent setup and mobile layout')
finally:
    server.terminate();server.wait(timeout=10)
