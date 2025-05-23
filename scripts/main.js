document.addEventListener('DOMContentLoaded', () => {
    // --- Global Data Variables (Accessible to all functions below) ---
    let factionsData = [];
    let armiesData = [];
    let planetsData = [];

    // --- DOM Elements for Sections ---
    const passwordOverlay = document.getElementById('password-overlay');
    const mainContent = document.getElementById('main-content');
    const factionProgressSection = document.getElementById('faction-progress-section');
    const armyRosterSection = document.getElementById('army-roster-section');
    const planetaryControlSection = document.getElementById('planetary-control-section');
    const resourcesSection = document.getElementById('resources-section');

    const armyListOverview = document.getElementById('army-list-overview'); // This will hold the army cards
    const armyDetailPageContainer = document.getElementById('army-detail-page-container');
    const armyDetailContent = document.getElementById('army-detail-content');
    const backToRosterBtn = document.getElementById('back-to-roster-btn');

    // --- Faction Filter Elements ---
    const factionFilterDropdown = document.getElementById('faction-filter');


    // --- Password Protection (TEMPORARILY BYPASSED FOR DEVELOPMENT) ---
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const CORRECT_PASSWORD = "crusade";

    passwordOverlay.classList.add('hidden');
    mainContent.style.display = 'block';
    initializeCrusadeTracker();


    // --- Helper for generating consistent colors for armies ---
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#C9CBCF', '#6A8B82', '#E6B0AA', '#D2B4DE', '#A9CCE3', '#FADBD8'
    ];
    let colorIndex = 0;
    function getNextColor() {
        const color = colors[colorIndex % colors.length];
        colorIndex++;
        return color;
    }

    // --- Router Function ---
    function router() {
        const hash = window.location.hash;
        console.log('Current hash:', hash);

        // Hide all main sections by default
        factionProgressSection.classList.add('hidden');
        armyRosterSection.classList.add('hidden');
        planetaryControlSection.classList.add('hidden');
        resourcesSection.classList.add('hidden');

        // Reset army detail view state
        armyListOverview.classList.remove('hidden');
        armyDetailPageContainer.classList.add('hidden');
        armyDetailContent.innerHTML = ''; // Clear previous detail content

        if (hash.startsWith('#army-')) {
            const armyId = hash.substring(6); // Remove '#army-' prefix
            renderArmyDetailPage(armyId);
            armyRosterSection.classList.remove('hidden'); // Show the army section
        } else {
            // Default view: show all main sections
            factionProgressSection.classList.remove('hidden');
            armyRosterSection.classList.remove('hidden');
            planetaryControlSection.classList.remove('hidden');
            resourcesSection.classList.remove('hidden');
            // FIX: Call filterArmies to ensure initial display respects filter (default to 'all')
            filterArmies(factionFilterDropdown.value);
        }
    }

    // --- Auto-Refresh Logic ---
    let currentAppVersion = '1.0.0'; // Default initial version (matches version.json)
    const VERSION_CHECK_INTERVAL = 5000; // Check every 5 seconds (for development)

    async function checkAppVersion() {
        try {
            const response = await fetch('data/version.json');
            const data = await response.json();
            const latestVersion = data.version;

            if (latestVersion !== currentAppVersion) {
                console.log(`New version detected! Old: ${currentAppVersion}, New: ${latestVersion}. Reloading page...`);
                alert("A new version of the Crusade Tracker is available! The page will now refresh.");
                window.location.reload(true); // Force a hard reload from the server
            }
        } catch (error) {
            console.error('Error checking app version:', error);
        }
    }

    // --- Main Application Initialization ---
    async function initializeCrusadeTracker() {
        console.log("Crusade Tracker Initialized!");

        try {
            const [factionsRes, armiesRes, planetsRes, versionRes] = await Promise.all([
                fetch('data/factions.json'),
                fetch('data/armies.json'),
                fetch('data/planets.json'),
                fetch('data/version.json')
            ]);

            factionsData = await factionsRes.json();
            armiesData = await armiesRes.json();
            planetsData = await planetsRes.json();
            currentAppVersion = (await versionRes.json()).version;

            console.log('Data loaded:', { factionsData, armiesData, planetsData, currentAppVersion });

            // Populate faction filter dropdown
            populateFactionFilter(factionsData);

            // Initial render of components
            renderFactionChart(factionsData, armiesData);
            renderPlanets(planetsData);

            // Set up hash-based routing
            window.addEventListener('hashchange', router);
            router(); // Call router once on load to handle initial URL

            // Set up filter event listener
            factionFilterDropdown.addEventListener('change', (event) => {
                filterArmies(event.target.value);
            });

            // Start periodic version check
            setInterval(checkAppVersion, VERSION_CHECK_INTERVAL);

        } catch (error) {
            console.error('Error loading data:', error);
            mainContent.innerHTML = `<p style="color: red; text-align: center;">
                                        Failed to load campaign data. Please check the data files and try again.
                                    </p>`;
        }
    }

    // --- Faction Filter Logic ---
    function populateFactionFilter(factions) {
        // Clear existing options except "All Factions"
        factionFilterDropdown.innerHTML = '<option value="all">All Factions</option>';
        factions.forEach(faction => {
            const option = document.createElement('option');
            option.value = faction.name;
            option.textContent = faction.name;
            factionFilterDropdown.appendChild(option);
        });
    }

    function filterArmies(selectedFaction) {
        let filtered = armiesData;
        if (selectedFaction !== 'all') {
            filtered = armiesData.filter(army => army.faction === selectedFaction);
        }
        renderArmyListOverview(filtered);
    }


    // --- Faction Progress Stacked Bar Graph ---
    function renderFactionChart(factions, armies) {
        const ctx = document.getElementById('factionBarChart').getContext('2d');

        const factionLabels = factions.map(f => f.name);
        const factionIndexMap = new Map(factionLabels.map((name, index) => [name, index]));

        const datasets = [];
        const armyColors = new Map();

        armies.forEach(army => {
            if (!armyColors.has(army.id)) {
                armyColors.set(army.id, getNextColor());
            }
            const armyColor = armyColors.get(army.id);

            const data = new Array(factionLabels.length).fill(0);
            const factionIndex = factionIndexMap.get(army.faction);
            if (factionIndex !== undefined) {
                data[factionIndex] = army.crusade_points;
            }

            datasets.push({
                label: army.name,
                data: data,
                backgroundColor: armyColor,
                borderColor: armyColor,
                borderWidth: 1
            });
        });

        if (Chart.getChart(ctx)) {
            Chart.getChart(ctx).destroy();
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: factionLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            color: '#e0e0e0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        max: 400,
                        ticks: {
                            color: '#e0e0e0'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e0e0e0',
                            boxWidth: 20,
                            padding: 10
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                if (context.length > 0) {
                                    return context[0].label;
                                }
                                return '';
                            },
                            label: function(context) {
                                const hoveredFaction = context.label;
                                const armyName = context.dataset.label;
                                const army = armies.find(a => a.name === armyName && a.faction === hoveredFaction);
                                if (army) {
                                    return `${army.name}: ${army.crusade_points} Crusade Points`;
                                }
                                return '';
                            },
                            filter: function(tooltipItem) {
                                const hoveredFaction = tooltipItem.label;
                                const armyName = tooltipItem.dataset.label;
                                const army = armies.find(a => a.name === armyName && a.faction === hoveredFaction);
                                return !!army;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Army List Overview (main page) ---
    // Now accepts a list of armies to render (can be filtered)
    function renderArmyListOverview(armiesToRender) {
        armyListOverview.innerHTML = ''; // Clear previous content
        armyListOverview.classList.remove('hidden'); // Ensure visible
        armyDetailPageContainer.classList.add('hidden'); // Ensure detail page is hidden

        if (armiesToRender.length === 0) {
            armyListOverview.innerHTML = '<p style="text-align: center; color: #b0b0b0;">No armies found for this filter.</p>';
            return;
        }

        armiesToRender.forEach(army => {
            const armyCard = document.createElement('div');
            armyCard.classList.add('army-card');
            armyCard.innerHTML = `
                <div class="army-card-header">
                    <h3>${army.name}</h3>
                </div>
                <p><strong>Faction:</strong> ${army.faction}</p>
                <p>${army.description.substring(0, 100)}...</p>
                <button class="view-button" data-army-id="${army.id}">View Details</button>
            `;
            armyCard.querySelector('.view-button').addEventListener('click', (e) => {
                const armyId = e.target.dataset.armyId;
                window.location.hash = `#army-${armyId}`; // Change URL hash to trigger router
            });
            armyListOverview.appendChild(armyCard);
        });
    }

    // --- Army Detail Page ---
    function renderArmyDetailPage(armyId) {
        const army = armiesData.find(a => a.id === armyId);
        if (!army) {
            armyDetailContent.innerHTML = `<p style="color: red;">Army not found!</p>`;
            return;
        }

        armyListOverview.classList.add('hidden'); // Hide the overview list
        armyDetailPageContainer.classList.remove('hidden'); // Show the detail container

        armyDetailContent.innerHTML = `
            <h3>${army.name}</h3>
            <p><strong>Player:</strong> ${army.player}</p>
            <p><strong>Faction:</strong> ${army.faction}</p>
            <p><strong>Description:</strong> ${army.description}</p>
            <p><strong>Crusade Points:</strong> ${army.crusade_points}</p>
            <p><strong>Battles Played:</strong> ${army.battles_played}</p>
            <p><strong>Victories:</strong> ${army.victories}</p>
            <p><strong>Notes:</strong> ${army.notes || 'N/A'}</p>
        `;

        document.getElementById('back-to-roster-btn').classList.remove('hidden');
    }


    // --- Planetary Control (Planets) ---
    const planetsContainer = document.getElementById('planets-container');
    let currentActivePlanetId = null; // To track which planet is in detail view

    function renderPlanets(planets) {
        planetsContainer.innerHTML = ''; // Clear previous content
        planetsContainer.classList.remove('single-view'); // Ensure not in single view initially

        // Create and append the back button at the top of the container
        const backButton = document.createElement('button');
        backButton.id = 'back-to-planets-btn';
        backButton.classList.add('button', 'back-button', 'hidden'); // Hidden by default
        backButton.textContent = 'Back to All Planets';
        backButton.addEventListener('click', showAllPlanets);
        planetsContainer.appendChild(backButton);

        planets.forEach(planet => {
            const planetCard = document.createElement('div');
            planetCard.classList.add('planet-card');
            planetCard.dataset.planetId = planet.id; // Store planet ID for click handling

            // --- Simplified Structure for Planet Visuals (no ships) ---
            const planetImageContainer = document.createElement('div');
            planetImageContainer.classList.add('planet-image-container');

            const planetImage = document.createElement('img');
            planetImage.classList.add('planet-image');
            planetImage.src = planet.image || `images/planet1.png`; // Placeholder if image not found
            planetImage.alt = planet.name;

            // Percentage Overlay (still based on factions for visual consistency of the planet itself)
            const totalFactionPercentage = planet.army_control.reduce((sum, ac) => sum + ac.percentage, 0);
            let currentHeight = 0;
            const factionAggregatedControl = {};
            planet.army_control.forEach(ac => {
                const army = armiesData.find(a => a.id === ac.army_id);
                if (army) {
                    factionAggregatedControl[army.faction] = (factionAggregatedControl[army.faction] || 0) + ac.percentage;
                }
            });

            const sortedFactions = Object.keys(factionAggregatedControl).sort();
            sortedFactions.forEach(factionName => {
                const percentage = factionAggregatedControl[factionName];
                const faction = factionsData.find(f => f.name === factionName);
                const color = faction ? faction.color : '#CCCCCC';

                const segmentDiv = document.createElement('div');
                segmentDiv.classList.add('planet-overlay-segment');
                segmentDiv.style.height = `${(percentage / totalFactionPercentage) * 100}%`;
                segmentDiv.style.backgroundColor = `${color}CC`;
                segmentDiv.style.bottom = `${currentHeight}%`;
                planetImageContainer.appendChild(segmentDiv);
                currentHeight += (percentage / totalFactionPercentage) * 100;
            });

            if (totalFactionPercentage < 100) {
                const remainingHeight = 100 - totalFactionPercentage;
                const baseOverlay = document.createElement('div');
                baseOverlay.classList.add('planet-overlay-segment');
                baseOverlay.style.height = `${remainingHeight}%`;
                baseOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                baseOverlay.style.bottom = `${currentHeight}%`;
                planetImageContainer.appendChild(baseOverlay);
            }

            planetImageContainer.appendChild(planetImage);
            planetCard.appendChild(planetImageContainer); // Append the simplified planet image container

            // Short info for initial all-planets view (always visible now)
            const planetInfoShort = document.createElement('div');
            planetInfoShort.classList.add('planet-info-short'); // Renamed class for clarity
            planetInfoShort.innerHTML = `
                <h3>${planet.name}</h3>
                <p>${planet.description.substring(0, 50)}...</p>
            `;
            planetCard.appendChild(planetInfoShort);

            // Container for detailed info (initially hidden)
            const planetDetailContentInCard = document.createElement('div');
            planetDetailContentInCard.classList.add('planet-detail-content-in-card');
            planetCard.appendChild(planetDetailContentInCard);


            // Add click listener for detailed view
            planetCard.addEventListener('click', () => {
                if (currentActivePlanetId === planet.id) {
                    showAllPlanets(); // If clicking the active planet, go back to all planets
                } else {
                    showPlanetDetail(planet.id); // Otherwise, show this planet's detail
                }
            });

            planetsContainer.appendChild(planetCard);
        });
    }

    function showPlanetDetail(planetId) {
        const selectedPlanet = planetsData.find(p => p.id === planetId);
        if (!selectedPlanet) return;

        currentActivePlanetId = planetId; // Set the active planet

        document.getElementById('back-to-planets-btn').classList.remove('hidden'); // Show back button

        planetsContainer.classList.add('single-view'); // Add class to container for CSS effects

        document.querySelectorAll('.planet-card').forEach(card => {
            const cardId = card.dataset.planetId;

            if (cardId !== planetId) {
                card.classList.add('inactive');
            } else {
                card.classList.remove('inactive');
                card.classList.add('active'); // Highlight the active planet

                // Populate detailed view within this active card
                const detailContentDiv = card.querySelector('.planet-detail-content-in-card');
                const shortInfoDiv = card.querySelector('.planet-info-short');

                // Hide short info and show detailed info
                if (shortInfoDiv) shortInfoDiv.classList.add('hidden');
                if (detailContentDiv) detailContentDiv.classList.remove('hidden');

                // Generate HTML for army control
                const armyControlHtml = selectedPlanet.army_control.map(ac => {
                    const army = armiesData.find(a => a.id === ac.army_id);
                    return army ? `<p style="color:${ac.color};"><strong>${army.name}:</strong> ${ac.percentage}%</p>` : '';
                }).join('');

                const battleInfoHtml = selectedPlanet.battle_reason ? `
                    <div class="battle-info">
                        <h4>Current Battle:</h4>
                        <p>${selectedPlanet.battle_reason}</p>
                    </div>
                ` : '';

                detailContentDiv.innerHTML = `
                    <h3>${selectedPlanet.name}</h3>
                    <p>${selectedPlanet.description}</p>
                    <div class="control-info">
                        <h4>Army Control:</h4>
                        ${armyControlHtml}
                    </div>
                    ${battleInfoHtml}
                `;
            }
        });
    }

    function showAllPlanets() {
        currentActivePlanetId = null; // Clear active planet

        document.getElementById('back-to-planets-btn').classList.add('hidden'); // Hide back button

        planetsContainer.classList.remove('single-view'); // Remove single view class

        document.querySelectorAll('.planet-card').forEach(card => {
            card.classList.remove('inactive', 'active'); // Remove active/inactive classes

            // Restore short info and hide detailed info
            const shortInfoDiv = card.querySelector('.planet-info-short');
            const detailContentDiv = card.querySelector('.planet-detail-content-in-card');
            if (shortInfoDiv) shortInfoDiv.classList.remove('hidden');
            if (detailContentDiv) {
                detailContentDiv.classList.add('hidden');
                detailContentDiv.innerHTML = ''; // Clear content
            }
        });
    }
});