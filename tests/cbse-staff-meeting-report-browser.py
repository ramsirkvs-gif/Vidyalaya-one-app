"""Verify the built Staff Meetings report in Chromium screen and print layouts."""
from playwright.sync_api import sync_playwright

CREATED = 1772700000000
HINDI_BODY = 'पहला अनुच्छेद।\n\nदूसरा अनुच्छेद।'
HINDI = {
    'language': 'hi',
    'agenda': 'विद्यालय की प्रगति\nअगली बैठक',
    'minutes': HINDI_BODY + '\n\nबैठक संयोजक / प्रभारी\nप्रधानाचार्य\nपीएम श्री केंद्रीय विद्यालय क्रमांक–1, ईटानगर',
    'writerName': 'सीमा शर्मा',
}
ENGLISH = {
    'language': 'en',
    'agenda': 'School progress\nNext meeting',
    'minutes': 'First paragraph.\n\nSecond paragraph. ' + 'longword' * 24,
    'writerName': 'Alex Example',
}


def check_report(page, principal, versions, attendance_taker):
    report = {
        'createdAt': CREATED,
        'versions': versions,
        'present': [{'name': 'Synthetic Attendee'}],
        'attendanceTakenBy': attendance_taker,
        'writers': [{'name': 'Assigned but not submitted', 'language': 'hi'}],
    }
    entry = {
        'id': 'sample',
        'agenda': 'Report agenda',
        'createdAt': CREATED,
        'published': True,
        'completed': bool(attendance_taker),
        'attendanceTakers': [{'name': 'Synthetic SMT', 'role': 'SMT-1'}],
        'submittedLanguages': [version['language'] for version in versions],
    }

    def staff_access(route):
        request = route.request
        payload = request.post_data_json
        assert request.headers.get('authorization') == ('Bearer synthetic' if principal else None)
        result = {'report': report} if payload.get('meetingId') else {'meetings': [entry], 'roster': []}
        route.fulfill(json=result)

    page.route('**/api/staff-access', staff_access)
    page.route('**/firebase-client.js*', lambda route: route.fulfill(
        content_type='text/javascript',
        body="export const auth={authStateReady:async()=>{},currentUser:{uid:'principal',getIdToken:async()=>'synthetic'}};",
    ))
    page.route('https://www.gstatic.com/firebasejs/**', lambda route: route.fulfill(
        content_type='text/javascript', body='export const onAuthStateChanged=()=>{};',
    ))
    page.add_init_script('window.print = () => { window.printRequested = true; };')
    page.goto('http://127.0.0.1:8001/cbse-staff-meetings.html' + ('#principal' if principal else ''))
    open_report = page.get_by_role('button', name='Preview report / print' if principal else 'Read minutes / print')
    open_report.wait_for()
    if not principal:
        assert page.get_by_role('button', name='Attendance taker · PIN').is_visible() == (not attendance_taker)
        assert page.get_by_role('button', name='Take attendance as Principal').is_visible() == (not attendance_taker)
    open_report.click()
    page.get_by_role('heading', name='Staff meeting report').wait_for()

    assert page.locator('.meeting-letterhead p').all_text_contents() == [
        'पीएमश्री केन्द्रीय विद्यालय क्रमांक–1, ईटानगर',
        'PM SHRI Kendriya Vidyalaya No. 1 Itanagar',
    ]
    images = page.locator('.meeting-letterhead img')
    assert 'Kendriya' in images.first.get_attribute('alt')
    assert images.last.get_attribute('alt') == 'PM SHRI'
    sections = page.locator('.meeting-report-version')
    ordered = sorted(versions, key=lambda version: version['language'] != 'hi')
    assert sections.count() == len(ordered)
    for section, version in zip(sections.all(), ordered):
        hindi = version['language'] == 'hi'
        assert section.get_attribute('lang') == version['language']
        assert section.locator('h3').text_content() == ('कार्यवृत्त (हिन्दी)' if hindi else 'Minutes (in English)')
        assert section.locator('.meeting-minutes-text').all_text_contents() == [
            version['agenda'], HINDI_BODY if hindi else version['minutes'],
        ]
        assert section.locator('.meeting-signature-name').text_content() == version['writerName']
        assert section.locator('.meeting-signature-block strong').all_text_contents() == (
            ['कार्यवृत्त लेखक', 'प्राचार्य'] if hindi else ['Minute writer', 'Principal']
        )
    assert page.locator('#meetings-content > h3 + table').get_by_text('Synthetic Attendee').is_visible()
    signoff = page.locator('#meetings-content > .meeting-signatures')
    assert signoff.locator('strong').all_text_contents() == ['Attendance taker / SMT / HM', 'Principal']
    assert signoff.locator('.meeting-signature-name').text_content() == attendance_taker

    for width in [360, 1150]:
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.get_by_role('button', name='Print / Save as PDF').click()
    page.wait_for_function('window.printRequested === true')
    page.emulate_media(media='print')
    assert not page.get_by_role('button', name='Print / Save as PDF').is_visible()
    for block in page.locator('.meeting-signatures').all():
        left, right = [column.bounding_box() for column in block.locator('.meeting-signature-block').all()]
        assert left['x'] + left['width'] <= right['x']
        assert left['y'] == right['y']
        assert block.evaluate('node => getComputedStyle(node).breakInside') == 'avoid'
    assert page.pdf(format='A4').startswith(b'%PDF')


def check_remembered_curtain(browser):
    context = browser.new_context()
    logins = []
    url = 'http://127.0.0.1:8001/cbse-staff-meetings.html'

    def staff_access(route):
        request = route.request
        if request.post_data_json['action'] == 'view-login':
            logins.append(True)
            route.fulfill(headers={
                'content-type': 'application/json',
                'set-cookie': 'mission_staff_view=synthetic; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=34560000',
            }, body='{"ok":true}')
        elif 'mission_staff_view=synthetic' in request.all_headers().get('cookie', ''):
            route.fulfill(json={'meetings': []})
        else:
            route.fulfill(status=401, json={'curtainRequired': True})

    context.route('**/api/staff-access', staff_access)
    page = context.new_page()
    page.goto(url)
    page.get_by_label('Staff viewing password').fill('synthetic')
    page.get_by_role('button', name='Open meeting register').click()
    page.get_by_role('heading', name='Meeting register').wait_for()
    page.reload()
    page.get_by_role('heading', name='Meeting register').wait_for()
    page.close()
    reopened = context.new_page()
    reopened.goto(url)
    reopened.get_by_role('heading', name='Meeting register').wait_for()
    assert len(logins) == 1
    context.close()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    check_remembered_curtain(browser)
    for principal in [False, True]:
        for versions, taker in [([ENGLISH, HINDI], 'Synthetic SMT'), ([HINDI], ''), ([ENGLISH], '')]:
            page = browser.new_page()
            check_report(page, principal, versions, taker)
            page.close()
    print('PASS staff and Principal bilingual, Hindi-only, and English-only reports on screen and in A4 PDF')
    browser.close()
