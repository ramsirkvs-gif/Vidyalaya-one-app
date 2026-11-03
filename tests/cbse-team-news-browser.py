"""Team-wide News: 100 words, one photo, own PIN, comments and profile feed."""
from pathlib import Path
exec(Path('tests/cbse-mcq-browser.py').read_text().split("\nwith fx['ns']['sync_playwright']() as p:")[0])
news={}
def news_api(page,route):
 global news
 d=route.request.post_data_json
 if d['action']=='news-read':
  result=page.evaluate("""async args=>{const {readTeamNews}=await import('./cbse-team-news-model.js');return readTeamNews(...args);}""",[news,d]);route.fulfill(json=result);return
 if d['action']=='news-principal' or d['action']=='pin-submit' and d.get('operation','').startswith('news-'):
  principal=d['action']=='news-principal'
  if not principal and d.get('pin')!={'X:one':'123','X:two':'456'}.get(d.get('staffId')):route.fulfill(status=401,json={'error':'The PIN does not match this staff member.'});return
  actor={'id':'principal','name':'Principal'} if principal else {'id':d['staffId'],'name':F['classes']['X']['teachers'][d['staffId'].split(':')[1]]['name']}
  try:
   clock[0]+=1000;r=page.evaluate("""async args=>{const {applyTeamNews}=await import('./cbse-team-news-model.js');return applyTeamNews(...args);}""",[news,d,actor,clock[0]]);news=r.pop('next');route.fulfill(json={'ok':True,**r})
  except Exception as e:route.fulfill(status=409,json={'error':str(e)})
  return
 mcq_api(page,route)
with fx['ns']['sync_playwright']() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1280,'height':1000});ctx.add_init_script('window.__guest=true');ctx.route('https://www.gstatic.com/firebasejs/**',mcq_sdk)
 page=ctx.new_page();page.clock.install();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/api/staff-access',lambda route:news_api(page,route));page.goto('http://127.0.0.1:8000/cbse-mission.html#tab=news&compose=1');page.get_by_role('heading',name='Team contribution at a glance',exact=True).wait_for()
 form=page.locator('.news-compose');form.locator('[name=news-staff]').select_option('X:one');text=form.locator('[name=news-text]');text.fill('word '*101);save=form.get_by_role('button',name='Post News to all team members',exact=True);assert save.is_disabled();assert form.locator('.news-word-count').inner_text()=='101 / 100 words'
 text.fill('Our team completed a creative classroom activity today.');assert not save.is_disabled();assert form.locator('[name=news-camera]').get_attribute('capture')=='environment';assert form.locator('[name=news-photo]').get_attribute('multiple') is None
 photo=page.evaluate("""()=>{const c=document.createElement('canvas');c.width=500;c.height=300;const g=c.getContext('2d');g.fillStyle='#83c8aa';g.fillRect(0,0,500,300);g.fillStyle='#123d3b';g.font='28px Arial';g.fillText('Synthetic team activity',30,150);return c.toDataURL('image/png').split(',')[1]}""")
 form.locator('[name=news-photo]').set_input_files({'name':'activity.png','mimeType':'image/png','buffer':base64.b64decode(photo)});form.locator('.news-photo-preview img').wait_for();assert form.locator('.news-photo-preview img').count()==1
 form.locator('[name=news-pin]').fill('000');save.click();form.get_by_role('alert').wait_for();assert not news;assert text.input_value().startswith('Our team');assert form.locator('.news-photo-preview img').count()==1;assert form.locator('[name=news-pin]').input_value()==''
 form.locator('[name=news-pin]').fill('123');save.click();page.get_by_role('heading',name='Team comments',exact=True).wait_for();postid=next(iter(news['posts']));card=page.locator('.team-news-card');assert 'Synthetic Teacher' in card.inner_text();card.locator('.news-photo-box img').wait_for();assert news['posts'][postid]['authorId']=='X:one'
 comment=page.locator('.news-compose');comment.locator('[name=news-staff]').select_option('X:two');comment.locator('[name=news-comment]').fill('A useful contribution for the whole team.');comment.locator('[name=news-pin]').fill('456');comment.get_by_role('button',name='Post comment',exact=True).click();page.get_by_text('Comment posted.',exact=True).wait_for();assert 'Synthetic Counsellor' in page.locator('.news-comment-card').inner_text();assert comment.locator('[name=news-pin]').input_value()==''
 page.evaluate("location.hash='staff=X%3Atwo'");page.get_by_role('heading',name='Team contribution at a glance',exact=True).wait_for();widget=page.locator('[data-news-workspace]');widget.locator('.team-news-card').wait_for();assert 'Our team completed' in widget.inner_text();assert 'See / comment · 1' in widget.inner_text()
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 widget.screenshot(path='/tmp/team-news-profile.png')
 widget.get_by_role('button',name='Create News',exact=True).click();form=page.locator('.news-compose');form.locator('[name=news-staff]').select_option('X:one');form.locator('[name=news-text]').fill('Another verified contribution.');form.locator('[name=news-pin]').fill('123');form.get_by_role('button',name='Post News to all team members',exact=True).click();page.get_by_role('heading',name='Team comments',exact=True).wait_for();assert list(news['posts'].values())[-1]['authorId']=='X:one'
 # A different team profile sees the same shared News.
 page.evaluate("location.hash='staff=X%3Aone'");page.locator('[data-news-workspace] .team-news-card').nth(1).wait_for();assert 'Another verified contribution.' in page.locator('[data-news-workspace]').inner_text()
 admin=b.new_context();admin.route('https://www.gstatic.com/firebasejs/**',mcq_sdk);pp=admin.new_page();pp.route('**/api/staff-access',lambda route:news_api(pp,route));pp.goto('http://127.0.0.1:8000/cbse-mission.html#tab=news&compose=1');pf=pp.locator('.news-compose');pf.wait_for();assert pf.locator('[name=news-pin]').count()==0;assert pf.locator('[name=news-staff]').count()==0;pf.locator('[name=news-text]').fill('Principal team update.');pf.get_by_role('button',name='Post News to all team members',exact=True).click();pp.get_by_role('heading',name='Team comments',exact=True).wait_for();assert list(news['posts'].values())[-1]['authorId']=='principal'
 page.bring_to_front();page.clock.fast_forward(31000);page.locator('[data-news-workspace] .team-news-card').filter(has_text='Principal team update.').wait_for()
 assert not errors,errors;b.close()
print('PASS 100-word News, one photo/camera, wrong/valid PIN, own author, team comments, all profile feeds, Principal and mobile layout')
