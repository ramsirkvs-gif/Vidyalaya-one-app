"""Day-scoped leave ordering across wings/periods, using synthetic records only."""
import subprocess, socket
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
with socket.socket() as probe:
    probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
server=subprocess.Popen(['python3','-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page();page.goto(f'http://127.0.0.1:{port}/cbse-roll-call-register.js')
        page.set_content('<link rel="stylesheet" href="/cbse.css"><link rel="stylesheet" href="/cbse-roll-call.css"><main id="root"></main>')
        page.evaluate('''async()=>{
          const {renderDailyRollRegister}=await import('/cbse-roll-call-register.js');
          const {rollRoster}=await import('/cbse-roll-call-roster.js');
          window.checkDaily=(wing,period)=>{
            const staff={};for(let i=0;i<8;i++)staff['s'+i]={name:'Synthetic '+i,wing};
            const today='2026-11-15';const leave=(id,status,dates=[today],cancelledDates=[])=>({staffId:id,status,dates,cancelledDates,leaveKind:'Casual leave (CL)'});
            const data={serverDate:today,staff,rollCall:{reports:{old:{staffId:'s0',wing,date:'2026-11-14',period,status:'approved',reported:'yes'},long:{staffId:'s5',wing,date:'2026-11-14',period:'morning',status:'approved',leaveType:'long',from:'2026-11-14',to:'2026-11-16'},pendingLong:{staffId:'s6',wing,date:today,period:'morning',status:'pending',leaveType:'long',reported:'no',from:today,to:'2026-11-16'}},advanceLeaves:{active:leave('s3','recorded',[today,'2026-11-18']),pending:leave('s1','pending'),rejected:leave('s2','not-approved'),cancelled:leave('s4','recorded',[today],[today]),future:leave('s7','recorded',['2026-11-18'])}}};
            const root=document.querySelector('#root');root.replaceChildren();window.opened=[];
            renderDailyRollRegister(root,data,wing,period,(id,editing)=>opened.push({id,editing}));
            const roster=rollRoster(staff,wing).map(p=>p.id),excused=new Set(['s3','s5']);
            return [...roster.filter(id=>excused.has(id)),...roster.filter(id=>!excused.has(id))];
          };
        }''')
        for wing in ['primary','secondary']:
            for period in ['morning','afternoon']:
                expected=page.evaluate('([w,p])=>checkDaily(w,p)',[wing,period])
                rows=page.locator('.roll-staff-row')
                assert rows.evaluate_all('(rows)=>rows.map(r=>r.dataset.staffId)')==expected
                for id in ['s3','s5']:
                    row=page.locator(f'[data-staff-id="{id}"]');assert 'Leave/OD today' in row.inner_text();assert row.locator('button').count()==0
                for id in ['s0','s1','s2','s4','s6','s7']:
                    row=page.locator(f'[data-staff-id="{id}"]');assert 'Leave/OD today' not in row.inner_text();assert row.locator('button').count()==1
                assert 'Yes · Roll Call submitted' not in page.locator('[data-staff-id="s0"]').inner_text()
                assert '18 Nov' not in page.locator('#root').inner_text();assert '16 Nov' not in page.locator('#root').inner_text()
                assert page.locator('.roll-leave-register').count()==0
                page.locator('[data-staff-id="s0"] button').click();assert page.evaluate('opened[0].id')=='s0'
                for width in [320,390,768,1440]:
                    page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        browser.close()
        print('PASS both wings and periods: day-scoped leave first, stable roster order, approvals/cancellations, selected identity and mobile widths')
finally:
    server.terminate();server.wait(timeout=10)
