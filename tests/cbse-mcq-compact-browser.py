from playwright.sync_api import sync_playwright
import fitz
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.goto('http://127.0.0.1:8000/cbse-mcq-page-settings.js');page.set_content('<main id="setup"></main>')
 result=page.evaluate('''async()=>{
 const {buildMCQPaperFrame}=await import('./cbse-mcq-page-render.js'),{mcqPrintLayout}=await import('./cbse-mcq-page-settings.js'),{renderMCQPageSetup}=await import('./cbse-mcq-page-setup-view.js');
 const questions=Array.from({length:60},(_,i)=>({id:'QE'+String(i+1).padStart(3,'0'),stem:'Choose the correct value for item '+(i+1)+': x² + y² = r².',options:i===1?['A long explanation of the relationship between electric charge and electric potential. '.repeat(4),'A different extended explanation with several words and a formula E = mc². '.repeat(3),'unbroken'.repeat(35),'The last alternative also needs room to wrap correctly within the printed column. '.repeat(3)]:['1','2','3','4']}));
 questions[2].image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="90"><path d="M0 45H600" stroke="black"/><text x="10" y="30">Diagram</text></svg>');
 const paper={id:'QPTEST',classId:'X',subjectName:'Physics',count:questions.length,questions};window.testPaper=paper;
 const compact=await buildMCQPaperFrame(paper,mcqPrintLayout({},'compact'),{fit:false}),single=await buildMCQPaperFrame(paper,mcqPrintLayout({},'single'),{fit:false});
 const doc=compact.frame.contentDocument,columns=[...doc.querySelectorAll('.paper-column')],nodes=[...doc.querySelectorAll('.mcq-question')],issues=[];
 for(const col of columns){const bounds=col.getBoundingClientRect();for(const node of col.querySelectorAll('p,span,img')){const r=node.getBoundingClientRect();if(r.left<bounds.left-1||r.right>bounds.right+1||node.scrollWidth>node.clientWidth+1)issues.push(node.textContent.slice(0,40));}}
 const ids=[...doc.querySelectorAll('.mcq-question-id')].map(n=>n.textContent),choices=[...doc.querySelectorAll('.mcq-options')].map(n=>n.dataset.optionColumns);
 window.compactHTML=doc.documentElement.outerHTML;const counts={compact:compact.contentSheetCount,single:single.contentSheetCount};compact.frame.remove();single.frame.remove();
 window.setup=renderMCQPageSetup(document.querySelector('#setup'),{paper:()=>paper});document.querySelector('[data-print-layout=compact]').click();const selected=await window.setup.ready();
 return {issues,ids,choices,counts,selected,pressed:document.querySelector('[data-print-layout=compact]').getAttribute('aria-pressed'),columns:document.querySelector('.mcq-a4-preview iframe').contentDocument.querySelectorAll('.paper-column').length};
 }''')
 assert not result['issues'],result['issues']
 assert len(result['ids'])==60 and len(set(result['ids']))==60,result
 assert result['choices'][0]=='4' and result['choices'][1]=='1',result['choices']
 assert result['counts']['compact']<=result['counts']['single'],result['counts']
 assert result['selected']['columns']==2 and result['selected']['margin']==6 and result['pressed']=='true'
 assert result['columns']>=2
 page.locator('[data-print-layout=single]').click();assert page.evaluate('window.setup.value().columns')==1
 pdfpage=b.new_page();pdfpage.set_content(page.evaluate('window.compactHTML'));pdf=fitz.open(stream=pdfpage.pdf(prefer_css_page_size=True),filetype='pdf');pdf[0].get_pixmap(matrix=fitz.Matrix(1,1)).save('/tmp/mcq-compact-preview.png');text=''.join(s.get_text() for s in pdf)
 assert all('Q ID No: QE'+str(i+1).zfill(3) in text for i in range(60))
 assert 'The last alternative' in text and 'A long explanation' in text
 b.close()
 print('PASS compact presets, long/short choices, equations/image boundaries, all 60 questions in PDF; content pages:',result['counts'])
