export const DESIGN_VISUAL_SPRITE_PATH = '/assets/design-elements.svg';

export const DESIGN_VISUAL_CATEGORIES = [
  'Fruit Trees',
  'Ornamental Trees',
  'Evergreen Trees',
  'Shrubs',
  'Flowers and Perennials',
  'Grasses and Groundcovers',
  'Herbs and Edibles',
  'Containers',
  'Structures',
  'Lighting',
  'Hardscape',
];

export const DESIGN_VIEW_STYLES = [
  ['front', 'Front / elevation'],
  ['plan', 'Top-down plan'],
  ['symbol', 'Simplified symbol'],
];

const element = (id, category, name, assetKey, elementKind, botanicalName = '', matureWidth = 0, matureHeight = 0, defaultWidth = 112, defaultHeight = 112, details = {}) => ({
  id,
  designElementId: id,
  category,
  name,
  commonName: elementKind === 'plant' ? name : '',
  botanicalName,
  imageAsset: `local-svg:design-elements#${assetKey}`,
  assetKey,
  elementKind,
  viewStyles: DESIGN_VIEW_STYLES.map(([value]) => value),
  defaultViewStyle: 'front',
  defaultWidth,
  defaultHeight,
  matureWidth,
  matureHeight,
  suggestedSpacing: matureWidth,
  sunRequirement: details.sunRequirement || '',
  waterRequirement: details.waterRequirement || '',
  usdaZone: details.usdaZone || '',
  edible: Boolean(details.edible),
  pollinatorValue: details.pollinatorValue || '',
  unitCost: '',
  supplier: '',
  installationNotes: '',
  favorite: false,
  lastUsedAt: '',
  useCount: 0,
  builtIn: true,
  archived: false,
});

export const BUILT_IN_DESIGN_ELEMENTS = [
  element('design-element-local-01', 'Fruit Trees', 'Apple tree', 'apple-tree', 'plant', 'Malus domestica', 16, 18, 128, 154, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', usdaZone: '4–8', edible: true, pollinatorValue: 'High' }),
  element('design-element-visual-peach-tree', 'Fruit Trees', 'Peach tree', 'peach-tree', 'plant', 'Prunus persica', 15, 15, 128, 148, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', usdaZone: '5–9', edible: true, pollinatorValue: 'High' }),
  element('design-element-visual-pear-tree', 'Fruit Trees', 'Pear tree', 'pear-tree', 'plant', 'Pyrus communis', 15, 18, 124, 154, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', usdaZone: '4–8', edible: true, pollinatorValue: 'High' }),
  element('design-element-visual-plum-tree', 'Fruit Trees', 'Plum tree', 'plum-tree', 'plant', 'Prunus domestica', 14, 16, 126, 150, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', usdaZone: '4–9', edible: true, pollinatorValue: 'High' }),
  element('design-element-visual-cherry-tree', 'Fruit Trees', 'Cherry tree', 'cherry-tree', 'plant', 'Prunus avium', 18, 20, 134, 158, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', usdaZone: '5–8', edible: true, pollinatorValue: 'High' }),
  element('design-element-visual-fig-tree', 'Fruit Trees', 'Fig tree', 'fig-tree', 'plant', 'Ficus carica', 14, 14, 136, 146, { sunRequirement: 'Full Sun', waterRequirement: 'Low', usdaZone: '7–10', edible: true }),
  element('design-element-visual-lemon-tree', 'Fruit Trees', 'Lemon tree', 'lemon-tree', 'plant', 'Citrus limon', 12, 14, 122, 148, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', usdaZone: '9–11', edible: true, pollinatorValue: 'High' }),
  element('design-element-visual-mandarin-tree', 'Fruit Trees', 'Mandarin tree', 'mandarin-tree', 'plant', 'Citrus reticulata', 12, 14, 126, 148, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', usdaZone: '9–11', edible: true, pollinatorValue: 'High' }),

  element('design-element-local-02', 'Ornamental Trees', 'Small ornamental tree', 'small-ornamental-tree', 'plant', '', 14, 18, 124, 148, { sunRequirement: 'Part Sun', waterRequirement: 'Moderate', pollinatorValue: 'High' }),
  element('design-element-visual-shade-tree', 'Ornamental Trees', 'Shade tree', 'shade-tree', 'plant', '', 35, 45, 154, 164, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate' }),
  element('design-element-local-03', 'Evergreen Trees', 'Evergreen tree', 'evergreen-tree', 'plant', '', 16, 32, 118, 160, { sunRequirement: 'Full Sun', waterRequirement: 'Low' }),
  element('design-element-visual-japanese-maple', 'Ornamental Trees', 'Japanese maple', 'japanese-maple', 'plant', 'Acer palmatum', 18, 18, 138, 150, { sunRequirement: 'Part Sun', waterRequirement: 'Moderate', usdaZone: '5–8' }),
  element('design-element-visual-multi-stem-tree', 'Ornamental Trees', 'Multi-stem tree', 'multi-stem-tree', 'plant', '', 18, 22, 140, 154, { sunRequirement: 'Part Sun', waterRequirement: 'Moderate' }),
  element('design-element-visual-young-tree', 'Ornamental Trees', 'Young newly planted tree', 'young-tree', 'plant', '', 8, 12, 92, 142, { waterRequirement: 'Moderate' }),
  element('design-element-visual-mature-canopy-tree', 'Ornamental Trees', 'Mature canopy tree', 'mature-canopy-tree', 'plant', '', 40, 50, 164, 172, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate' }),

  element('design-element-local-04', 'Shrubs', 'Rounded evergreen shrub', 'rounded-evergreen-shrub', 'plant', '', 4, 4, 112, 88, { sunRequirement: 'Part Sun', waterRequirement: 'Moderate' }),
  element('design-element-visual-flowering-shrub', 'Shrubs', 'Flowering shrub', 'flowering-shrub', 'plant', '', 6, 6, 118, 94, { sunRequirement: 'Part Sun', waterRequirement: 'Moderate', pollinatorValue: 'High' }),
  element('design-element-local-05', 'Shrubs', 'Hydrangea', 'hydrangea', 'plant', 'Hydrangea macrophylla', 5, 5, 122, 100, { sunRequirement: 'Part Shade', waterRequirement: 'Moderate', usdaZone: '5–9', pollinatorValue: 'Medium' }),
  element('design-element-visual-rose-bush', 'Shrubs', 'Rose bush', 'rose-bush', 'plant', 'Rosa', 4, 5, 116, 104, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', pollinatorValue: 'High' }),
  element('design-element-visual-blueberry-bush', 'Shrubs', 'Blueberry bush', 'blueberry-bush', 'plant', 'Vaccinium', 5, 6, 118, 102, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', edible: true, pollinatorValue: 'High' }),
  element('design-element-visual-bramble-shrub', 'Shrubs', 'Raspberry / blackberry shrub', 'bramble-shrub', 'plant', 'Rubus', 5, 6, 120, 108, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', edible: true, pollinatorValue: 'High' }),

  element('design-element-local-10', 'Grasses and Groundcovers', 'Ornamental grass', 'ornamental-grass', 'plant', '', 3, 5, 112, 112, { sunRequirement: 'Full Sun', waterRequirement: 'Low' }),
  element('design-element-visual-lavender', 'Flowers and Perennials', 'Lavender', 'lavender', 'plant', 'Lavandula', 3, 3, 112, 94, { sunRequirement: 'Full Sun', waterRequirement: 'Low', pollinatorValue: 'High' }),
  element('design-element-local-06', 'Flowers and Perennials', 'Coneflower', 'coneflower', 'plant', 'Echinacea purpurea', 2, 3, 108, 106, { sunRequirement: 'Full Sun', waterRequirement: 'Low', pollinatorValue: 'High' }),
  element('design-element-local-15', 'Flowers and Perennials', 'Bee balm', 'bee-balm', 'plant', 'Monarda', 3, 4, 112, 108, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', pollinatorValue: 'High' }),
  element('design-element-local-14', 'Flowers and Perennials', 'Mixed perennial grouping', 'mixed-perennial', 'plant', '', 4, 4, 128, 104, { sunRequirement: 'Part Sun', waterRequirement: 'Moderate', pollinatorValue: 'High' }),
  element('design-element-local-07', 'Flowers and Perennials', 'Annual flower grouping', 'annual-flowers', 'plant', '', 3, 2, 122, 92, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', pollinatorValue: 'High' }),
  element('design-element-local-11', 'Grasses and Groundcovers', 'Groundcover patch', 'groundcover', 'plant', '', 4, 1, 126, 76, { sunRequirement: 'Part Sun', waterRequirement: 'Low' }),
  element('design-element-local-08', 'Herbs and Edibles', 'Herb grouping', 'herb-grouping', 'plant', '', 3, 3, 118, 92, { sunRequirement: 'Full Sun', waterRequirement: 'Low', edible: true, pollinatorValue: 'High' }),
  element('design-element-local-09', 'Herbs and Edibles', 'Vegetable plant', 'vegetable-plant', 'plant', '', 3, 5, 108, 116, { sunRequirement: 'Full Sun', waterRequirement: 'Moderate', edible: true, pollinatorValue: 'Medium' }),
  element('design-element-local-12', 'Flowers and Perennials', 'Climbing vine', 'climbing-vine', 'plant', '', 4, 10, 100, 132, { sunRequirement: 'Part Sun', waterRequirement: 'Moderate', pollinatorValue: 'High' }),

  element('design-element-local-13', 'Containers', 'Small planter', 'small-planter', 'landscape', '', 0, 0, 94, 108),
  element('design-element-local-16', 'Containers', 'Large decorative planter', 'large-planter', 'landscape', '', 0, 0, 116, 138),
  element('design-element-local-17', 'Structures', 'Raised bed', 'raised-bed', 'landscape', '', 0, 0, 150, 96),
  element('design-element-local-18', 'Structures', 'Trellis', 'trellis', 'landscape', '', 0, 0, 108, 144),
  element('design-element-local-19', 'Structures', 'Arbor', 'arbor', 'landscape', '', 0, 0, 130, 154),
  element('design-element-local-21', 'Structures', 'Bench', 'bench', 'landscape', '', 0, 0, 152, 92),
  element('design-element-local-25', 'Structures', 'Birdbath', 'birdbath', 'landscape', '', 0, 0, 84, 122),
  element('design-element-local-24', 'Structures', 'Fountain', 'fountain', 'landscape', '', 0, 0, 116, 130),
  element('design-element-local-26', 'Lighting', 'Path light', 'path-light', 'landscape', '', 0, 0, 64, 112),
  element('design-element-local-20', 'Structures', 'Pergola', 'pergola', 'landscape', '', 0, 0, 164, 138),
  element('design-element-visual-stepping-stone', 'Hardscape', 'Stepping stone', 'stepping-stone', 'landscape', '', 0, 0, 112, 68),
  element('design-element-visual-paver-group', 'Hardscape', 'Paver group', 'paver-group', 'landscape', '', 0, 0, 142, 94),
];

const catalogById = new Map(BUILT_IN_DESIGN_ELEMENTS.map(item => [item.designElementId, item]));
const catalogByKey = new Map(BUILT_IN_DESIGN_ELEMENTS.map(item => [item.assetKey, item]));

const legacyAssetById = {
  'design-element-local-22': 'bench',
  'design-element-local-23': 'bench',
  'design-element-local-27': 'small-planter',
  'design-element-local-28': 'fountain',
  'design-element-local-29': 'pergola',
  'design-element-local-30': 'pergola',
  'design-element-local-31': 'paver-group',
  'design-element-local-32': 'trellis',
  'design-element-local-33': 'trellis',
  'design-element-local-34': 'birdbath',
};

const labelMatchers = [
  [/mandarin|satsuma|tangerine/, 'mandarin-tree'], [/lemon|citrus/, 'lemon-tree'], [/apple|fruit tree|orchard/, 'apple-tree'], [/peach/, 'peach-tree'],
  [/pear/, 'pear-tree'], [/plum/, 'plum-tree'], [/cherry/, 'cherry-tree'], [/\bfig\b/, 'fig-tree'], [/japanese maple/, 'japanese-maple'],
  [/multi.?stem/, 'multi-stem-tree'], [/young|newly planted/, 'young-tree'], [/mature canopy/, 'mature-canopy-tree'], [/shade tree/, 'shade-tree'],
  [/evergreen tree|red cedar|cedar tree|conifer/, 'evergreen-tree'], [/dogwood|ornamental tree/, 'small-ornamental-tree'],
  [/hydrangea/, 'hydrangea'], [/rose/, 'rose-bush'], [/blueberry/, 'blueberry-bush'], [/raspberry|blackberry|bramble/, 'bramble-shrub'],
  [/flowering shrub/, 'flowering-shrub'], [/boxwood|evergreen shrub|rounded shrub|screening plant|shrub/, 'rounded-evergreen-shrub'],
  [/ornamental grass|switchgrass|grass/, 'ornamental-grass'], [/lavender/, 'lavender'], [/coneflower|echinacea/, 'coneflower'],
  [/bee balm|monarda|milkweed/, 'bee-balm'], [/annual|zinnia/, 'annual-flowers'], [/perennial|canna/, 'mixed-perennial'],
  [/groundcover|creeping thyme/, 'groundcover'], [/herb|rosemary/, 'herb-grouping'], [/vegetable|tomato/, 'vegetable-plant'], [/vine|clematis/, 'climbing-vine'],
  [/raised bed/, 'raised-bed'], [/trellis|fence|privacy screen/, 'trellis'], [/arbor/, 'arbor'], [/pergola|outdoor kitchen|bbq/, 'pergola'],
  [/bench|table|chair/, 'bench'], [/birdbath|sculpture/, 'birdbath'], [/fountain|fire feature/, 'fountain'], [/path light|lighting/, 'path-light'],
  [/stepping stone/, 'stepping-stone'], [/paver|pool/, 'paver-group'], [/large|statement|decorative pot/, 'large-planter'], [/planter|container/, 'small-planter'],
];

export function resolveDesignVisualKey(input = {}) {
  if (input.assetKey && catalogByKey.has(input.assetKey)) return input.assetKey;
  if (input.libraryElementId && catalogById.has(input.libraryElementId)) return catalogById.get(input.libraryElementId).assetKey;
  if (input.libraryElementId && legacyAssetById[input.libraryElementId]) return legacyAssetById[input.libraryElementId];
  const text = `${input.label || ''} ${input.name || ''} ${input.commonName || ''} ${input.botanicalName || ''}`.toLowerCase();
  const matched = labelMatchers.find(([pattern]) => pattern.test(text));
  if (matched) return matched[1];
  const symbols = {
    'fruit-tree': 'apple-tree', tree: 'small-ornamental-tree', canopy: 'mature-canopy-tree', shrub: 'rounded-evergreen-shrub',
    'perennial-cluster': 'mixed-perennial', groundcover: 'groundcover', vine: 'climbing-vine', container: 'small-planter',
    'raised-bed': 'raised-bed', herb: 'herb-grouping', vegetable: 'vegetable-plant', custom: 'small-planter',
  };
  return symbols[input.symbol] || (input.objectType === 'plant' || input.elementKind === 'plant' ? 'mixed-perennial' : 'small-planter');
}

export function getDesignVisualElement(assetKey) {
  return catalogByKey.get(assetKey) || catalogByKey.get('mixed-perennial');
}

export function normalizeDesignElement(item = {}) {
  const designElementId = item.designElementId || item.id;
  const builtIn = catalogById.get(designElementId);
  if (builtIn) return {
    ...builtIn,
    ...item,
    id: designElementId,
    designElementId,
    category: builtIn.category,
    imageAsset: builtIn.imageAsset,
    assetKey: builtIn.assetKey,
    elementKind: builtIn.elementKind,
    viewStyles: builtIn.viewStyles,
    defaultViewStyle: builtIn.defaultViewStyle,
    defaultWidth: builtIn.defaultWidth,
    defaultHeight: builtIn.defaultHeight,
    favorite: Boolean(item.favorite),
    lastUsedAt: item.lastUsedAt || '',
    useCount: Number(item.useCount || 0),
    archived: Boolean(item.archived),
  };

  const usesOldSymbol = String(item.imageAsset || '').startsWith('local-symbol:') || legacyAssetById[designElementId];
  if (!usesOldSymbol && !item.assetKey) return { ...item, id: designElementId, designElementId, favorite: Boolean(item.favorite), archived: Boolean(item.archived) };
  const assetKey = resolveDesignVisualKey({ ...item, libraryElementId: designElementId });
  const visual = getDesignVisualElement(assetKey);
  return {
    ...item,
    id: designElementId,
    designElementId,
    category: visual.category,
    imageAsset: `local-svg:design-elements#${assetKey}`,
    assetKey,
    elementKind: visual.elementKind,
    viewStyles: visual.viewStyles,
    defaultViewStyle: item.defaultViewStyle || 'front',
    defaultWidth: item.defaultWidth || visual.defaultWidth,
    defaultHeight: item.defaultHeight || visual.defaultHeight,
    favorite: Boolean(item.favorite),
    lastUsedAt: item.lastUsedAt || '',
    useCount: Number(item.useCount || 0),
    archived: Boolean(item.archived),
  };
}
