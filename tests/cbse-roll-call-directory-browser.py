from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.goto('http://127.0.0.1:8000/cbse-roll-call-status.js');page.set_content('<link rel="stylesheet" href="/cbse-roll-call.css"><main class="roll-workspace" id="root"></main>')
 page.evaluate('''async()=>{const {renderRollStaffDirectory}=await import('./cbse-roll-call-status.js');renderRollStaffDirectory(document.querySelector('#root'),{staff:{a:{name:'MR. ABHISHEK SINGH',designation:'TGT-English',wing:'secondary'},b:{name:'Synthetic Primary',designation:'PRT',wing:'primary'},p:{name:'DR. RAMKUMAR SINGH S.',designation:'Principal',wing:'secondary'},v:{name:'VP VACANT',designation:'Vice Principal',wing:'secondary'},u:{name:'Synthetic Unassigned',designation:'Support',wing:''}}});}''')
 page.locator('.roll-staff-directory>summary').click();assert page.locator('.roll-staff-row').count()==48;text=page.locator('.roll-staff-directory').inner_text();assert 'Synthetic Primary' in text and 'MR. ABHISHEK SINGH' in text and 'Synthetic Unassigned' in text;assert 'VACANT' not in text and 'RAMKUMAR' not in text
 assert page.get_by_role('link',name='Add new Primary / support staff',exact=True).get_attribute('href').endswith('editFaculty=new-support');assert page.get_by_role('link',name='Add new Secondary teacher',exact=True).get_attribute('href').endswith('editFaculty=new')
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 b.close()
print('PASS consolidated Primary/Secondary directory, excluded Principal/VP/vacant posts, protected add links and responsive layout')
