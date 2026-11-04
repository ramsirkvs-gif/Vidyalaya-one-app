import {mcqTopicKey} from './cbse-mcq-topics.js';
export function mcqTopicCounts(questions=[]){const counts=new Map();for(const q of questions){const topic=String(q.topic||'').trim()||'Not recorded';const key=mcqTopicKey(topic),item=counts.get(key)||{topic,count:0};item.count++;counts.set(key,item);}return [...counts.values()];}
export function mcqContributorNames(questions=[]){return [...new Set(questions.map(q=>String(q.contributorName||'').trim()).filter(Boolean))];}
