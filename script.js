// Team data for the Olympic pool (loaded from data/pool.json)
let teams = [];

async function loadTeams() {
    if (window.POOL_DATA && Array.isArray(window.POOL_DATA.teams)) {
        teams = window.POOL_DATA.teams;
        return;
    }

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
    } catch (error) {
        console.error('Unable to load pool data.', error);
        teams = [];
    }
}

// Point values for medals
const POINTS = {
    gold: 4,
    silver: 2,
    bronze: 1
};

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
        if (window.POOL_DATA?.updatedAt) {
            const updatedDate = new Date(window.POOL_DATA.updatedAt);
            const formatted = Number.isNaN(updatedDate.getTime())
                ? window.POOL_DATA.updatedAt
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
        const sortedCountries = [...team.countries].sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }

            return b.draftValue - a.draftValue;
        });
        const countriesRows = sortedCountries.map(country => {
            const countryRatio = country.draftValue > 0 ? (country.points / country.draftValue) : 0;
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
                        <th>Country</th>
                        <th>Val</th>
                        <th>🥇</th>
                        <th>🥈</th>
                        <th>🥉</th>
                        <th>Pts</th>
                        <th>M/V</th>
                    </tr>
                </thead>
                <tbody>
                    ${countriesRows}
                </tbody>
            </table>
        `;

        grid.appendChild(column);
    });
}

// Initialize the standings when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadTeams();
    populateStandings();
});
