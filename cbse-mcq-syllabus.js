// Do not describe unverified or older topic lists as the current CBSE syllabus.
export const MCQ_SYLLABUS={session:'2026–27',source:'https://cbseacademic.nic.in/curriculum_2027.html',verified:false,topics:{X:{},XII:{}}};
export function syllabusTopics(classId,subjectName,saved=[]){const name=String(subjectName||'').trim().toLowerCase(),official=MCQ_SYLLABUS.verified?MCQ_SYLLABUS.topics[classId]?.[name]||[]:[];return [...new Set(['Mixed',...official,...saved])];}
