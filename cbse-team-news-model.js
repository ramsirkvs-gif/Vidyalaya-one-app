const check=(ok,message)=>{if(!ok)throw Error(message);};
export const newsWordCount=value=>String(value||'').trim().split(/\s+/u).filter(Boolean).length;
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
function text(value){check(typeof value==='string'&&value.trim()&&value.length<=4000,'Write a short message.');check(newsWordCount(value)<=100,'Keep the message within 100 words.');return value.trim();}
export function applyTeamNews(bank,input,actor,now){
 check(['news-create','news-comment'].includes(input.operation),'Choose a News action.');check(safeId(input.requestId)&&input.requestId.length<=80,'Reload the form before posting.');const body=text(input.text),next=structuredClone(bank||{});next.posts||={};let newsId;
 if(input.operation==='news-create'){
  const photo=input.photo||'';check(typeof photo==='string'&&(!photo||photo.length<=100000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo)),'Attach only one resized photo.');newsId='news_'+input.requestId;const old=next.posts[newsId];if(old){check(old.authorId===actor.id&&old.text===body&&(next.photos?.[newsId]||'')===photo,'This request was already saved with different content. Reload News.');return {next,newsId};}if(photo){next.photos||={};next.photos[newsId]=photo;}next.posts[newsId]={id:newsId,text:body,hasPhoto:!!photo,authorId:actor.id,authorName:actor.name,createdAt:now,comments:{}};
 }else{
  newsId=input.newsId;check(safeId(newsId)&&Object.hasOwn(next.posts,newsId),'This news item is unavailable. Refresh News.');const post=next.posts[newsId],id='comment_'+input.requestId;post.comments||={};const old=post.comments[id];if(old){check(old.authorId===actor.id&&old.text===body,'This comment request was already saved with different content.');return {next,newsId};}post.comments[id]={id,text:body,authorId:actor.id,authorName:actor.name,createdAt:now};
 }
 next.revision=(next.revision||0)+1;return {next,newsId};
}
const summary=post=>({id:post.id,text:post.text,hasPhoto:!!post.hasPhoto,authorId:post.authorId,authorName:post.authorName,createdAt:post.createdAt,commentCount:Object.keys(post.comments||{}).length});
export function readTeamNews(bank={},input={}){
 if(input.photoId){check(safeId(input.photoId),'Choose a news item.');const post=Object.hasOwn(bank.posts||{},input.photoId)?bank.posts[input.photoId]:null;check(post,'This photo is unavailable.');return {photo:bank.photos?.[input.photoId]||''};}
 const page=Number.isInteger(input.page)&&input.page>=0?input.page:0,pageSize=input.compact?3:5,posts=Object.values(bank.posts||{}).sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id));
 if(input.newsId){check(safeId(input.newsId)&&Object.hasOwn(bank.posts||{},input.newsId),'This news item is unavailable.');const post=bank.posts[input.newsId],comments=Object.values(post.comments||{}).sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id)),commentPage=Number.isInteger(input.commentPage)&&input.commentPage>=0?input.commentPage:0;return {post:summary(post),comments:comments.slice(commentPage*20,commentPage*20+20),commentTotal:comments.length,commentPage,commentPageSize:20};}
 return {posts:posts.slice(page*pageSize,page*pageSize+pageSize).map(summary),total:posts.length,page,pageSize,revision:bank.revision||0};
}
