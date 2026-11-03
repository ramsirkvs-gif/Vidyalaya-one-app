export const isMCQMathSubject=name=>/math|गणित/i.test(String(name||''));
export const MCQ_MATH_FONT_URL=new URL('./vendor/math-fonts/NotoSansMath-Regular.ttf',import.meta.url).href;
export const MCQ_MATH_FONT_FAMILY='"Noto Sans Math", "Cambria Math", Arial, sans-serif';
export const MCQ_MATH_FONT_CSS='@font-face{font-family:"Noto Sans Math";src:url("'+MCQ_MATH_FONT_URL+'") format("truetype");font-style:normal;font-weight:400;font-display:swap}.mcq-question{font-family:'+MCQ_MATH_FONT_FAMILY+'}';
