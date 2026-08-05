export const PLANT_SOURCING_VERSION = 2;

export const PLANT_AVAILABILITY_STATUSES = [
  'Unknown',
  'Listed online',
  'Contact nursery',
  'Confirmed available',
  'Out of stock',
  'Special order',
  'Ordered',
  'Picked up',
  'Delivered',
];

export const SPECIALTY_PLANT_CATEGORIES = [
  'Citrus',
  'Fruit Trees',
  'Berries',
  'Herbs and Tea Plants',
  'Roses',
  'Native Plants',
  'Annuals and Perennials',
  'Houseplants',
  'Seeds',
  'Landscape Supplies',
  'Tropical Fruit',
  'Passion Fruit and Passiflora',
  'Fig',
  'Pomegranate',
  'Mulberry',
  'Persimmon',
  'Pawpaw',
  'Kiwi',
  'Grapes',
  'Tea Plants',
  'Medicinal Plants',
  'Rare Edibles',
  'Greenhouse Plants',
  'Pollinator Plants',
  'Aquatic and Rain-Garden Plants',
  'Specialty Vines',
  'Specialty Ornamentals',
];

const SEARCH_GROUPS = [
  {
    terms: ['passion fruit', 'passionfruit', 'passion flower', 'passionflower', 'passiflora', 'passiflora edulis', 'maypop', 'passiflora incarnata'],
    categories: ['tropical fruit', 'passion fruit and passiflora', 'rare edibles', 'greenhouse plants', 'specialty vines'],
  },
  { terms: ['fig', 'figs', 'ficus carica'], categories: ['fig', 'fruit trees', 'rare edibles'] },
  { terms: ['pomegranate', 'punica granatum'], categories: ['pomegranate', 'fruit trees', 'rare edibles'] },
  { terms: ['mulberry', 'morus'], categories: ['mulberry', 'fruit trees', 'rare edibles'] },
  { terms: ['persimmon', 'diospyros kaki', 'diospyros virginiana'], categories: ['persimmon', 'fruit trees', 'rare edibles'] },
  { terms: ['pawpaw', 'paw paw', 'asimina triloba'], categories: ['pawpaw', 'fruit trees', 'native plants', 'rare edibles'] },
  { terms: ['kiwi', 'kiwiberry', 'hardy kiwi', 'actinidia'], categories: ['kiwi', 'specialty vines', 'rare edibles'] },
  { terms: ['grape', 'grapes', 'grapevine', 'vitis'], categories: ['grapes', 'specialty vines', 'fruit trees'] },
  { terms: ['tea', 'tea plant', 'camellia sinensis'], categories: ['tea plants', 'herbs and tea plants', 'greenhouse plants'] },
  { terms: ['medicinal herb', 'medicinal herbs', 'herbal medicine', 'culinary herb', 'culinary herbs'], categories: ['medicinal plants', 'herbs and tea plants', 'seeds'] },
  { terms: ['rain garden', 'wetland plant', 'wetland plants', 'aquatic plant', 'aquatic plants', 'pond plant', 'pond plants'], categories: ['aquatic and rain-garden plants', 'native plants'] },
  { terms: ['pollinator plant', 'pollinator plants', 'butterfly plant', 'bee plant'], categories: ['pollinator plants', 'native plants', 'annuals and perennials'] },
];

export const SPECIALTY_NURSERY_SEEDS = [
  {
    id: 'nursery-one-green-world',
    name: 'One Green World',
    website: 'https://onegreenworld.com/',
    phone: '877-353-4028',
    email: 'info@onegreenworld.com',
    city: 'Portland',
    state: 'Oregon',
    location: 'Portland, Oregon',
    sourceType: 'Both',
    categories: ['Tropical Fruit', 'Passion Fruit and Passiflora', 'Fruit Trees', 'Fig', 'Pomegranate', 'Mulberry', 'Persimmon', 'Pawpaw', 'Kiwi', 'Grapes', 'Rare Edibles', 'Specialty Vines'],
    specialties: 'Family-owned fruit nursery with a broad catalog of uncommon edible trees, shrubs, berries, and fruiting vines.',
    plants: 'Passion fruit, passionflower, maypop, citrus, figs, pomegranate, mulberry, persimmon, pawpaw, kiwi, grapes, berries, and nut trees',
    plantKeywords: 'passion fruit, passionfruit, passion flower, passionflower, maypop, rare fruit, subtropical fruit, fruiting vines',
    botanicalNames: 'Passiflora edulis, Passiflora incarnata, Passiflora caerulea, Ficus carica, Punica granatum, Morus, Diospyros, Asimina triloba, Actinidia, Vitis',
    varieties: 'Black Knight, Frederick, Panama Red, Incense, Clear Sky',
    greenhouseSpecialties: 'Container-grown subtropical fruit and frost-sensitive fruiting vines',
    shipsToDelaware: 'Ask nursery',
    localPickupAvailability: 'Available at Portland retail nursery',
    wholesaleAvailability: 'Ask nursery',
    retailAvailability: 'Available',
    shippingNotes: 'Shipping seasons and state restrictions vary by plant; confirm the current ship window before promising a date.',
    minimumOrder: 'No saved minimum; verify with nursery',
    deliveryInformation: 'Carrier delivery; calculated during ordering',
    lastVerifiedDate: '2026-08-05',
    verificationSource: 'https://onegreenworld.com/contact/',
    catalogTerms: 'passion fruit passionflower passiflora edulis maypop passiflora incarnata citrus fig pomegranate mulberry persimmon pawpaw kiwi grape rare fruit',
    broadCatalog: true,
  },
  {
    id: 'nursery-fast-growing-trees',
    name: 'Fast Growing Trees',
    website: 'https://www.fast-growing-trees.com/',
    phone: '800-973-8959',
    email: '',
    city: 'Fort Mill',
    state: 'South Carolina',
    location: 'Fort Mill, South Carolina',
    sourceType: 'Online',
    categories: ['Tropical Fruit', 'Passion Fruit and Passiflora', 'Citrus', 'Fruit Trees', 'Fig', 'Pomegranate', 'Mulberry', 'Persimmon', 'Berries', 'Houseplants', 'Specialty Vines', 'Specialty Ornamentals'],
    specialties: 'Online source for landscape trees, fruiting plants, shrubs, tropicals, and houseplants.',
    plants: 'Passion Fruit Vine, citrus, figs, pomegranate, mulberry, persimmon, loquat, fruit trees, berries, tropical plants, flowering trees, and shrubs',
    plantKeywords: 'passion fruit, passionfruit, passion flower, tropical fruit, fruiting vine, citrus, fig, pomegranate, mulberry, persimmon, loquat',
    botanicalNames: "Passiflora edulis 'Possum Purple', Ficus carica, Punica granatum, Morus, Diospyros",
    varieties: 'Possum Purple passion fruit',
    greenhouseSpecialties: 'Warm-climate fruiting plants and patio tropicals',
    shipsToDelaware: 'Yes',
    localPickupAvailability: 'Not open to the public',
    wholesaleAvailability: 'Bulk discounts may be available; contact nursery',
    retailAvailability: 'Available',
    shippingNotes: 'Product pages provide current restrictions and seasonal timing; confirm plant-specific delivery before ordering.',
    minimumOrder: 'No saved minimum; shipping terms vary',
    deliveryInformation: 'Plants are shipped to the customer address',
    lastVerifiedDate: '2026-08-05',
    verificationSource: 'https://www.fast-growing-trees.com/pages/contact-us',
    catalogTerms: 'passion fruit passionfruit passiflora edulis possum purple citrus fig pomegranate mulberry persimmon loquat fruit tree berry tropical',
    broadCatalog: true,
  },
  {
    id: 'nursery-edible-landscaping',
    name: 'Edible Landscaping',
    website: 'https://ediblelandscaping.com/',
    phone: '434-361-9134',
    email: 'info@ediblelandscaping.com',
    city: 'Afton',
    state: 'Virginia',
    location: 'Afton, Virginia',
    sourceType: 'Both',
    categories: ['Fruit Trees', 'Fig', 'Pomegranate', 'Mulberry', 'Persimmon', 'Pawpaw', 'Kiwi', 'Grapes', 'Berries', 'Rare Edibles', 'Specialty Vines'],
    specialties: 'Regional edible nursery focused on adaptable fruiting trees, shrubs, and vines for home landscapes.',
    plants: 'Persimmons, figs, mulberries, pawpaws, kiwi, grapes, blueberries, fruit trees, and other garden edibles',
    plantKeywords: 'edible landscape, persimmon, fig, mulberry, pawpaw, kiwi, grape, blueberry, rare fruit',
    botanicalNames: 'Diospyros, Ficus carica, Morus, Asimina triloba, Actinidia, Vitis',
    varieties: '',
    greenhouseSpecialties: 'Container-grown edible landscape plants',
    shipsToDelaware: 'Ask nursery',
    localPickupAvailability: 'Available',
    wholesaleAvailability: 'Ask nursery',
    retailAvailability: 'Available',
    shippingNotes: 'The nursery notes that shipped orders usually require processing time; confirm plant and date before committing.',
    minimumOrder: 'No saved minimum; verify with nursery',
    deliveryInformation: 'Shipping and local pickup are offered',
    lastVerifiedDate: '2026-08-05',
    verificationSource: 'https://ediblelandscaping.com/pages/contact-us',
    catalogTerms: 'persimmon fig mulberry pawpaw kiwi grape blueberry fruit tree rare edible',
    broadCatalog: true,
  },
  {
    id: 'nursery-raintree',
    name: 'Raintree Nursery',
    website: 'https://raintreenursery.com/',
    phone: '800-391-8892',
    email: 'help@raintreenursery.com',
    city: 'Morton',
    state: 'Washington',
    location: 'Morton, Washington',
    sourceType: 'Both',
    categories: ['Fruit Trees', 'Citrus', 'Fig', 'Mulberry', 'Persimmon', 'Pawpaw', 'Kiwi', 'Grapes', 'Berries', 'Tea Plants', 'Rare Edibles', 'Specialty Vines'],
    specialties: 'Diverse edible-plant nursery with fruit trees, berries, vines, nuts, and lesser-known food crops.',
    plants: 'Fruit trees, figs, mulberries, pawpaws, persimmons, kiwi, grapes, berries, tea, spice plants, mushrooms, and subtropicals',
    plantKeywords: 'fruit trees, fig, mulberry, pawpaw, persimmon, kiwi, grapes, berries, tea, spices, rare edible',
    botanicalNames: 'Ficus carica, Morus, Asimina triloba, Diospyros, Actinidia, Vitis, Camellia sinensis',
    varieties: '',
    greenhouseSpecialties: 'Container plants and subtropical edibles',
    shipsToDelaware: 'Yes',
    localPickupAvailability: 'Scheduled pickup; garden center currently closed',
    wholesaleAvailability: 'Ask nursery',
    retailAvailability: 'Available online',
    shippingNotes: 'Delaware has a published seasonal shipping window. Verify crop timing, stock, and current shipping policy.',
    minimumOrder: 'No saved minimum; shipping is calculated by order',
    deliveryInformation: 'UPS or USPS depending on destination and plant type',
    lastVerifiedDate: '2026-08-05',
    verificationSource: 'https://raintreenursery.com/pages/growing-guides',
    catalogTerms: 'fig mulberry pawpaw persimmon kiwi grape berry tea camellia sinensis fruit tree rare edible',
    broadCatalog: true,
  },
  {
    id: 'nursery-strictly-medicinal',
    name: 'Strictly Medicinal Seeds',
    website: 'https://strictlymedicinalseeds.com/',
    phone: '541-846-6704',
    email: 'custserv@strictlymedicinalseeds.com',
    city: 'Williams',
    state: 'Oregon',
    location: 'Williams, Oregon',
    sourceType: 'Online',
    categories: ['Medicinal Plants', 'Herbs and Tea Plants', 'Seeds', 'Rare Edibles', 'Greenhouse Plants', 'Pollinator Plants'],
    specialties: 'Medicinal and culinary herb seeds and plants, including uncommon species and grower-oriented collections.',
    plants: 'Medicinal herb seeds, medicinal plants, culinary herbs, tea herbs, pollinator herbs, tree and shrub seeds, and seed collections',
    plantKeywords: 'medicinal herbs, culinary herbs, tea herbs, ashwagandha, tulsi, echinacea, calendula, comfrey, yarrow, marshmallow, rare seeds',
    botanicalNames: 'Withania somnifera, Ocimum tenuiflorum, Echinacea, Calendula officinalis, Symphytum officinale, Achillea millefolium, Althaea officinalis',
    varieties: '',
    greenhouseSpecialties: 'Certified-organic propagation of uncommon medicinal plants',
    shipsToDelaware: 'Ask nursery',
    localPickupAvailability: 'Ask nursery',
    wholesaleAvailability: 'Available for qualifying seed retailers',
    retailAvailability: 'Available',
    shippingNotes: 'Seeds and live plants have different schedules and restrictions; verify the item-specific ship window.',
    minimumOrder: 'No saved retail minimum; wholesale terms vary',
    deliveryInformation: 'Mail-order seed and plant delivery',
    lastVerifiedDate: '2026-08-05',
    verificationSource: 'https://strictlymedicinalseeds.com/about-us/',
    catalogTerms: 'medicinal herb culinary herb tea herb ashwagandha tulsi echinacea calendula comfrey yarrow marshmallow seed',
    broadCatalog: true,
  },
  {
    id: 'nursery-camellia-forest',
    name: 'Camellia Forest Nursery',
    website: 'https://camforest.com/',
    phone: '919-968-0504',
    email: 'camelliaforest@gmail.com',
    city: 'Chapel Hill',
    state: 'North Carolina',
    location: 'Chapel Hill, North Carolina',
    sourceType: 'Both',
    categories: ['Tea Plants', 'Herbs and Tea Plants', 'Greenhouse Plants', 'Specialty Ornamentals', 'Annuals and Perennials'],
    specialties: 'Family nursery specializing in tea and ornamental camellias plus uncommon Asian trees and shrubs.',
    plants: 'Camellia sinensis tea plants, ornamental camellias, Asian trees, shrubs, conifers, seeds, and selected perennials',
    plantKeywords: 'tea plant, green tea, black tea, white tea, camellia, ornamental camellia, Asian shrubs',
    botanicalNames: 'Camellia sinensis, Camellia japonica, Camellia sasanqua',
    varieties: 'Silver Dust, Yellow Tea, ornamental camellia cultivars',
    greenhouseSpecialties: 'Tea camellias, rare camellia species, and greenhouse-grown ornamentals',
    shipsToDelaware: 'Yes',
    localPickupAvailability: 'Available by nursery arrangement',
    wholesaleAvailability: 'Ask nursery',
    retailAvailability: 'Available',
    shippingNotes: 'The nursery recommends avoiding summer shipping and asks customers to confirm current availability.',
    minimumOrder: 'No saved minimum; verify with nursery',
    deliveryInformation: 'UPS ground for plants; pickup by arrangement',
    lastVerifiedDate: '2026-08-05',
    verificationSource: 'https://camforest.com/pages/contact-us',
    catalogTerms: 'tea plant camellia sinensis camellia japonica camellia sasanqua ornamental camellia Asian shrub',
    broadCatalog: true,
  },
  {
    id: 'nursery-aquascapes-unlimited',
    name: 'Aquascapes Unlimited',
    website: 'https://www.aquascapesunlimited.com/',
    phone: '215-766-8151',
    email: '',
    city: 'Pipersville',
    state: 'Pennsylvania',
    location: 'Pipersville, Pennsylvania',
    sourceType: 'Wholesale',
    categories: ['Aquatic and Rain-Garden Plants', 'Native Plants', 'Pollinator Plants', 'Specialty Ornamentals'],
    specialties: 'Wholesale grower of native wetland, rain-garden, restoration, aquatic, and carnivorous plants.',
    plants: 'Native wetland perennials, rain-garden plants, ornamental aquatics, water lilies, lotus, pitcher plants, and restoration material',
    plantKeywords: 'rain garden, wetland plants, aquatic plants, pond plants, water lilies, lotus, pitcher plants, Sarracenia, stormwater plants',
    botanicalNames: 'Sarracenia, Nymphaea, Nelumbo, native wetland perennials',
    varieties: '',
    greenhouseSpecialties: 'Aquatic perennials, carnivorous plants, and native wetland propagation',
    shipsToDelaware: 'Ask nursery',
    localPickupAvailability: 'Ask nursery',
    wholesaleAvailability: 'Available to qualifying trade customers',
    retailAvailability: 'Not listed as general retail',
    shippingNotes: 'Trade-oriented supplier; confirm account eligibility, minimums, freight, and current crop availability.',
    minimumOrder: 'Verify wholesale minimum with nursery',
    deliveryInformation: 'Wholesale distribution and project delivery terms require confirmation',
    lastVerifiedDate: '2026-08-05',
    verificationSource: 'https://www.aquascapesunlimited.com/page/About-Us',
    catalogTerms: 'rain garden wetland plants aquatic plants pond plants water lily lotus sarracenia pitcher plant native restoration',
    broadCatalog: false,
  },
];

export function normalizePlantSearch(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function expandPlantSearch(value = '') {
  const query = normalizePlantSearch(value);
  if (!query) return { query: '', terms: [], categories: [] };
  const group = SEARCH_GROUPS.find(item => item.terms.some(term => {
    const normalized = normalizePlantSearch(term);
    return normalized === query || normalized.includes(query) || query.includes(normalized);
  }));
  return {
    query,
    terms: [...new Set([query, ...(group?.terms || []).map(normalizePlantSearch)])],
    categories: [...new Set((group?.categories || []).map(normalizePlantSearch))],
  };
}

const hasAny = (value, terms) => {
  const haystack = normalizePlantSearch(value);
  return Boolean(haystack && terms.some(term => term && haystack.includes(term)));
};

export function matchNurseryToPlant(nursery = {}, value = '') {
  const expanded = expandPlantSearch(value);
  if (!expanded.query) return { matched: true, score: 0, matchType: 'Directory source', listedOnline: false };
  if (hasAny([nursery.name, nursery.location, nursery.city, nursery.state].filter(Boolean).join(' '), [expanded.query])) {
    return { matched: true, score: 550, matchType: 'Nursery match', listedOnline: false };
  }
  const exactFields = [nursery.plants, nursery.plantKeywords];
  const directExact = exactFields.some(field => hasAny(field, [expanded.query]));
  if (directExact) return { matched: true, score: 500, matchType: 'Exact plant match', listedOnline: hasAny(nursery.catalogTerms, expanded.terms) };
  if (hasAny(nursery.botanicalNames, expanded.terms)) return { matched: true, score: 450, matchType: 'Botanical-name match', listedOnline: hasAny(nursery.catalogTerms, expanded.terms) };
  if (hasAny(nursery.varieties, expanded.terms)) return { matched: true, score: 400, matchType: 'Variety match', listedOnline: hasAny(nursery.catalogTerms, expanded.terms) };
  if ([...(nursery.categories || []), nursery.specialties].some(field => hasAny(field, [...expanded.terms, ...expanded.categories]))) return { matched: true, score: 300, matchType: 'Category match', listedOnline: false };
  if ([nursery.greenhouseSpecialties, nursery.notes, nursery.shippingNotes].some(field => hasAny(field, [...expanded.terms, ...expanded.categories]))) return { matched: true, score: 200, matchType: 'Likely specialty grower', listedOnline: false };
  return { matched: false, score: 0, matchType: '', listedOnline: false };
}

export function findPlantSupplierMatches(nurseries = [], value = '') {
  const query = normalizePlantSearch(value);
  if (!query) return nurseries.map(nursery => ({ nursery, ...matchNurseryToPlant(nursery, '') }));
  const matches = nurseries
    .map(nursery => ({ nursery, ...matchNurseryToPlant(nursery, value) }))
    .filter(result => result.matched)
    .sort((a, b) => b.score - a.score || a.nursery.name.localeCompare(b.nursery.name));
  if (matches.length) return matches;
  return nurseries
    .filter(nursery => nursery.broadCatalog && !nursery.archived)
    .slice(0, 3)
    .map(nursery => ({ nursery, matched: true, score: 100, matchType: 'Likely specialty grower', listedOnline: false, fallback: true }));
}

export function availabilityForPlant(nursery = {}, value = '', match = {}) {
  const query = normalizePlantSearch(value);
  const saved = (Array.isArray(nursery.plantAvailability) ? nursery.plantAvailability : [])
    .find(item => normalizePlantSearch(item.plantQuery) === query);
  if (saved) return saved;
  return {
    plantQuery: String(value || '').trim(),
    status: query ? (match.listedOnline ? 'Listed online' : 'Contact nursery') : 'Unknown',
    lastVerifiedDate: match.listedOnline ? nursery.lastVerifiedDate || '' : '',
    note: match.listedOnline ? 'Catalog listing found; current stock and delivery timing are not confirmed.' : '',
  };
}
