const fs = require('fs/promises');
const path = require('path');

const SETTINGS_URL = 'https://images.nbcolympics.com/static/json/medals-widget-settings.json';
const API_KEY = 'daaacddd-1513-46a3-8b79-ac3584258f5b';
const MEDALS_ENDPOINT = 'https://sdf.nbcolympics.com/v1/widget/medals/country';
const POOL_PATH = path.join(__dirname, 'pool.json');

const COUNTRY_ALIASES = new Map([
  ['united states of america', 'usa'],
  ['united states', 'usa'],
  ['great britain', 'great britain'],
  ['republic of korea', 'south korea'],
  ['korea republic of', 'south korea'],
  ['korea', 'south korea'],
  ['democratic peoples republic of korea', 'north korea'],
  ['united arab emirates', 'uae'],
  ['czech republic', 'czechia'],
  ['hong kong china', 'hong kong'],
  ['bosnia and herzegovina', 'bosnia and herzegovina'],
  ['trinidad and tobago', 'trinidad and tobago']
]);

const normalizeCountry = (value) => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return COUNTRY_ALIASES.get(normalized) ?? normalized;
};

const parseNumber = (value) => {
  const numeric = String(value).replace(/[^0-9]/g, '');
  return numeric ? Number(numeric) : 0;
};

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchMedals() {
  const settings = await fetchJson(SETTINGS_URL);
  const competitionCode =
    settings?.competition_code ||
    settings?.competitionCode ||
    settings?.competition_code?.code;

  if (!competitionCode) {
    throw new Error('Unable to determine competition code from settings.');
  }

  const medalsUrl = `${MEDALS_ENDPOINT}?competitionCode=${encodeURIComponent(competitionCode)}`;
  const medals = await fetchJson(medalsUrl, { 'x-olyapiauth': API_KEY });

  if (!Array.isArray(medals)) {
    throw new Error('Medals API response was not an array.');
  }

  return medals;
}

async function updatePool() {
  const raw = await fs.readFile(POOL_PATH, 'utf-8');
  const pool = JSON.parse(raw);
  const teams = Array.isArray(pool) ? pool : pool.teams;

  if (!Array.isArray(teams)) {
    throw new Error('Pool data must be an array or include a teams array.');
  }

  const medalRows = await fetchMedals();
  if (!medalRows.length) {
    throw new Error('No medal rows were found on the medals page.');
  }

  const medalMap = new Map();
  for (const row of medalRows) {
    if (row.countryName) {
      medalMap.set(normalizeCountry(row.countryName), row);
    }
    if (row.countryCode) {
      medalMap.set(normalizeCountry(row.countryCode), row);
    }
  }

  const missingCountries = new Set();

  const updatedTeams = teams.map((entry) => {
    const key = normalizeCountry(entry.country);
    const medalRow = medalMap.get(key);

    if (!medalRow) {
      missingCountries.add(entry.country);
      return {
        ...entry,
        gold: 0,
        silver: 0,
        bronze: 0
      };
    }

    return {
      ...entry,
      gold: parseNumber(medalRow.gold ?? medalRow.goldTotal),
      silver: parseNumber(medalRow.silver ?? medalRow.silverTotal),
      bronze: parseNumber(medalRow.bronze ?? medalRow.bronzeTotal)
    };
  });

  const updatedPool = Array.isArray(pool)
    ? updatedTeams
    : {
        ...pool,
        updatedAt: new Date().toISOString(),
        teams: updatedTeams
      };

  await fs.writeFile(POOL_PATH, `${JSON.stringify(updatedPool, null, 2)}\n`);

  const poolScriptPath = path.join(__dirname, 'pool.js');
  const poolScript = `window.POOL_DATA = ${JSON.stringify(updatedPool, null, 2)};\n`;
  await fs.writeFile(poolScriptPath, poolScript);

  if (missingCountries.size) {
    console.warn('Countries not found in medal table:', Array.from(missingCountries).join(', '));
  }

  console.log(`Updated medal totals for ${updatedTeams.length} entries.`);
}

updatePool().catch((error) => {
  console.error('Medal update failed:', error);
  process.exit(1);
});
