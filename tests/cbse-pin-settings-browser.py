"""Principal PIN settings controls with synthetic staff and mocked server."""
from pathlib import Path
exec(Path('tests/cbse-teacher-monitoring-browser.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page();page.route('https://www.gstatic.com/firebasejs/**',sdk)
 calls=[]
 def access(route):
  body=route.request.post_data_json;calls.append(body)
  if body['action']=='import-pins' and sum(c['action']=='import-pins' for c in calls)==1:
   route.fulfill(status=500,content_type='text/plain',body='A server error has occurred');return
  if body['action']=='add-faculty-pin':
   route.fulfill(json={'ok':True,'classId':body['classId'],'teacherId':'newperson','teacher':{k:body[k] for k in ['name','designation','subjects','teachingSections']}|{'status':'active'},'revision':2,'access':{'enabled':True,'pinSet':True}});return
  response={'access':{'X:one':{'enabled':True,'pinSet':True,'pin':'029'}} if sum(c['action']=='import-pins' for c in calls)>1 else {}} if body['action']=='list' else {'created':[{'staffId':'X:one','name':'Synthetic Teacher','pin':'347'}]} if body['action']=='generate-pins' else {'ok':True,'updated':1,'access':{'X:one':{'enabled':True,'pinSet':True}}} if body['action']=='import-pins' else {'ok':True}
  route.fulfill(json=response)
 page.route('**/api/staff-access',access)
 page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-tools').wait_for(state='visible');page.locator('#mission-tools').evaluate('(e)=>e.open=true')
 page.locator('#mission-pin-settings').click();page.locator('#mission-generate-pins').click();page.wait_for_function("document.querySelector('#mission-pin-body input')?.value==='347'");pin=page.locator('#mission-pin-body input');assert pin.input_value()=='347'
 page.get_by_role('button',name='Show',exact=True).click();assert pin.get_attribute('type')=='text';pin.fill('29');page.get_by_role('button',name='Save PIN',exact=True).click();assert 'exactly three' in page.locator('#mission-pin-message').inner_text();pin.fill('029');page.get_by_role('button',name='Save PIN',exact=True).click();page.wait_for_function("document.getElementById('mission-pin-message').textContent.includes('PIN saved')");assert calls[-1]['pin']=='029'
 page.get_by_role('button',name='Disable',exact=True).click();page.wait_for_function("document.getElementById('mission-pin-message').textContent.includes('disabled')");assert pin.input_value()==''
 page.locator('#mission-pin-file').set_input_files({'name':'Faculty_PIN_Settings_Private.csv','mimeType':'text/csv','buffer':b'StaffID,StaffName,Class,PIN,Enabled\nX:one,Synthetic Teacher,X,029,Yes'})
 page.get_by_role('heading',name='Review faculty PIN update',exact=True).wait_for();assert not any(c['action']=='import-pins' for c in calls);assert '029' not in page.locator('#mission-fields').inner_text()
 page.locator('#mission-save').click();page.locator('#mission-editor-error').wait_for(state='visible');assert 'No PIN update was confirmed' in page.locator('#mission-editor-error').inner_text();assert 'Unexpected token' not in page.locator('#mission-editor-error').inner_text();assert page.locator('#mission-editor').is_visible();assert page.locator('#mission-save').is_enabled()
 page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden');assert calls[-1]['action']=='import-pins';assert calls[-1]['rows'][0]['pin']=='029';assert 'updated in the database' in page.locator('#mission-pin-message').inner_text()
 print('PASS PIN CSV preview does not save before confirmation and sends reviewed three-digit values')
 assert page.locator('#mission-pin-body input').input_value()=='029'
 page.locator('#mission-add-faculty-pin').click();page.get_by_role('heading',name='Add new faculty + initial PIN',exact=True).wait_for();page.locator('[name=classId]').select_option('XII');page.locator('[name=name]').fill('Synthetic New Teacher');page.locator('[name=designation]').fill('PGT');page.locator('[name=subjects]').fill('Physics');page.locator('[name=teachingSections]').fill('A');assert len(page.locator('[name=pin]').input_value())==3;page.locator('[name=pin]').fill('047');page.locator('#mission-save').click();page.locator('#mission-editor').wait_for(state='hidden');assert calls[-1]['action']=='add-faculty-pin';assert calls[-1]['pin']=='047';assert 'Synthetic New Teacher' in page.locator('#mission-pin-body').inner_text();assert page.locator('#mission-pin-body input').nth(1).input_value()=='047'
 print('PASS new faculty and initial PIN entered together, class XII selected and saved PIN shown during visit')
 page.locator('#mission-close-pins').click();page.wait_for_function("document.getElementById('mission-pin-body').textContent===''");assert page.locator('#mission-pin-body').inner_text()==''
 page.locator('#mission-pin-settings').click();page.wait_for_function("document.querySelector('#mission-pin-body input')?.value==='029'");page.locator('#mission-show-pin-list').click();assert page.locator('#mission-pin-body input').first.get_attribute('type')=='text';assert page.locator('#mission-pin-body input').first.input_value()=='029';page.locator('#mission-show-pin-list').click();assert page.locator('#mission-pin-body input').first.get_attribute('type')=='password';page.locator('#mission-close-pins').click()
 print('PASS saved Principal PIN list reloads on reopening and Show/Hide PIN list works')
 print('PASS Principal generation, show/edit three-digit PIN, validation, disable and clear-on-close')
 browser.close()
