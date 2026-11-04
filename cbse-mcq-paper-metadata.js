export function mcqTopicCounts(questions=[]){const counts=new Map();for(const q of questions){const topic=String(q.topic||'').trim()||'Not recorded';counts.set(topic,(counts.get(topic)||0)+1);}return [...counts].map(([topic,count])=>({topic,count}));}
export function mcqContributorNames(questions=[]){return [...new Set(questions.map(q=>String(q.contributorName||'').trim()).filter(Boolean))];}
