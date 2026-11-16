// Overall historical results supplied by the Principal; separate from current exam answers.
export const RESULT_SESSIONS=Object.freeze(['2023–24','2024–25','2025–26']);
const overall=Object.freeze({IX:Object.freeze(['36.36%','55.49%','60.12%']),XI:Object.freeze(['51.53%','61.08%','76.71%'])});
export function resultComparisonRows(classes){const grades=new Set(classes.map(c=>c.split(' ')[0]));return Object.entries(overall).filter(([grade])=>grades.has(grade)).map(([grade,values])=>({grade,values:[...values]}));}
