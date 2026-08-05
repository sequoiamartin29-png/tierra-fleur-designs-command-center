import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPECIALTY_NURSERY_SEEDS,
  availabilityForPlant,
  findPlantSupplierMatches,
  normalizePlantSearch,
} from './plantSourcing.js';

test('normalizes plant searches without changing the saved query', () => {
  assert.equal(normalizePlantSearch('  Passiflóra   edulis '), 'passiflora edulis');
});

test('matches passion fruit, botanical names, and maypop synonyms', () => {
  for (const query of ['Passion Fruit', 'Passiflora edulis', 'Maypop']) {
    const names = findPlantSupplierMatches(SPECIALTY_NURSERY_SEEDS, query).map(item => item.nursery.name);
    assert.ok(names.includes('One Green World'), `${query} should match One Green World`);
  }
});

test('keeps nursery-name and location lookup in the expanded directory search', () => {
  const matches = findPlantSupplierMatches(SPECIALTY_NURSERY_SEEDS, 'One Green World');
  assert.equal(matches[0].nursery.name, 'One Green World');
  assert.equal(matches[0].matchType, 'Nursery match');
  assert.ok(findPlantSupplierMatches(SPECIALTY_NURSERY_SEEDS, 'Portland Oregon').some(result => result.nursery.name === 'One Green World'));
});

test('uses likely specialty growers as a non-inventory fallback', () => {
  const matches = findPlantSupplierMatches(SPECIALTY_NURSERY_SEEDS, 'Codex impossible moon pear');
  assert.ok(matches.length > 0);
  assert.ok(matches.every(item => item.matchType === 'Likely specialty grower'));
  assert.ok(matches.every(item => availabilityForPlant(item.nursery, 'Codex impossible moon pear', item).status === 'Contact nursery'));
});
