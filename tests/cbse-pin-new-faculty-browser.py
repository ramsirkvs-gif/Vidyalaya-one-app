"""New faculty PINs appear from the server roster without a stale-page omission."""
from pathlib import Path
ns={};exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0],ns)
with ns['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.route('https://www.gstatic.com/firebasejs/**',ns['sdk']);calls=[]
 def api(route):
  d=route.request.post_data_json;calls.append(d)
  if d['action']=='list':
   assert d['generateMissing'] is True
   route.fulfill(json={'staff':{'X:one':{'name':'Synthetic Teacher','classId':'X','status':'active'},'XII:new_chemistry':{'name':'Synthetic New Chemistry Teacher','classId':'XII','status':'active'}},'access':{'X:one':{'enabled':True,'pinSet':True,'pin':'029'},'XII:new_chemistry':{'enabled':True,'pinSet':True,'pin':'047'}},'created':[{'staffId':'XII:new_chemistry','name':'Synthetic New Chemistry Teacher','pin':'047'}] if sum(c['action']=='list' for c in calls)==1 else []});return
  route.fulfill(json={'staff':[]})
 page.route('**/api/staff-access',api);page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-tools').wait_for(state='visible');page.locator('#mission-tools').evaluate('(e)=>e.open=true');page.locator('#mission-pin-settings').click();row=page.locator('#mission-pin-body tr').filter(has_text='Synthetic New Chemistry Teacher');row.wait_for();assert row.locator('input').input_value()=='047';assert row.locator('input').get_attribute('type')=='password';assert '2 active staff listed. 1 missing PIN' in page.locator('#mission-pin-message').inner_text();page.locator('#mission-show-pin-list').click();assert row.locator('input').get_attribute('type')=='text';assert row.locator('input').input_value()=='047';page.locator('#mission-close-pins').click();page.wait_for_function("document.querySelectorAll('#mission-pin-body input').length===0");assert page.locator('#mission-pin-body input').count()==0;page.locator('#mission-pin-settings').click();row.wait_for();assert row.locator('input').input_value()=='047';assert '0 missing PIN' in page.locator('#mission-pin-message').inner_text();print('PASS new faculty appears from current server roster, automatic missing-PIN request, masked list and Show/Hide, close clears values, reopen retains saved PIN.');b.close()
