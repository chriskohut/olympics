// Team data for the Olympic pool (loaded from data/pool.json)
let teams = [];
let lastUpdated = null;

async function loadTeams() {
    if (window.POOL_DATA && Array.isArray(window.POOL_DATA.teams)) {
        teams = window.POOL_DATA.teams;
        lastUpdated = window.POOL_DATA.updatedAt || null;
        return;
    }

    await refreshTeams();
}

async function refreshTeams() {
    try {
        const response = await fetch('pool.json', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Failed to load pool data: ${response.status}`);
        }

        const data = await response.json();
        const loadedTeams = Array.isArray(data) ? data : data.teams;

        if (!Array.isArray(loadedTeams)) {
            throw new Error('Pool data is missing the teams array.');
        }

        teams = loadedTeams;
        lastUpdated = data.updatedAt || null;
        window.POOL_DATA = { updatedAt: lastUpdated, teams };
    } catch (error) {
        console.error('Unable to refresh pool data.', error);
    }
}

// Point values for medals
const POINTS = {
    gold: 4,
    silver: 2,
    bronze: 1
};

const sortState = new Map();

/**
 * Calculate total points for a team
 * @param {Object} team - Team object with medal counts
 * @returns {number} Total points
 */
function calculatePoints(team) {
    return (team.gold * POINTS.gold) + 
           (team.silver * POINTS.silver) + 
           (team.bronze * POINTS.bronze);
}

/**
 * Populate the standings table with team data
 */
function populateStandings() {
    const grid = document.getElementById('teams-grid');
    const lastUpdatedEl = document.getElementById('last-updated');

    const truncateCountry = (name) => {
        if (!name) {
            return '';
        }

        return name.length > 15 ? name.slice(0, 15) : name;
    };

    const getCountryRatio = (country) => {
        return country.draftValue > 0 ? (country.points / country.draftValue) : 0;
    };

    const compareCountries = (a, b, config) => {
        const key = config?.key || 'points';
        const dir = config?.dir === 'asc' ? 1 : -1;

        const tieBreak = () => a.country.localeCompare(b.country);

        if (key === 'country') {
            const countryCompare = a.country.localeCompare(b.country) * dir;
            return countryCompare || (b.points - a.points) || (b.draftValue - a.draftValue);
        }

        if (key === 'value') {
            const diff = (a.draftValue - b.draftValue) * dir;
            return diff || tieBreak();
        }

        if (key === 'gold' || key === 'silver' || key === 'bronze' || key === 'points') {
            const diff = (a[key] - b[key]) * dir;
            return diff || tieBreak();
        }

        if (key === 'ratio') {
            const diff = (getCountryRatio(a) - getCountryRatio(b)) * dir;
            return diff || tieBreak();
        }

        return 0;
    };

    // Group countries by team member and aggregate medal counts
    const groupedTeams = teams.reduce((acc, team) => {
        if (!acc[team.member]) {
            acc[team.member] = {
                member: team.member,
                countries: [],
                draftValue: 0,
                gold: 0,
                silver: 0,
                bronze: 0
            };
        }

        acc[team.member].countries.push({
            country: team.country,
            draftValue: team.draftValue,
            gold: team.gold,
            silver: team.silver,
            bronze: team.bronze,
            points: calculatePoints(team)
        });
        acc[team.member].draftValue += team.draftValue;
        acc[team.member].gold += team.gold;
        acc[team.member].silver += team.silver;
        acc[team.member].bronze += team.bronze;

        return acc;
    }, {});

    // Calculate points for each member and sort by total points (descending)
    const teamsWithPoints = Object.values(groupedTeams).map(team => ({
        ...team,
        totalPoints: calculatePoints(team)
    })).sort((a, b) => b.totalPoints - a.totalPoints);

    // Clear existing columns
    grid.innerHTML = '';

    if (lastUpdatedEl) {
        if (lastUpdated) {
            const updatedDate = new Date(lastUpdated);
            const formatted = Number.isNaN(updatedDate.getTime())
                ? lastUpdated
                : updatedDate.toLocaleString();
            lastUpdatedEl.textContent = `Last updated: ${formatted}`;
        } else {
            lastUpdatedEl.textContent = '';
        }
    }

    // Add a column for each team
    teamsWithPoints.forEach((team) => {
        const column = document.createElement('div');
        column.className = 'team-column';

        const totalMedals = team.gold + team.silver + team.bronze;
        const sortConfig = sortState.get(team.member) || { key: 'points', dir: 'desc' };
        const sortedCountries = [...team.countries].sort((a, b) => compareCountries(a, b, sortConfig));
        const countriesRows = sortedCountries.map(country => {
            const countryRatio = getCountryRatio(country);
            return `
            <tr>
                <td class="country-cell" title="${country.country}">${truncateCountry(country.country)}</td>
                <td>${country.draftValue}</td>
                <td>${country.gold}</td>
                <td>${country.silver}</td>
                <td>${country.bronze}</td>
                <td>${country.points}</td>
                <td>${countryRatio.toFixed(2)}</td>
            </tr>
        `;
        }).join('');

        column.innerHTML = `
            <div class="team-header">
                <div class="team-name">${team.member}</div>
                <div class="team-totals">
                    <span>Total Medals: <strong>${totalMedals}</strong></span>
                    <span>Total Points: <strong>${team.totalPoints}</strong></span>
                </div>
                <div class="team-medals">
                    <span>🥇 ${team.gold}</span>
                    <span>🥈 ${team.silver}</span>
                    <span>🥉 ${team.bronze}</span>
                </div>
            </div>
            <table class="team-table">
                <thead>
                    <tr>
                        <th class="sortable" data-sort-key="country" data-team="${team.member}">Country</th>
                        <th class="sortable" data-sort-key="value" data-team="${team.member}">Val</th>
                        <th class="sortable" data-sort-key="gold" data-team="${team.member}">🥇</th>
                        <th class="sortable" data-sort-key="silver" data-team="${team.member}">🥈</th>
                        <th class="sortable" data-sort-key="bronze" data-team="${team.member}">🥉</th>
                        <th class="sortable" data-sort-key="points" data-team="${team.member}">Pts</th>
                        <th class="sortable" data-sort-key="ratio" data-team="${team.member}">M/V</th>
                    </tr>
                </thead>
                <tbody>
                    ${countriesRows}
                </tbody>
            </table>
        `;

        grid.appendChild(column);

        column.querySelectorAll('th.sortable').forEach((header) => {
            header.addEventListener('click', () => {
                const key = header.dataset.sortKey;
                const member = header.dataset.team;
                if (!key || !member) {
                    return;
                }

                const current = sortState.get(member);
                let dir = key === 'country' ? 'asc' : 'desc';
                if (current && current.key === key) {
                    dir = current.dir === 'desc' ? 'asc' : 'desc';
                }

                sortState.set(member, { key, dir });
                populateStandings();
            });
        });
    });
}

// Initialize the standings when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadTeams();
    populateStandings();

    setInterval(async () => {
        await refreshTeams();
        populateStandings();
    }, 5 * 60 * 1000);
});
