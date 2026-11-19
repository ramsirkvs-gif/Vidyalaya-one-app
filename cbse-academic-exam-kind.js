const MCQ_LABEL=/(?:^|[^a-z0-9])(?:mcqs?|multiple[\s_-]+choice)(?=$|[^a-z0-9])/i;
const NAMED_MONTHLY=/\bmonthly\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b.*\b(?:test|assessment)\b/i;

export function isMCQResult(exam,mark){
 return [mark?.examId,mark?.importSource,exam?.name,exam?.type,exam?.source].some(value=>MCQ_LABEL.test(String(value||'')));
}

export function isMonthlyResult(exam,mark){
 return !!exam&&!isMCQResult(exam,mark)&&(exam.type==='monthly'||((!exam.type||exam.type==='test')&&NAMED_MONTHLY.test(exam.name||'')));
}
