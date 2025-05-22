document.addEventListener('DOMContentLoaded', () => {
    // --- Password Protection ---
    const passwordOverlay = document.getElementById('password-overlay');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const mainContent = document.getElementById('main-content');

    // IMPORTANT: This is a client-side password and is NOT secure.
    // Anyone can view the source code to find it.
    // Use this only for casual privacy, not for sensitive data.
    const CORRECT_PASSWORD = "crusade"; // <-- CHANGE THIS TO YOUR DESIRED PASSWORD!

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
    // This function runs ONLY after the correct password is entered.
    async function initializeCrusadeTracker() {
        console.log("Crusade Tracker Initialized!");

        // --- Data Loading ---
        let factionsData = [];
        let armiesData = [];
        let planetsData = [];

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

            // --- Render Components ---
            renderFactionChart(factionsData);
            renderArmyList(armiesData);
            renderPlanets(planetsData); // Initial render of all planets
            setupArmyOverview(armiesData);

        } catch (error) {
            console.error('Error loading data:', error);
            // Display a user-friendly error message on the page
            mainContent.innerHTML = `<p style="color: red; text-align: center;">
                                        Failed to load campaign data. Please check the data files and try again.
                                    </p>`;
        }
    }

    // --- Faction Progress Bar Graph ---
    function renderFactionChart(factions) {
        const ctx = document.getElementById('factionBarChart').getContext('2d');
        const factionNames = factions.map(f => f.name);
        const factionScores = factions.map(f => f.score);
        const factionColors = factions.map(f => f.color);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: factionNames,
                datasets: [{
                    label: 'Crusade Score',
                    data: factionScores,
                    backgroundColor: factionColors.map(color => `${color}B3`), // 70% opacity
                    borderColor: factionColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 150, // Adjust max score as needed for your campaign
                        ticks: {
                            color: '#e0e0e0' // Y-axis label color
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)' // Grid line color
                        }
                    },
                    x: {
                        ticks: {
                            color: '#e0e0e0' // X-axis label color
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)' // Grid line color
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0' // Legend text color
                        }
                    }
                }
            }
        });
    }

    // --- Participating Armies List ---
    function renderArmyList(armies) {
        const armyListContainer = document.getElementById('army-list');
        armyListContainer.innerHTML = ''; // Clear previous content

        armies.forEach(army => {
            const armyCard = document.createElement('div');
            armyCard.classList.add('army-card');
            armyCard.innerHTML = `
                <h3>${army.name}</h3>
                <p><strong>Faction:</strong> ${army.faction}</p>
                <p>${army.description.substring(0, 150)}...</p>
                <p><strong>Player:</strong> ${army.player}</p>
            `;
            armyListContainer.appendChild(armyCard);
        });
    }

    // --- Planetary Control (Planets & Ships) ---
    const planetsContainer = document.getElementById('planets-container');
    const planetDetailView = document.getElementById('planet-detail-view');
    const planetDetailContent = document.getElementById('planet-detail-content');
    const backToPlanetsBtn = document.getElementById('back-to-planets-btn');

    backToPlanetsBtn.addEventListener('click', showAllPlanets);

    function renderPlanets(planets) {
        planetsContainer.innerHTML = ''; // Clear previous content
        planetsContainer.classList.remove('hidden'); // Ensure container is visible
        planetDetailView.classList.add('hidden'); // Ensure detail view is hidden

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
            planetInfoShort.classList.add('planet-info-hover'); // Reusing class name, but CSS handles always-visible
            planetInfoShort.innerHTML = `
                <h3>${planet.name}</h3>
                <p>${planet.description.substring(0, 50)}...</p>
            `;
            planetCard.appendChild(planetInfoShort);

            // Ship Image - Position controlled by 'ship_location' in planets.json
            // To adjust ship position:
            // 1. Open data/planets.json
            // 2. Find the planet the ship is associated with.
            // 3. Update "ship_location": "planet_id" to the ID of the planet you want the ship to appear next to.
            //    Set to null to make it appear next to its own planet card (default right corner).
            // 4. Update "ship_reason": "Your battle description here."
            // 5. Save, commit, and push changes to GitHub.
            const shipImage = document.createElement('img');
            shipImage.classList.add('ship-image');
            shipImage.src = 'images/ship.png'; // Replace with your ship image path
            shipImage.alt = 'Crusade Ship';
            shipImage.id = `ship-${planet.id}`; // Unique ID for each ship instance

            // Determine where the ship should be placed
            if (planet.ship_location) {
                // Find the target planet card to append the ship to
                const targetPlanetCard = document.querySelector(`.planet-card[data-planet-id="${planet.ship_location}"]`);
                if (targetPlanetCard) {
                    targetPlanetCard.appendChild(shipImage);
                    // Position the ship relative to the target planet card
                    shipImage.style.position = 'absolute';
                    shipImage.style.top = '10px';
                    shipImage.style.right = '10px'; // Position on the top right of the target planet
                } else {
                    // Fallback if target planet not found, place on its own card
                    planetCard.appendChild(shipImage);
                }
            } else {
                // Default position if not linked to another planet
                planetCard.appendChild(shipImage);
            }

            // Add click listener for detailed view
            planetCard.addEventListener('click', () => showPlanetDetail(planet.id));

            planetsContainer.appendChild(planetCard);
        });
    }

    function showPlanetDetail(planetId) {
        const selectedPlanet = planetsData.find(p => p.id === planetId);
        if (!selectedPlanet) return;

        // Hide all planets and show detail view
        planetsContainer.classList.add('single-view'); // Add class to container for CSS effects
        document.querySelectorAll('.planet-card').forEach(card => {
            if (card.dataset.planetId !== planetId) {
                card.classList.add('inactive');
            } else {
                card.classList.add('active'); // Highlight the active planet
            }
        });

        // Populate detail view
        planetDetailContent.innerHTML = `
            <div class="planet-image-container">
                <img class="planet-image" src="${selectedPlanet.image}" alt="${selectedPlanet.name}">
                ${selectedPlanet.factions_control.map(fc => `
                    <div class="planet-overlay-segment" style="height: ${fc.percentage}%; background-color: ${fc.color}CC; bottom: ${selectedPlanet.factions_control.slice(0, selectedPlanet.factions_control.indexOf(fc)).reduce((sum, prevFc) => sum + prevFc.percentage, 0)}%;"></div>
                `).join('')}
                ${selectedPlanet.factions_control.reduce((sum, fc) => sum + fc.percentage, 0) < 100 ? `
                    <div class="planet-overlay-segment" style="height: ${100 - selectedPlanet.factions_control.reduce((sum, fc) => sum + fc.percentage, 0)}%; background-color: rgba(0, 0, 0, 0.2); bottom: ${selectedPlanet.factions_control.reduce((sum, fc) => sum + fc.percentage, 0)}%;"></div>
                ` : ''}
            </div>
            <div class="text-content">
                <h3>${selectedPlanet.name}</h3>
                <p>${selectedPlanet.description}</p>
                <div class="control-info">
                    <h4>Current Control:</h4>
                    ${selectedPlanet.factions_control.map(fc => `<p style="color:${fc.color};"><strong>${fc.faction}:</strong> ${fc.percentage}%</p>`).join('')}
                </div>
                ${selectedPlanet.ship_reason ? `
                    <div class="battle-info">
                        <h4>Current Battle:</h4>
                        <p>${selectedPlanet.ship_reason}</p>
                    </div>
                ` : ''}
            </div>
        `;

        planetsContainer.classList.add('hidden'); // Hide the grid of planets
        planetDetailView.classList.remove('hidden'); // Show the detailed view
    }

    function showAllPlanets() {
        planetsContainer.classList.remove('hidden', 'single-view');
        document.querySelectorAll('.planet-card').forEach(card => {
            card.classList.remove('inactive', 'active');
        });
        planetDetailView.classList.add('hidden');
    }


    // --- Army Roster Overview with Dropdown ---
    function setupArmyOverview(armies) {
        const armySelect = document.getElementById('army-select');
        const selectedArmyDetails = document.getElementById('selected-army-details');

        // Populate dropdown
        armies.forEach(army => {
            const option = document.createElement('option');
            option.value = army.id;
            option.textContent = army.name;
            armySelect.appendChild(option);
        });

        // Event listener for dropdown change
        armySelect.addEventListener('change', (e) => {
            const selectedArmyId = e.target.value;
            if (selectedArmyId) {
                const army = armies.find(a => a.id === selectedArmyId);
                if (army) {
                    selectedArmyDetails.innerHTML = `
                        <h3>${army.name}</h3>
                        <p><strong>Player:</strong> ${army.player}</p>
                        <p><strong>Faction:</strong> ${army.faction}</p>
                        <p><strong>Description:</strong> ${army.description}</p>
                        <p><strong>Crusade Points:</strong> ${army.crusade_points}</p>
                        <p><strong>Battles Played:</strong> ${army.battles_played}</p>
                        <p><strong>Victories:</strong> ${army.victories}</p>
                        <p><strong>Notes:</strong> ${army.notes || 'N/A'}</p>
                    `;
                    selectedArmyDetails.classList.remove('hidden');
                }
            } else {
                selectedArmyDetails.classList.add('hidden');
            }
        });
    }
});
