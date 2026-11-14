// Approved office-assignment roster. These references never grant login or PIN access.
export const OFFICE_REGULAR_EMPLOYEES=[
 ['MR. RAMKUMAR SINGH SIKARWAR','Principal'],
 ['Mrs. EJUM TAIPODIA ZIRDO','ET Zirdo','E T Zirdo'],
 ['Mr. Paramveer Meena'],['MR. RAMESH YADAV'],
 ['MR. SANTOSH KUMAR VERMA','SK Verma','S K Verma','Santosh K Verma'],
 ['SATISH KUMAR MEENA'],['MR. SUNIL KUMAR'],['Dr. MOHAN SINGH RAJPUT'],
 ['Mr. SUSHIL KUMAR','Sushil PGT','Sushil Physics'],['MRS. PRAGNYA PRIYAMBADA','Pragya P','Prgya P','Pragnya P'],['Mr. BHARAT LAL MEENA','BL Meena','B L Meena'],
 ['MR. AJAY KR. CHAUBEY','Ajay Kumar Chaubey','Ajay KC','Ajay K C','Ajay Chubey','Ajay Chaubey','AjayKC','Ajay K Chaubey'],['MR. JITENDER PAUL','Jitendra Paul'],
 ['MR. SANTOSH KUMAR YADAV','Santosh K Yadav'],['Ms. SWETA KESTWAL','Sweta K'],['MR. ABHISHEK SINGH'],
 ['MRS. VANSHITA SHARMA'],['Ms.PRIYANKA MEHTA'],
 ['Ajay Pratap Singh Chauhan','Ajay Pratap Singh C','Ajay Pratap Singh','Ajay Pratrap Singh','Ajaya Pratp Singh'],['DEVENDRA KUMAR MEENA','DK Meena','D K Meena'],
 ['DIPTI SINGH'],['GAURAV SINGH'],['DEVA RAM','Devaram'],['JYOTI VERMA'],['MONIKA YADAV'],
 ['MR, NITISH RAJ SHARMA'],['VANDANA UMANG'],['Mr. ROTHASH','Rohtash','Rohtas','Rohtash Virat','Rohatsh','HM','Headmaster','HM Rohtash','HM Rohatsh'],
 ['Mr. POORAN MAL MEENA','Pooranmal Meena'],['Mr. GIRRAJ PRASAD MEENA','Girraj P Meena'],
 ['MR. ANIL KUMAR'],['MR. POORAN','Pooran PRT'],['MR. SUSHIL','Sushil PRT'],['Mr. CHANDRA PRAKASH JILEWA','Chandra Prakash Jileva','CP Jilewa','C P Jilewa'],
 ['SMT. ANNU KUMARI'],['MS. AARUSHI BATRA'],['MS. BHAIRVI YADAV','Bhairavi Yadav','Bhairavi'],
 ['MS. KIRTIKA'],['MS. SHANTI'],['MR. SUYASH PATEL'],['MS. PREETI'],['MS. ANJALI'],
 ['MR. TUSHAR','Tussar'],['SMT. SONI'],['MR. ADESH CHOUDHARY'],['SMT. K.M. SMRITI','KM Smriti','K M Smriti','KM Smrati','K M Smrati','Smriti'],
 ['MR. SANKHIL WILLIAM LAMKANG','S William','Sankhil William'],
 ['Mr. ARJUN BORI','ASO'],['Mr. Pramod Paswan','SSA'],['MR. SUMIT PURI','JSA'],['MRS. TOKO MINA']
];
export const officeEmployeeKey=name=>String(name).normalize('NFKC').toUpperCase().replace(/\b(MR|MRS|MS|DR|SMT|SHRI|SMT|MISS)\b/g,'').replace(/[^A-Z0-9]/g,'');
export function officeRegularDirectory(staff={}){
 const roster=OFFICE_REGULAR_EMPLOYEES.map(([name,...aliases],index)=>({name,aliases:[name,...aliases],order:index+1})),output={};
 const owners=new Map();for(const person of roster)for(const name of person.aliases){const key=officeEmployeeKey(name);if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(person.order);}
 const officeIds={'ARJUNBORI':'office:arjun-bori','PRAMODPASWAN':'office:pramod-paswan','SUMITPURI':'office:sumit-puri'};
 for(const person of roster){
  const keys=new Set(person.aliases.map(officeEmployeeKey)),matches=Object.entries(staff).filter(([,p])=>{const key=officeEmployeeKey(p.name);return keys.has(key)&&owners.get(key)?.size===1;});
  const officeId=officeIds[officeEmployeeKey(person.name)],reference='office-regular:'+officeEmployeeKey(person.name).toLowerCase(),id=officeId||matches[0]?.[0]||reference;
  output[id]={name:person.name,designation:officeId?({'office:arjun-bori':'ASO','office:pramod-paswan':'SSA','office:sumit-puri':'JSA'}[officeId]):matches[0]?.[1]?.designation||'Regular employee',order:person.order,aliases:person.aliases,identityIds:[...new Set([id,reference,...matches.flatMap(([key,p])=>[key,...(p.officeIdentityIds||p.identityIds||[])])])]};
 }
 return output;
}
