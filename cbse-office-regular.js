// Approved office-assignment roster. These references never grant login or PIN access.
export const OFFICE_REGULAR_EMPLOYEES=[
 ['MR. RAMKUMAR SINGH SIKARWAR'],
 ['Mrs. EJUM TAIPODIA ZIRDO','ET Zirdo','E T Zirdo'],
 ['Mr. Paramveer Meena'],['MR. RAMESH YADAV'],
 ['MR. SANTOSH KUMAR VERMA','SK Verma','S K Verma'],
 ['SATISH KUMAR MEENA'],['MR. SUNIL KUMAR'],['Dr. MOHAN SINGH RAJPUT'],
 ['Mr. SUSHIL KUMAR'],['MRS. PRAGNYA PRIYAMBADA'],['Mr. BHARAT LAL MEENA'],
 ['MR. AJAY KR. CHAUBEY','Ajay Kumar Chaubey'],['MR. JITENDER PAUL','Jitendra Paul'],
 ['MR. SANTOSH KUMAR YADAV'],['Ms. SWETA KESTWAL'],['MR. ABHISHEK SINGH'],
 ['MRS. VANSHITA SHARMA'],['Ms.PRIYANKA MEHTA'],
 ['Ajay Pratap Singh Chauhan','Ajay Pratap Singh C'],['DEVENDRA KUMAR MEENA'],
 ['DIPTI SINGH'],['GAURAV SINGH'],['DEVA RAM'],['JYOTI VERMA'],['MONIKA YADAV'],
 ['MR, NITISH RAJ SHARMA'],['VANDANA UMANG'],['Mr. ROTHASH','Rohtash','Rohtas','Rohtash Virat'],
 ['Mr. POORAN MAL MEENA','Pooranmal Meena'],['Mr. GIRRAJ PRASAD MEENA'],
 ['MR. ANIL KUMAR'],['MR. POORAN'],['MR. SUSHIL'],['Mr. CHANDRA PRAKASH JILEWA','Chandra Prakash Jileva'],
 ['SMT. ANNU KUMARI'],['MS. AARUSHI BATRA'],['MS. BHAIRVI YADAV','Bhairavi Yadav','Bhairavi'],
 ['MS. KIRTIKA'],['MS. SHANTI'],['MR. SUYASH PATEL'],['MS. PREETI'],['MS. ANJALI'],
 ['MR. TUSHAR','Tussar'],['SMT. SONI'],['MR. ADESH CHOUDHARY'],['SMT. K.M. SMRITI','KM Smriti','K M Smriti'],
 ['MR. SANKHIL WILLIAM LAMKANG','S William','Sankhil William'],
 ['Mr. ARJUN BORI'],['Mr. Pramod Paswan'],['MR. SUMIT PURI'],['MRS. TOKO MINA']
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
