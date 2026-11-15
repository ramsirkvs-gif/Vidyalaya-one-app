// Primary Wing roster supplied by the Principal. Names never contain PINs.
export const PRIMARY_ROSTER=[
 ['Mr. Rohtash','Headmaster (HM)',['Rohatsh','Rothash','Rohtas','Rohtash Virat','HM Rohtash','HM Rohatsh']],
 ['Mr. Pooran Mal Meena','PRT',['Pooranmal Meena','Pooranamal Meena']],
 ['Mr. Girraj Prasad Meena','PRT',['Girraj P Meena']],
 ['Mr. Anil Kumar','PRT',[]],['Mr. Pooran','PRT',['Pooran PRT']],
 ['Mr. Sushil Yadav','PRT',['Sushil PRT','Sushil']],
 ['Mr. Chandra Prakash Jilewa','PRT',['Chandra Prakash Jileva','CP Jilewa','C P Jilewa']],
 ['Mrs. Annu Kumari','PRT',[]],['Ms. Aarushi Batra','PRT',[]],
 ['Ms. Bhairvi','PRT',['Bhairvi Yadav','Bhairavi Yadav','Bhairavi']],
 ['Ms. Kirtika','PRT',[]],['Ms. Shanti','PRT',[]],['Mr. Suyash Patel','PRT',[]],
 ['Ms. Preeti','PRT',[]],['Mrs. Anjali','PRT',[]],['Mr. Tusshar','PRT',['Tushar','Tussar']],
 ['Mrs. Soni','PRT',[]],['Mr. Adesh Choudhry','PRT',['Adesh Choudhary']],
 ['Mrs. Smriti','PRT',['K.M. Smriti','KM Smriti','K M Smrati','KM Smrati']],
 ['Mr. S. William L.','PRT',['S William','Sankhil William','Sankhil William Lamkang']],
 ['Ms. Meena Chettry','PRT',[]],['Ms. Priyanka Gupta','PRT',[]],
 ['Mr. Pankaj Pandey','PRT',[]],['Ms. Kime Muni','PRT',[]],['Ms. Punyo Rinyo','PRT',[]],
 ['Ralo Ripa','PRT',[]],['Ms. Sonam Kumari','PRT Music',[]],['Mr. Panjib Sarkar','Art Instructor',[]]
].map(([name,designation,aliases],index)=>({name,designation,serial:index+1,aliases:[name,...aliases]}));
export const primaryNameKey=value=>String(value||'').normalize('NFKC').toUpperCase().replace(/\b(MR|MRS|MS|DR|SHRI|SMT|MISS)\b\.?\s*/g,'').replace(/[^A-Z]/g,'');
export function primaryStaffEntry(person){if(!person||/\b(PGT|TGT)\b/i.test(person.designation||''))return;const key=primaryNameKey(person.name);if(key==='SUSHIL'&&person.kind!=='prt'&&person.wing!=='primary'&&!/\bPRT\b/i.test(person.designation||''))return;return PRIMARY_ROSTER.find(p=>p.aliases.some(name=>primaryNameKey(name)===key));}
export function primaryDirectory(staff){return Object.fromEntries(Object.entries(staff||{}).map(([id,p])=>{const entry=primaryStaffEntry(p);return [id,entry?{...p,wing:'primary',designation:p.designation||entry.designation}:p];}));}
