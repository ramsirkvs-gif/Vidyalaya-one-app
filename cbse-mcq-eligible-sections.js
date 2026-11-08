export function mcqEligibleSections(draft,classId,subjectId){return Object.entries(draft?.classes?.[classId]?.sections||{}).filter(([,s])=>!!subjectId&&Object.hasOwn(s.subjects||{},subjectId));}
