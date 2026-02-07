// Team data for the Olympic pool
const teams = [
    {
        member: "Chris",
        country: "Italy",
        draftValue: 19,
        gold: 0,
        silver: 1,
        bronze: 1
    },
    {
        member: "Dad",
        country: "Norway",
        draftValue: 54,
        gold: 0,
        silver: 0,
        bronze: 0
    },
    {
        member: "Alex",
        country: "France",
        draftValue: 20,
        gold: 0,
        silver: 0,
        bronze: 0
    },
    {
        member: "Mike",
        country: "Canada",
        draftValue: 34,
        gold: 0,
        silver: 0,
        bronze: 0
    }
];

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
    const tbody = document.getElementById('standings-body');
    
    // Calculate points for each team and sort by total points (descending)
    const teamsWithPoints = teams.map(team => ({
        ...team,
        totalPoints: calculatePoints(team)
    })).sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Add rows for each team
    teamsWithPoints.forEach((team, index) => {
        const row = document.createElement('tr');
        const rank = index + 1;
        
        // Add rank class for styling
        if (rank <= 3) {
            row.classList.add(`rank-${rank}`);
        }
        
        row.innerHTML = `
            <td>${rank}</td>
            <td>${team.member}</td>
            <td>${team.country}</td>
            <td>${team.draftValue}</td>
            <td>${team.gold}</td>
            <td>${team.silver}</td>
            <td>${team.bronze}</td>
            <td>${team.totalPoints}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Initialize the standings when the page loads
document.addEventListener('DOMContentLoaded', populateStandings);
