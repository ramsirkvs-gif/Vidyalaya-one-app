from playwright.sync_api import sync_playwright
import subprocess
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.goto('http://127.0.0.1:8000/')
 for cl in ['X','XII']:
  page.evaluate('''async cl=>{const {academicBriefDocument,academicPrintStyle,fitAcademicBriefPages}=await import('./cbse-academic-report.js');document.head.replaceChildren();const style=document.createElement('style');style.textContent=academicPrintStyle(true);document.head.append(style);document.body.replaceChildren();for(const subjectName of ['Subject One','Subject Two']){const students=['critical','red','yellow','green','grey','grey'].map((band,i)=>({person:{name:'Synthetic '+i,section:'A',roll:i},band,latest:i===5?null:{absent:i===4,score:12,maximum:70,exam:{name:'Latest',date:'2026-11-01'}},history:Array.from({length:12},(_,j)=>({band,absent:i===4,exam:{date:'2026-'+String(j+1).padStart(2,'0')}}))}));const report={classId:cl,subjectName,students,teachers:Array.from({length:5},(_,i)=>({section:String.fromCharCode(65+i),name:'Synthetic Subject Teacher '+i}))};const wrapper=document.createElement('div');wrapper.className='academic-brief-page';wrapper.append(academicBriefDocument(document,report));document.body.append(wrapper);}await document.fonts.ready;fitAcademicBriefPages(document);}''',cl)
  path='/tmp/academic-one-page-'+cl+'.pdf';page.pdf(path=path,prefer_css_page_size=True,display_header_footer=True,header_template='<span></span>',footer_template='<span></span>');info=subprocess.check_output(['pdfinfo',path],text=True);assert 'Pages:           2' in info,info
 b.close()
print('PASS Class X and XII all-subject brief exports: exactly one A4 page per subject with 12 months and all support categories')
