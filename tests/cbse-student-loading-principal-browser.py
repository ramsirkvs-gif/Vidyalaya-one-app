"""Connection bootstrap preserves password-only Principal sign-in and persistence."""
from pathlib import Path
scope={};exec(Path('tests/cbse-latest-inline-login-browser.py').read_text().split("with fx['ns']['sync_playwright']() as p:")[0],scope)
fx=scope['fx']
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context();ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',scope['sdk']);ctx.route('**/api/staff-access',fx['api']);page=ctx.new_page();page.goto('http://127.0.0.1:8000/cbse-admin.html');page.locator('#login-password').wait_for();assert page.locator('input[type=email]').count()==0;page.evaluate("localStorage.setItem('inline-principal-session','yes')");page.goto('http://127.0.0.1:8000/cbse-mission.html#student=X%3Aa%3Aone');page.wait_for_function('!document.querySelector(\"#mission-tools\").hidden');page.reload();page.wait_for_function('!document.querySelector("#mission-tools").hidden');assert page.locator('#mission-signout').is_visible();assert page.locator('[name=inline-principal-password]').count()==0;b.close()
print('PASS password-only login screen, existing Principal session restored on Mission navigation/reload and unchanged Principal controls')
