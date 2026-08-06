import { ACADEMY_SCHOOLS } from './academyCatalog.js';

const priority = [
  ['horticulture-foundations', ['Read the site before choosing the plant', 'Think in life cycles and seasonal growth', 'Observe, interpret, act, and verify'], ['plant–site fit', 'seasonal growth', 'evidence-led care'], ['microclimate', 'hardiness', 'dormancy', 'symptom', 'sign', 'monitoring']],
  ['soil-science', ['Texture, structure, pores, and compaction', 'Follow water through the root zone', 'pH, nutrients, organic matter, and amendments'], ['texture and structure', 'infiltration and drainage', 'evidence-based amendments'], ['texture', 'structure', 'infiltration', 'percolation', 'field capacity', 'pH']],
  ['landscape-design', ['Turn client goals and site facts into a design brief', 'Organize scale, balance, rhythm, unity, and contrast', 'Layer plants for mature size, access, and change'], ['site and client analysis', 'design composition', 'mature planting plans'], ['program', 'scale', 'rhythm', 'unity', 'focal point', 'mature spread']],
  ['irrigation', ['Trace water through a landscape', 'Compare soil water-holding behavior', 'Recognize water stress without guessing'], ['water pathways', 'soil-water behavior', 'watering diagnosis'], ['infiltration', 'percolation', 'evapotranspiration', 'field capacity', 'permanent wilting point', 'hydro-zone']],
  ['plant-identification', ['Describe leaves, stems, flowers, fruit, and habit', 'Narrow candidates with keys, records, and context', 'Record confidence, sources, and field observations'], ['plant morphology', 'candidate comparison', 'identification confidence'], ['opposite', 'alternate', 'margin', 'inflorescence', 'phenology', 'provisional']],
  ['plant-health', ['Read symptoms, signs, distribution, and time', 'Compare abiotic stress, pests, and disease', 'Use integrated plant health management'], ['diagnostic evidence', 'abiotic and biotic causes', 'integrated management'], ['symptom', 'sign', 'abiotic', 'biotic', 'threshold', 'integrated management']],
  ['client-communication', ['Lead a purposeful client discovery conversation', 'Recommend without lecturing or overpromising', 'Close with scope, assumptions, and next actions'], ['client discovery', 'plain-language recommendations', 'scope boundaries'], ['discovery', 'constraint', 'tradeoff', 'scope', 'exclusion', 'assumption']],
  ['business-operations', ['Define deliverables, assumptions, and change boundaries', 'Price the whole project', 'Build a reliable project handoff and closeout'], ['observable scope', 'whole-project estimating', 'operational delivery'], ['deliverable', 'allowance', 'direct cost', 'overhead', 'gross margin', 'dependency']],
];

export const ACADEMY_SEARCH_RECORDS = [
  ...ACADEMY_SCHOOLS.map(item => ({ id: item.id, title: item.title, detail: `${item.status === 'level-1-complete' ? 'Complete Level 1' : 'Framework'} · Academy school`, text: item.summary })),
  ...priority.flatMap(([slug, lessons, objectives, vocabulary]) => {
    const school = ACADEMY_SCHOOLS.find(item => item.slug === slug);
    return [
      ...lessons.map((title, index) => ({ id: `academy-lesson-${slug}-${index + 1}`, title, detail: `${school.title} · Lesson`, text: `${objectives[index]} ${vocabulary.join(' ')}` })),
      ...objectives.map((title, index) => ({ id: `academy-objective-${slug}-${index + 1}`, title, detail: `${school.title} · Learning objective`, text: lessons[index] })),
      ...vocabulary.map(term => ({ id: `academy-vocabulary-${slug}-${term}`, title: term, detail: `${school.title} · Vocabulary`, text: objectives.join(' ') })),
    ];
  }),
];
