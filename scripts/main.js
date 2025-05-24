// --- Global Data Storage (no longer dependent on Firebase) ---
let armiesData = [];
let planetsData = [];
let factionsData = [];
let campaignVersion = "0.0.0"; // Placeholder, not actively used for refresh without Firebase


// --- Fetch Data Functions ---
async function fetchArmiesData() {
    try {
        const response = await fetch('data/armies.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        armiesData = await response.json();
        console.log("Armies data loaded:", armiesData);
    } catch (error) {
        console.error("Error fetching armies data:", error);
        document.getElementById('army-list-overview').innerHTML = '<p style="color: var(--warning-red);">Failed to load army data. Please check data/armies.json.</p>';
    }
}

async function fetchPlanetsData() {
    try {
        const response = await fetch('data/planets.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        planetsData = await response.json();
        console.log("Planets data loaded:", planetsData);
    } catch (error) {
        console.error("Error fetching planets data:", error);
        document.getElementById('planets-container').innerHTML = '<p style="color: var(--warning-red);">Failed to load planet data. Please check data/planets.json.</p>';
    }
}

async function fetchFactionsData() {
    try {
        const response = await fetch('data/factions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        factionsData = await response.json();
        console.log("Factions data loaded:", factionsData);
    } catch (error) {
        console.error("Error fetching factions data:", error);
        // Fallback or display error where factions dropdown would be
    }
}

async function fetchInitialData() {
    await Promise.all([
        fetchArmiesData(),
        fetchPlanetsData(),
        fetchFactionsData()
    ]);
    // All data is loaded, now render the page
    renderFactionBarChart();
    renderArmyOverview();
    renderPlanets();
    populateFactionFilter();
}


// --- Rendering Functions ---

// Function to render the Faction Progress Bar Chart
function renderFactionBarChart() {
    const ctx = document.getElementById('factionBarChart').getContext('2d');
    if (window.factionBarChartInstance) {
        window.factionBarChartInstance.destroy();
    }

    const factionVictories = {};
    const factionBattles = {};

    factionsData.forEach(faction => {
        factionVictories[faction.id] = 0;
        factionBattles[faction.id] = 0;
    });

    armiesData.forEach(army => {
        if (factionVictories.hasOwnProperty(army.faction)) {
            factionVictories[army.faction] += army.victories;
            factionBattles[army.faction] += army.battles_played;
        }
    });

    const labels = factionsData.map(f => f.name);
    const victoryData = labels.map(label => {
        const faction = factionsData.find(f => f.name === label);
        return factionVictories[faction.id];
    });
    const totalBattlesData = labels.map(label => {
        const faction = factionsData.find(f => f.name === label);
        return factionBattles[faction.id];
    });

    window.factionBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Victories',
                    data: victoryData,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total Battles',
                    data: totalBattlesData,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Battles'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Factions'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function renderArmyOverview(filterFactionId = 'all') {
    const armyListContainer = document.getElementById('army-list-overview');
    armyListContainer.innerHTML = ''; // Clear previous content

    let filteredArmies = armiesData;
    if (filterFactionId !== 'all') {
        filteredArmies = armiesData.filter(army => String(army.faction) === String(filterFactionId)); // Robust comparison
    }

    if (filteredArmies.length === 0) {
        armyListContainer.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No armies found for the selected filter.</p>';
        return;
    }

    filteredArmies.forEach(army => {
        // Corrected line for factionName
        const factionName = factionsData.find(f => String(f.id) === String(army.faction))?.name || 'Unknown Faction';
        const card = document.createElement('div');
        card.className = 'army-card';
        card.innerHTML = `
            <h3>${army.name}</h3>
            <p><strong>Player:</strong> ${army.player}</p>
            <p><strong>Faction:</strong> ${factionName}</p>
            <p><strong>CP:</strong> ${army.crusade_points}</p>
            <p><strong>Battles:</strong> ${army.battles_played}</p>
            <p><strong>Victories:</strong> ${army.victories}</p>
            <button class="button view-details-btn" data-army-id="${army.id}">View Details</button>
        `;
        armyListContainer.appendChild(card);
    });

    // Add event listeners for "View Details" buttons
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const armyId = event.target.dataset.armyId;
            showArmyDetailPage(armyId);
        });
    });
}

function populateFactionFilter() {
    const factionFilterSelect = document.getElementById('faction-filter');
    factionFilterSelect.innerHTML = '<option value="all">All Factions</option>'; // Always start with "All Factions"

    factionsData.forEach(faction => {
        const option = document.createElement('option');
        option.value = faction.id;
        option.textContent = faction.name;
        factionFilterSelect.appendChild(option);
    });

    factionFilterSelect.addEventListener('change', (event) => {
        renderArmyOverview(event.target.value);
    });
}

function showArmyDetailPage(armyId) {
    const army = armiesData.find(a => a.id === armyId);
    if (!army) {
        console.error("Army not found:", armyId);
        return;
    }

    // Corrected line for factionName
    const factionName = factionsData.find(f => String(f.id) === String(army.faction))?.name || 'Unknown Faction';

    const armyDetailContent = document.getElementById('army-detail-content');
    armyDetailContent.innerHTML = `
        <h2>${army.name} <span class="player-name">(${army.player})</span></h2>
        <div class="army-details-grid">
            <div class="detail-item"><strong>Faction:</strong> ${factionName}</div>
            <div class="detail-item"><strong>Crusade Points:</strong> ${army.crusade_points}</div>
            <div class="detail-item"><strong>Battles Played:</strong> ${army.battles_played}</div>
            <div class="detail-item"><strong>Victories:</strong> ${army.victories}</div>
            <div class="detail-item full-width"><strong>Description:</strong> ${army.description || 'N/A'}</div>
            <div class="detail-item full-width"><strong>Notes:</strong> ${army.notes || 'No specific notes.'}</div>
        </div>
    `;

    document.getElementById('army-list-overview').classList.add('hidden');
    document.getElementById('army-detail-page-container').classList.remove('hidden');
    document.getElementById('faction-progress-section').classList.add('hidden');
    document.getElementById('planetary-control-section').classList.add('hidden');
    document.getElementById('resources-section').classList.add('hidden');
}

// Function to hide detail page and show overview
document.getElementById('back-to-roster-btn').addEventListener('click', () => {
    document.getElementById('army-list-overview').classList.remove('hidden');
    document.getElementById('army-detail-page-container').classList.add('hidden');
    document.getElementById('faction-progress-section').classList.remove('hidden');
    document.getElementById('planetary-control-section').classList.remove('hidden');
    document.getElementById('resources-section').classList.remove('hidden');
});

function renderPlanets() {
    const planetsContainer = document.getElementById('planets-container');
    planetsContainer.innerHTML = ''; // Clear existing content

    if (planetsData.length === 0) {
        planetsContainer.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No planet data available.</p>';
        return;
    }

    planetsData.forEach(planet => {
        // Corrected line for controllingFactionName
        const controllingFactionName = factionsData.find(f => String(f.id) === String(planet.controlling_faction))?.name || 'Unclaimed';
        const card = document.createElement('div');
        card.className = 'planet-card';
        card.innerHTML = `
            <img src="${planet.image}" alt="${planet.name}" class="planet-image">
            <h3 class="planet-name">${planet.name}</h3>
            <p class="planet-control">Controlled by: <span class="faction-name">${controllingFactionName}</span></p>
            <p class="planet-status">${planet.status}</p>
            <div class="planet-description">
                <p>${planet.description}</p>
            </div>
        `;
        planetsContainer.appendChild(card);
    });
}


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', fetchInitialData);
