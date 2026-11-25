const MCQ_LABEL=/(?:^|[^a-z0-9])(?:mcqs?|multiple[\s_-]+choice)(?=$|[^a-z0-9])/i;
const NAMED_MONTHLY=/\bmonthly\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b.*\b(?:test|assessment)\b/i;

export function isMCQResult(exam,mark){
 return [mark?.examId,mark?.importSource,exam?.name,exam?.type,exam?.source].some(value=>MCQ_LABEL.test(String(value||'')));
}

export function isMonthlyResult(exam,mark){
 return !!exam&&!isMCQResult(exam,mark)&&(exam.type==='monthly'||((!exam.type||exam.type==='test')&&NAMED_MONTHLY.test(exam.name||'')));
}

export const examPassPercentage=(maximum,fallback=33)=>maximum===70?23*100/70:fallback;

export const PB1_SAMAGAM_SOURCE='samagam_pb1_final';

export const pb1PassPercentage=(maximum,source)=>source===PB1_SAMAGAM_SOURCE&&maximum===80?32.5:examPassPercentage(maximum);

export function pb1ResultBand(percentage,maximum,source){
 if(!Number.isFinite(percentage))return 'grey';
 if(percentage<=25)return 'critical';
 if(percentage<pb1PassPercentage(maximum,source))return 'red';
 if(percentage<=40)return 'yellow';
 return percentage<75?'pass':'green';
}

export const pb1ApprovalKey=(classId,sectionId,subjectId)=>encodeURIComponent(JSON.stringify([classId,sectionId,subjectId])).replaceAll('.','%2E');

export function approvedPB1Mark(mission,person,subjectId){
 const key=pb1ApprovalKey(person?.classId,person?.sectionId,subjectId);
 const frozen=mission.pb1Approvals?.[key]?.marks?.[person?.key];
 return frozen?{...frozen,approvedPB1:true}:undefined;
}
