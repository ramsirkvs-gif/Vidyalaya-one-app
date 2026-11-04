import {distinctMCQTopics,canonicalMCQTopic,mcqKnownTopicAliases} from './cbse-mcq-topics.js';
// Public PDF copies were read and reviewed; direct verification against the official host remains pending.
export const MCQ_SYLLABUS={
 "session": "2026–27",
 "source": "https://cbseacademic.nic.in/curriculum_2027.html",
 "verified": false,
 "sources": {
  "X": {
   "mathematics": {
    "kind": "reviewed-public-copy",
    "url": "https://github.com/usp1904/cbse-app/blob/e1f9905ae09eec154d492e60ed949ac3eb6ba08b/Syllabus_2026-27/CBSE/Class_10/CBSE_Class10_Mathematics_2026-27.pdf",
    "reportedOfficialURL": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf",
    "sha256": "d773e7c12b99e0bd498067e2b8268c76d0496bf9cad1c9e41c8652ab68b412a5",
    "reviewedOn": "2026-11-02"
   },
   "science": {
    "kind": "reviewed-public-copy",
    "url": "https://github.com/usp1904/cbse-app/blob/e1f9905ae09eec154d492e60ed949ac3eb6ba08b/Syllabus_2026-27/CBSE/Class_10/CBSE_Class10_Science_2026-27.pdf",
    "reportedOfficialURL": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf",
    "sha256": "07b3264d45e75e6477c7389bcdd84718553a91e141c8d8f6a3e768621bc601ec",
    "reviewedOn": "2026-11-02",
    "assessmentNote": "The copy distinguishes formative-only material. Its year-end assessment note also mentions Heredity and Evolution; check this note before preparing a summative paper."
   }
  },
  "XII": {
   "mathematics": {
    "kind": "reviewed-public-copy",
    "url": "https://github.com/usp1904/cbse-app/blob/e1f9905ae09eec154d492e60ed949ac3eb6ba08b/Syllabus_2026-27/CBSE/Class_12/CBSE_Class12_Mathematics_2026-27.pdf",
    "reportedOfficialURL": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Maths_SecP2_2026-27.pdf",
    "sha256": "5bf4105d4076189fe00b879fd6d41ffadec87a894a078a7fb912b2f219769572",
    "reviewedOn": "2026-11-02"
   },
   "physics": {
    "kind": "reviewed-public-copy",
    "url": "https://github.com/usp1904/cbse-app/blob/e1f9905ae09eec154d492e60ed949ac3eb6ba08b/Syllabus_2026-27/CBSE/Class_12/CBSE_Class12_Physics_2026-27.pdf",
    "reportedOfficialURL": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf",
    "sha256": "9e32271cf5a86caa605cffe2a4b5e19710abc3d3a8715ef725ba78cd94caf1f7",
    "reviewedOn": "2026-11-02"
   },
   "chemistry": {
    "kind": "reviewed-public-copy",
    "url": "https://github.com/usp1904/cbse-app/blob/e1f9905ae09eec154d492e60ed949ac3eb6ba08b/Syllabus_2026-27/CBSE/Class_12/CBSE_Class12_Chemistry_2026-27.pdf",
    "reportedOfficialURL": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Chemistry_SecP2_2026-27.pdf",
    "sha256": "5610f09d357d3ccc9a7b39fc29cb7b1f4530847753783b16c72fff691acd2418",
    "reviewedOn": "2026-11-02"
   },
   "biology": {
    "kind": "reviewed-public-copy",
    "url": "https://github.com/usp1904/cbse-app/blob/e1f9905ae09eec154d492e60ed949ac3eb6ba08b/Syllabus_2026-27/CBSE/Class_12/CBSE_Class12_Biology_2026-27.pdf",
    "reportedOfficialURL": "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf",
    "sha256": "3a5767515b41b12b9356151e759beba48bb15a1b711b96c321fa273a7fa7a6ee",
    "reviewedOn": "2026-11-02"
   }
  }
 },
 "topics": {
  "X": {
   "mathematics": [
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations in Two Variables",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Coordinate Geometry",
    "Triangles",
    "Circles",
    "Introduction to Trigonometry",
    "Trigonometric Identities",
    "Heights and Distances",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability"
   ],
   "science": [
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Metals and Non-metals",
    "Carbon and its Compounds",
    "Life Processes",
    "Control and Co-ordination",
    "How do Organisms Reproduce?",
    "Heredity",
    "Light — Reflection and Refraction",
    "The Human Eye and the Colourful World",
    "Electricity",
    "Magnetic Effects of Electric Current",
    "Our Environment"
   ]
  },
  "XII": {
   "mathematics": [
    "Relations and Functions",
    "Inverse Trigonometric Functions",
    "Matrices",
    "Determinants",
    "Continuity and Differentiability",
    "Applications of Derivatives",
    "Integrals",
    "Application of the Integrals",
    "Differential Equations",
    "Vectors",
    "Three-dimensional Geometry",
    "Linear Programming",
    "Probability"
   ],
   "physics": [
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
    "Magnetism and Matter",
    "Electromagnetic Induction",
    "Alternating Current",
    "Electromagnetic Waves",
    "Ray Optics and Optical Instruments",
    "Wave Optics",
    "Dual Nature of Radiation and Matter",
    "Atoms",
    "Nuclei",
    "Semiconductor Electronics: Materials, Devices and Simple Circuits"
   ],
   "chemistry": [
    "Solutions",
    "Electrochemistry",
    "Chemical Kinetics",
    "d and f Block Elements",
    "Coordination Compounds",
    "Haloalkanes and Haloarenes",
    "Alcohols, Phenols and Ethers",
    "Aldehydes, Ketones and Carboxylic Acids",
    "Amines",
    "Biomolecules"
   ],
   "biology": [
    "Sexual Reproduction in Flowering Plants",
    "Human Reproduction",
    "Reproductive Health",
    "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance",
    "Evolution",
    "Human Health and Diseases",
    "Microbes in Human Welfare",
    "Biotechnology — Principles and Processes",
    "Biotechnology and its Applications",
    "Organisms and Populations",
    "Ecosystem",
    "Biodiversity and its Conservation"
   ]
  }
 }
};
MCQ_SYLLABUS.additionalTopics={X:{science:['Periodic Classification of Elements (formative only)','Evolution (formative only)','Electric Motor, Electromagnetic Induction and Generator (formative only)']}};
const subjectKey=value=>{const name=String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/ \d{3}$/,'');if(/^(maths?|mathematics)( standard| basic| core)?( \d+)?$/.test(name))return 'mathematics';return name.trim();};
export function syllabusTopicSource(classId,subjectName){return MCQ_SYLLABUS.sources[classId]?.[subjectKey(subjectName)]||null;}
export function fixedMCQTopics(classId,subjectName){return classId==='X'&&subjectKey(subjectName)==='science'?[...MCQ_SYLLABUS.topics.X.science]:null;}
export function syllabusTopics(classId,subjectName,saved=[]){const fixed=fixedMCQTopics(classId,subjectName);if(fixed)return fixed;const key=subjectKey(subjectName),reviewed=syllabusTopicSource(classId,subjectName)?MCQ_SYLLABUS.topics[classId]?.[key]||[]:[];return distinctMCQTopics(['Mixed',...reviewed,...saved.map(name=>canonicalMCQTopic(name,mcqKnownTopicAliases(classId,subjectName)))]);}
