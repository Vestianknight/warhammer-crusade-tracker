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

    // --- Password Protection ---
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const CORRECT_PASSWORD = "1234"; // <-- CHANGE THIS TO YOUR DESIRED PASSWORD!

    passwordSubmit.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });

    function checkPassword() {
        if (passwordInput.value === CORRECT_PASSWORD) {
            passwordOverlay.classList.add('hidden');
            mainContent.style.display = 'block'; // Show the main content
            initializeCrusadeTracker(); // Initialize the rest of the app
        } else {
            alert("Incorrect password. Access denied."); // Using alert for simplicity, but for production, use a custom modal.
            passwordInput.value = ''; // Clear input
        }
    }

    // --- Main Application Initialization ---
    async function initializeCrusadeTracker() {
        console.log("Crusade Tracker Initialized!");

        try {
            const [factionsRes, armiesRes, planetsRes] = await Promise.all([
                fetch('data/factions.json'),
                fetch('data/armies.json'),
                fetch('data/planets.json')
            ]);

            factionsData = await factionsRes.json();
            armiesData = await armiesRes.json();
            planetsData = await planetsRes.json();

            console.log('Data loaded:', { factionsData, armiesData, planetsData });

            // Initial render of components
            renderFactionChart(factionsData, armiesData);
            renderPlanets(planetsData); // Planets need armiesData to place ships
            // renderPlanets needs to be called after armiesData is loaded
            // so we can pass it or make armiesData global (which it is now)

            // Set up hash-based routing
            window.addEventListener('hashchange', router);
            router(); // Call router once on load to handle initial URL

        } catch (error) {
            console.error('Error loading data:', error);
            mainContent.innerHTML = `<p style="color: red; text-align: center;">
                                        Failed to load campaign data. Please check the data files and try again.
                                    </p>`;
        }
    }

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
    function renderArmyListOverview(armies) {
        armyListOverview.innerHTML = ''; // Clear previous content
        armyListOverview.classList.remove('hidden'); // Ensure visible
        armyDetailPageContainer.classList.add('hidden'); // Ensure detail page is hidden

        armies.forEach(army => {
            const armyCard = document.createElement('div');
            armyCard.classList.add('army-card');
            armyCard.innerHTML = `
                <div class="army-card-header">
                    <h3>${army.name}</h3>
                    <img src="${army.ship_image}" alt="${army.name} Ship" class="army-card-ship-image">
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
            <img src="${army.ship_image}" alt="${army.name} Ship" class="army-detail-ship-image">
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


    // --- Planetary Control (Planets & Ships) ---
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

            const planetImageContainer = document.createElement('div');
            planetImageContainer.classList.add('planet-image-container');

            const planetImage = document.createElement('img');
            planetImage.classList.add('planet-image');
            planetImage.src = planet.image || `images/planet1.png`; // Placeholder if image not found
            planetImage.alt = planet.name;

            // Percentage Overlay - Opacity adjusted in CSS for more planet visibility
            const totalPercentage = planet.factions_control.reduce((sum, fc) => sum + fc.percentage, 0);
            let currentHeight = 0;
            planet.factions_control.forEach(fc => {
                const segmentHeight = (fc.percentage / totalPercentage) * 100; // Calculate segment height relative to 100%
                const segmentDiv = document.createElement('div');
                segmentDiv.classList.add('planet-overlay-segment');
                segmentDiv.style.height = `${segmentHeight}%`;
                segmentDiv.style.backgroundColor = `${fc.color}CC`; // Add some transparency
                segmentDiv.style.bottom = `${currentHeight}%`; // Stack segments from the bottom
                planetImageContainer.appendChild(segmentDiv);
                currentHeight += segmentHeight;
            });

            // Add a base overlay for the rest of the planet if total is less than 100%
            if (totalPercentage < 100) {
                const remainingHeight = 100 - totalPercentage;
                const baseOverlay = document.createElement('div');
                baseOverlay.classList.add('planet-overlay-segment');
                baseOverlay.style.height = `${remainingHeight}%`;
                baseOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'; // Faint dark overlay for uncontrolled parts
                baseOverlay.style.bottom = `${currentHeight}%`;
                planetImageContainer.appendChild(baseOverlay);
            }

            planetImageContainer.appendChild(planetImage);
            planetCard.appendChild(planetImageContainer);

            // Short info for initial all-planets view (always visible now)
            const planetInfoShort = document.createElement('div');
            planetInfoShort.classList.add('planet-info-short'); // Renamed class for clarity
            planetInfoShort.innerHTML = `
                <h3>${planet.name}</h3>
                <p>${planet.description.substring(0, 50)}...</p>
            `;
            planetCard.appendChild(planetInfoShort);

            // --- Ship Image for Planet ---
            // If this planet has an army fighting on it, display that army's ship
            if (planet.fighting_army_id) {
                const fightingArmy = armiesData.find(army => army.id === planet.fighting_army_id);
                if (fightingArmy && fightingArmy.ship_image) {
                    const shipImageElement = document.createElement('img');
                    shipImageElement.classList.add('ship-image');
                    shipImageElement.src = fightingArmy.ship_image; // Use the army's specific ship image
                    shipImageElement.alt = `${fightingArmy.name} Ship`;
                    shipImageElement.title = `${fightingArmy.name} is battling here!`; // Tooltip for the ship
                    planetCard.appendChild(shipImageElement);
                }
            }
            // --- End Ship Image for Planet ---


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
            const shipElement = card.querySelector('.ship-image'); // Get ship for this card

            if (cardId !== planetId) {
                card.classList.add('inactive');
                // If a ship is on an inactive card, ensure it also fades
                if (shipElement) {
                    shipElement.classList.add('inactive');
                }
            } else {
                card.classList.remove('inactive');
                card.classList.add('active'); // Highlight the active planet
                // Ensure active ship is visible
                if (shipElement) {
                    shipElement.classList.remove('inactive');
                }

                // Populate detailed view within this active card
                const detailContentDiv = card.querySelector('.planet-detail-content-in-card');
                const shortInfoDiv = card.querySelector('.planet-info-short');

                // Hide short info and show detailed info
                if (shortInfoDiv) shortInfoDiv.classList.add('hidden');
                if (detailContentDiv) detailContentDiv.classList.remove('hidden');

                // Find the fighting army to display its name in the battle info
                const fightingArmy = selectedPlanet.fighting_army_id ? armiesData.find(a => a.id === selectedPlanet.fighting_army_id) : null;
                const battleInfoHtml = selectedPlanet.battle_reason ? `
                    <div class="battle-info">
                        <h4>Current Battle:</h4>
                        <p>${selectedPlanet.battle_reason}</p>
                        ${fightingArmy ? `<p><strong>Army:</strong> ${fightingArmy.name}</p>` : ''}
                    </div>
                ` : '';

                detailContentDiv.innerHTML = `
                    <h3>${selectedPlanet.name}</h3>
                    <p>${selectedPlanet.description}</p>
                    <div class="control-info">
                        <h4>Current Control:</h4>
                        ${selectedPlanet.factions_control.map(fc => `<p style="color:${fc.color};"><strong>${fc.faction}:</strong> ${fc.percentage}%</p>`).join('')}
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
            const shipElement = card.querySelector('.ship-image');
            if (shipElement) {
                shipElement.classList.remove('inactive'); // Ensure all ships are visible
            }

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