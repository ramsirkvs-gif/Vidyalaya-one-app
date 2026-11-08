"""Embedded video cannot receive pointer/keyboard input; app controls still work."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844});page.route('**/player-test',lambda r:r.fulfill(content_type='text/html',body='<link rel=stylesheet href=/cbse-roll-call.css><style>.podcast-player{height:220px}.podcast-player iframe{width:100%;height:100%}</style><main class="roll-workspace"></main>'));page.goto('http://127.0.0.1:8000/player-test')
 page.evaluate("""async()=>{window.plays=0;window.pauses=0;window.escaped=false;window.YT={Player:function(holder,config){const iframe=document.createElement('iframe');iframe.srcdoc='<a href="https://www.youtube.com/" target="_top" style="display:block;height:200px" onclick="parent.escaped=true;return false">YouTube</a>';holder.replaceWith(iframe);this.playVideo=()=>window.plays++;this.pauseVideo=()=>window.pauses++;this.destroy=()=>{};setTimeout(()=>config.events.onReady(),0);}};const {mountCompactYouTube}=await import('./cbse-youtube-player.js');await mountCompactYouTube(document.querySelector('main'),'abcdefghijk');} """)
 play=page.get_by_role('button',name='Play',exact=True);play.wait_for()
 for width in [320,390,844]:
  page.set_viewport_size({'width':width,'height':600});bounds=page.locator('.podcast-playback>button').evaluate_all('(nodes)=>nodes.map(n=>({y:n.getBoundingClientRect().y,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width}))');assert max(n['y'] for n in bounds)-min(n['y'] for n in bounds)<2;assert all(35<=n['height']<=40 and n['width']<150 for n in bounds),bounds
 play.click();frame=page.locator('.podcast-player');assert frame.evaluate('(n)=>n.inert');assert frame.evaluate('(n)=>getComputedStyle(n).pointerEvents')=='none';box=frame.bounding_box()
 for i in range(4):page.mouse.click(box['x']+40,box['y']+40)
 assert page.evaluate('escaped')==False;assert page.url.endswith('/player-test');assert page.evaluate('plays')==1;play.focus();page.keyboard.press('Tab');assert page.get_by_role('button',name='Pause').evaluate('(n)=>n===document.activeElement');page.keyboard.press('Enter');assert page.evaluate('pauses')==1
 # Expansion keeps the same iframe/player, including the app-only fallback.
 for fallback in [False,True]:
  if fallback:page.evaluate("document.querySelector('.podcast-video-player').requestFullscreen=undefined")
  page.get_by_role('button',name='Expand video ⛶',exact=True).click();page.get_by_role('button',name='Exit full screen',exact=True).wait_for();page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(100);assert page.locator('.podcast-player iframe').count()==1;assert page.evaluate('plays')==1;assert page.locator('.podcast-video-player').evaluate('(n)=>n.getBoundingClientRect().width>=innerWidth-2');assert page.get_by_role('button',name='Play',exact=True).is_visible();page.get_by_role('button',name='Exit full screen',exact=True).click();assert page.locator('.podcast-expanded').count()==0;assert page.evaluate('document.body.style.overflow')==''
 b.close()
print('PASS video taps cannot activate embedded links; app Play/Pause and keyboard controls still work')
