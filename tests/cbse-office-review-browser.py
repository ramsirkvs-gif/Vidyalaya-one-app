"""Real Office service: stale-register saves, same-row conflict review and private objection replies."""
from pathlib import Path
import json, urllib.request
scope={}
exec(Path('tests/cbse-office-browser.py').read_text().split('with sync_playwright() as p:')[0],scope)
BASE=scope['BASE'];server=scope['server']
def api(input):
    request=urllib.request.Request(BASE+'api/staff-access',data=json.dumps(input).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer principal'})
    with urllib.request.urlopen(request) as response:return json.load(response)
def read():return api({'action':'office-workspace','operation':'read','memberId':'pramod-paswan'})['workspace']
def principal_save(row_id,row,revision):
    current=read()
    return api({'action':'office-workspace','operation':'save-row','memberId':'pramod-paswan','expectedRevision':current['revision'],'rowId':row_id,'rowRevision':revision,'row':{**row,'assignedIds':row.get('assignedIds',[])}})
def confirm_pin(page):
    dialog=page.get_by_role('dialog',name='Confirm office save',exact=True)
    dialog.locator('input').fill('123');dialog.get_by_role('button',name='Confirm save',exact=True).click()
try:
    api({'action':'office-pin-settings','operation':'set-pin','memberId':'pramod-paswan','pin':'123'})
    base={'task':read()['title'],'fund':'SF','voucherNo':'111','details':'Synthetic starting audit record','objections':'Receipt required','status':'pending','assignedIds':[]}
    principal_save('office_initial',base,0)
    with scope['sync_playwright']() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        admin=browser.new_context();admin.route('https://www.gstatic.com/firebasejs/**',scope['sdk']);admin.add_init_script("localStorage.setItem('officePrincipal','1')")
        page=admin.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        member=browser.new_context(viewport={'width':390,'height':844});member.route('https://www.gstatic.com/firebasejs/**',scope['sdk']);office=member.new_page();office.on('pageerror',lambda e:errors.append(str(e)))
        office.goto(BASE+'cbse-office.html#office');office.locator('[name=office-curtain-password]').fill('synthetic-view');office.get_by_role('button',name='Continue to office login',exact=True).click();office.locator('[name=office-member]').select_option('pramod-paswan');office.locator('[name=office-login-pin]').fill('123');office.get_by_role('button',name='Office login',exact=True).click();office.get_by_role('heading',name='Mr. Pramod Paswan · SSA dashboard',exact=True).wait_for()
        office.get_by_role('button',name='Add new voucher',exact=True).click();entry=office.locator('dialog[open]');entry.locator('[name=voucherNo]').fill('333');entry.locator('[name=details]').fill('Synthetic submitted office voucher')
        # Another voucher changes after the office editor was opened.
        principal_save('office_other',{**base,'voucherNo':'222','objections':''},0)
        entry.get_by_role('button',name='Submit to Principal',exact=True).click();confirm_pin(office)
        office.locator('#office-message.office-save-success').get_by_text('submitted to Principal successfully',exact=False).wait_for();assert office.locator('#office-message').is_visible()
        current=read();saved_id=next(key for key,row in current['rows'].items() if row['voucherNo']=='333');assert current['rows'][saved_id]['submittedBy']=='pramod-paswan'
        print('PASS unrelated register changes no longer block submission; committed save shows a visible success receipt',flush=True)
        office.locator('[data-office-row-id="'+saved_id+'"]').get_by_role('button',name='Edit this record',exact=True).click();entry=office.locator('dialog[open]');entry.locator('[name=details]').fill('Retained office correction')
        current=read()['rows'][saved_id];principal_save(saved_id,{**current,'details':'Concurrent Principal correction','objections':'Principal requests the invoice'},current['revision'])
        entry.get_by_role('button',name='Submit to Principal',exact=True).click();confirm_pin(office);entry.get_by_role('status').get_by_text('record changed',exact=False).wait_for();assert entry.locator('[name=details]').input_value()=='Retained office correction'
        entry.get_by_role('button',name='Refresh latest record — keep my entries',exact=True).click();entry.get_by_role('status').get_by_text('Your entered fields are retained',exact=False).wait_for();assert 'Concurrent Principal correction' in entry.locator('.office-conflict-review').inner_text();assert entry.locator('[name=details]').input_value()=='Retained office correction'
        entry.get_by_role('button',name='Submit to Principal',exact=True).click();confirm_pin(office);office.locator('#office-message.office-save-success').wait_for();current=read()['rows'][saved_id];assert current['details']=='Retained office correction';assert current['objections']=='Principal requests the invoice'
        print('PASS genuine same-voucher conflicts preserve entries and show latest changes before explicit resubmission',flush=True)
        card=office.locator('[data-review-row="'+saved_id+'"]');card.get_by_text('Objection — reply required',exact=True).wait_for();card.get_by_role('button',name='Respond to objection',exact=True).click();card.locator('[name=office-objection-reply]').fill('Synthetic invoice attached for Principal review.');card.get_by_role('button',name='Send response to Principal',exact=True).click();confirm_pin(office);office.locator('#office-message.office-save-success').get_by_text('Response saved and sent to Principal',exact=False).wait_for();assert read()['rows'][saved_id]['status']=='pending'
        page.goto(BASE+'cbse-office.html#office');page.get_by_role('button',name='Open SSA dashboard',exact=True).click();review=page.locator('[data-review-row="'+saved_id+'"]');review.get_by_text('Synthetic invoice attached for Principal review.',exact=True).wait_for();review.get_by_role('button',name='Review / edit objection and final status',exact=True).click();editor=page.locator('dialog[open]');editor.get_by_role('button',name='No objection / Done',exact=True).click();editor.get_by_role('button',name='Save office record',exact=True).click();page.locator('#office-message.office-save-success').wait_for()
        office.get_by_role('button',name='Refresh records',exact=True).click();office.locator('[name=office-review-filter] option[value=done]').filter(has_text='(1)').wait_for(state='attached');office.locator('[name=office-review-filter]').select_option('done');done=office.locator('[data-review-row="'+saved_id+'"]');done.get_by_text('No objection / Done',exact=True).wait_for();assert done.get_by_role('button',name='Respond to objection',exact=True).count()==0;assert read()['rows'][saved_id]['reviewReplies']
        for width in [360,390,768,1440]:
            office.set_viewport_size({'width':width,'height':900});assert office.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        print('PASS private objection response, Principal review and No objection / Done visible in office dashboard, with mobile layout intact',flush=True)
        browser.close()
finally:
    server.terminate();server.wait(timeout=10)
