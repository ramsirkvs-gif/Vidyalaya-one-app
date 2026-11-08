// Transcribed and visually checked against the supplied CBSE circular dated
// 06 November 2026, PDF pages 4–12. Dates are theory-paper dates; times are IST.
export const CBSE_2027_SOURCE={issued:'2026-11-06',file:'cbse-board-datesheet-2027.pdf',title:'CBSE main examination 2027 · supplied circular dated 06 November 2026'};
const paper=(classId,code,name,date,page,aliases=[],end='13:30')=>({classId,code,name,date,page,aliases,start:'10:30',end});
export const CBSE_2027_PAPERS=[
 paper('X','041','Mathematics Standard','2027-02-17',4,['maths_standard','standard maths','mathematics standard']),
 paper('X','241','Mathematics Basic','2027-02-17',4,['maths_basic','basic maths','mathematics basic']),
 paper('X','086','Science','2027-02-22',4,['science']),
 paper('X','417','Artificial Intelligence','2027-02-24',5,['ai','artificial intelligence'],'12:30'),
 paper('X','101','English (Communicative)','2027-02-26',5,['english','english communicative']),
 paper('X','184','English (Language and Literature)','2027-02-26',5,['english','english language and literature','english language literature','english lang lit']),
 paper('X','002','Hindi Course-A','2027-03-03',6,['hindi','hindi a','hindi course a']),
 paper('X','085','Hindi Course-B','2027-03-03',6,['hindi','hindi b','hindi course b']),
 paper('X','087','Social Science','2027-03-08',7,['social_science','social science','sst']),
 paper('XII','042','Physics','2027-02-16',8,['physics']),
 paper('XII','055','Accountancy','2027-02-23',9,['accountancy','accounts']),
 paper('XII','029','Geography','2027-02-25',9,['geography']),
 paper('XII','043','Chemistry','2027-02-27',9,['chemistry']),
 paper('XII','001','English Elective','2027-03-05',10,['english','english elective']),
 paper('XII','301','English Core','2027-03-05',10,['english','english core']),
 paper('XII','041','Mathematics','2027-03-09',10,['maths','mathematics']),
 paper('XII','241','Applied Mathematics','2027-03-09',10,['applied maths','applied mathematics']),
 paper('XII','002','Hindi Elective','2027-03-13',11,['hindi','hindi elective']),
 paper('XII','302','Hindi Core','2027-03-13',11,['hindi','hindi core']),
 paper('XII','030','Economics','2027-03-16',11,['economics']),
 paper('XII','028','Political Science','2027-03-19',11,['pol_sci','political science','pol science']),
 paper('XII','843','Artificial Intelligence','2027-03-20',11,['ai','artificial intelligence'],'12:30'),
 paper('XII','044','Biology','2027-03-25',11,['biology']),
 paper('XII','027','History','2027-03-27',11,['history']),
 paper('XII','065','Informatics Practices','2027-03-31',12,['ip','informatics practices']),
 paper('XII','083','Computer Science','2027-03-31',12,['cs','computer science']),
 paper('XII','054','Business Studies','2027-04-01',12,['b_std','business studies','b st','business std'])
];

// School course choices confirmed by the Principal on 08 November 2026.
export const SCHOOL_CBSE_LANGUAGE_CODES={X:{English:'184',Hindi:'002'},XII:{English:'301',Hindi:'302'}};
