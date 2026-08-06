export const ACADEMY_SCHOOLS = [
  ['horticulture-foundations', 'Horticulture Foundations', 'How plants, sites, seasons, and maintenance decisions work together.'],
  ['plant-biology', 'Plant Biology and Physiology', 'Plant structures, growth, energy, transport, and environmental response.'],
  ['soil-science', 'Soil Science and Plant Nutrition', 'Soil texture, structure, water, pH, nutrients, and responsible amendments.'],
  ['plant-identification', 'Plant Identification', 'A repeatable method for observing, describing, and identifying plants.'],
  ['landscape-design', 'Landscape Design', 'Site-responsive concepts that connect function, beauty, care, and budget.'],
  ['irrigation', 'Irrigation and Water Management', 'Water movement, irrigation methods, design fundamentals, and troubleshooting.'],
  ['plant-health', 'Plant Health, Pests, and Diseases', 'Evidence-led diagnosis, integrated management, and honest uncertainty.'],
  ['trees-arboriculture', 'Trees and Arboriculture', 'Tree biology, selection, establishment, care, and risk awareness.'],
  ['fruit-orchard-berry', 'Fruit, Orchard, and Berry Production', 'Productive plant selection, pollination, training, and seasonal care.'],
  ['sustainable-horticulture', 'Sustainable Horticulture', 'Resource-conscious practices grounded in site conditions and measured outcomes.'],
  ['native-pollinator-ecology', 'Native Plants, Pollinators, and Ecology', 'Ecological relationships, habitat value, and regionally appropriate choices.'],
  ['greenhouse', 'Greenhouse and Controlled Environments', 'Light, temperature, humidity, sanitation, propagation, and crop care.'],
  ['landscape-installation', 'Landscape Installation', 'Site preparation, sequencing, planting, quality control, and safety.'],
  ['hardscape', 'Hardscape Fundamentals', 'Base preparation, drainage, materials, layout, and installation boundaries.'],
  ['garden-maintenance', 'Garden Maintenance and Seasonal Care', 'Pruning, weeding, mulching, monitoring, and seasonal work planning.'],
  ['edible-design', 'Edible Landscape Design', 'Productive gardens that remain functional, accessible, and visually intentional.'],
  ['sensory-therapeutic', 'Sensory and Therapeutic Gardens', 'Accessible, optional sensory engagement without unsupported health claims.'],
  ['tea-herb-specialty', 'Tea, Herb, and Specialty Gardens', 'Culinary, aromatic, and specialty crops with practical harvest planning.'],
  ['client-communication', 'Client Consultations and Communication', 'Clear discovery, expectation-setting, recommendations, and follow-through.'],
  ['business-operations', 'Landscape Business Operations', 'Scope, estimating, sourcing, scheduling, records, and profitable delivery.'],
].map(([id, title, summary], index) => ({
  id: `academy-school-${id}`,
  slug: id,
  title,
  summary,
  order: index + 1,
  status: ['horticulture-foundations', 'soil-science', 'plant-identification', 'landscape-design', 'irrigation', 'plant-health', 'client-communication', 'business-operations'].includes(id) ? 'level-1-complete' : 'framework',
}));

export const ACADEMY_RANKS = [
  { id: 'apprentice', title: 'Apprentice', minimumCompletedLevels: 0, minimumPractical: 0, minimumMastery: 0, requiredSchoolSlugs: [] },
  { id: 'developing-grower', title: 'Developing Grower', minimumCompletedLevels: 2, minimumPractical: 2, minimumMastery: 85, requiredSchoolSlugs: ['horticulture-foundations', 'soil-science'] },
  { id: 'plant-specialist', title: 'Plant Specialist', minimumCompletedLevels: 5, minimumPractical: 5, minimumMastery: 87, requiredSchoolSlugs: ['horticulture-foundations', 'soil-science', 'plant-identification', 'plant-health', 'irrigation'] },
  { id: 'landscape-designer', title: 'Landscape Designer', minimumCompletedLevels: 8, minimumPractical: 8, minimumMastery: 88, requiredSchoolSlugs: ['horticulture-foundations', 'soil-science', 'plant-identification', 'plant-health', 'irrigation', 'landscape-design', 'client-communication', 'business-operations'] },
  { id: 'horticulture-professional', title: 'Horticulture Professional', minimumCompletedLevels: 14, minimumPractical: 14, minimumMastery: 90, requiredSchoolSlugs: ['horticulture-foundations', 'soil-science', 'plant-identification', 'plant-health', 'irrigation', 'landscape-design', 'client-communication', 'business-operations', 'trees-arboriculture', 'landscape-installation'] },
  { id: 'master-practitioner', title: 'Tierra Fleur Master Practitioner', minimumCompletedLevels: 20, minimumPractical: 20, minimumMastery: 92, requiredSchoolSlugs: ACADEMY_SCHOOLS.map(item => item.slug) },
];

export const IRRIGATION_LEVEL_FRAMEWORK = [
  ['academy-level-irrigation-1', 1, 'Water and Soil Fundamentals', 'complete', ['Landscape water cycle', 'Soil moisture', 'Infiltration', 'Percolation', 'Drainage', 'Evaporation', 'Transpiration', 'Evapotranspiration basics', 'Field capacity', 'Permanent wilting point', 'Water-holding capacity', 'Sandy, clay, and loam behavior', 'Compaction', 'Mulch and moisture retention', 'Basic drainage tests', 'Underwatering and overwatering signs']],
  ['academy-level-irrigation-2', 2, 'Irrigation Methods', 'framework', ['Hand watering', 'Watering wands', 'Soaker hoses', 'Drip irrigation', 'Drip emitters', 'Drip tape', 'Micro-sprays', 'Bubblers', 'Spray heads', 'Rotor sprinklers', 'Hose-end systems', 'Rain barrels', 'Smart controllers', 'Rain sensors', 'Soil-moisture sensors', 'Method advantages and limitations']],
  ['academy-level-irrigation-3', 3, 'System Components', 'framework', ['Water source', 'Hose bib', 'Backflow-prevention concepts', 'Valves', 'Zones', 'Main lines', 'Lateral lines', 'Filters', 'Pressure regulators', 'Emitters', 'Sprinkler heads', 'Fittings', 'Timers', 'Controllers', 'Flush valves', 'Basic maintenance']],
  ['academy-level-irrigation-4', 4, 'Design Fundamentals', 'framework', ['Site assessment', 'Hydro-zoning', 'Matching plants by water demand', 'Pressure basics', 'Flow-rate basics', 'Pipe-sizing concepts', 'Head spacing', 'Distribution uniformity', 'Precipitation rate', 'Avoiding overspray', 'Slope, sun, and wind', 'Establishment versus mature watering', 'Seasonal scheduling', 'Water budgeting']],
  ['academy-level-irrigation-5', 5, 'Specialty Applications', 'framework', ['Fruit trees', 'Micro-orchards', 'Berry gardens', 'Raised beds', 'Vegetable gardens', 'Tea gardens', 'Herb gardens', 'Container gardens', 'Greenhouses', 'Native landscapes', 'Pollinator gardens', 'Rain gardens', 'Sensory gardens', 'Newly installed landscapes']],
  ['academy-level-irrigation-6', 6, 'Troubleshooting and Maintenance', 'framework', ['Dry spots', 'Clogged emitters', 'Leaks', 'Broken heads', 'Low pressure', 'Excess pressure', 'Uneven coverage', 'Root intrusion', 'Controller errors', 'Overwatering', 'Runoff', 'Winterization', 'Spring startup', 'Routine inspection']],
].map(([id, number, title, status, topics]) => ({ id, number, title, status, topics }));

export const ACADEMY_CAPSTONE_FRAMEWORK = {
  id: 'academy-capstone-landscape-professional',
  title: 'Landscape Professional Capstone',
  status: 'framework',
  practiceByDefault: true,
  briefFields: ['Client type', 'Property description', 'Goals', 'Sun exposure', 'Soil conditions', 'Drainage', 'Budget', 'Maintenance preference', 'Plant restrictions', 'Timeline'],
  deliverables: ['Client consultation record', 'Site analysis', 'Plant selections', 'Design District concept', 'Irrigation concept where applicable', 'Materials calculation', 'Sourcing list', 'Estimate', 'Plain-language rationale', 'Installation sequence', 'Maintenance plan', 'Reflection'],
};
