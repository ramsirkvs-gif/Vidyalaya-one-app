"""Exercise the existing QR photo/score/save check through the launch scanner route."""
from pathlib import Path
source=Path('tests/cbse-mcq-direct-qr-browser.py').read_text()
source=source.replace("page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=mcq');assert page.locator('[name=mcq-entry-class]').input_value()=='';assert page.locator('[name=mcq-entry-subject]').input_value()=='';", "page.goto('http://127.0.0.1:8000/cbse-mission.html');page.locator('#mission-nav').get_by_role('button',name='Direct Scan for student specific QP',exact=True).click();page.get_by_role('heading',name='Direct Scan for student specific QP',exact=True).wait_for();assert page.locator('[name=mcq-entry-class]').count()==0;assert page.locator('[name=mcq-entry-subject]').count()==0;")
exec(compile(source,'tests/cbse-mcq-direct-qr-browser.py','exec'))
