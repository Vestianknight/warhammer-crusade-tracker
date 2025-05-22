document.addEventListener('DOMContentLoaded', () => {
    // --- Password Protection ---
    const passwordOverlay = document.getElementById('password-overlay');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const mainContent = document.getElementById('main-content');

    // IMPORTANT: This is a client-side password and is NOT secure.
    // Anyone can view the source code to find it.
    // Use this only for casual privacy, not for sensitive data.
    const CORRECT_PASSWORD = "adam"; // <-- CHANGE THIS TO YOUR DESIRED PASSWORD!   

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
            // CORRECTED FETCH PATHS: Prepend /warhammer-crusade-tracker/ to data file paths
            const [factionsRes, armiesRes, planetsRes] = await Promise.all([
                fetch('/warhammer-crusade-tracker/data/factions.json'),
                fetch('/warhammer-crusade-tracker/data/armies.json'),
                fetch('/warhammer-crusade-tracker/data/planets.json')
            ]);

            factionsData = await factionsRes.json();
            armiesData = await armiesRes.json();
            planetsData = await planetsRes.json();

            console.log('Data loaded:', { factionsData, armiesData, planetsData });

            // --- Render Components ---
            renderFactionChart(factionsData);
            renderArmyList(armiesData);
            renderPlanets(planetsData);
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
                    }
                    ,
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
    const toggleAdminModeBtn = document.getElementById('toggle-admin-mode');
    const adminShipInfo = document.getElementById('admin-ship-info');
    const shipReasonInput = document.getElementById('ship-reason-input');
    const saveShipReasonBtn = document.getElementById('save-ship-reason');

    let isAdminMode = false;
    let currentDraggingShip = null; // To keep track of the ship being dragged
    let lastDraggedShipId = null; // To know which ship's reason to save

    toggleAdminModeBtn.addEventListener('click', () => {
        // Simple admin password check for toggling admin mode
        const adminPassword = prompt("Enter admin password to toggle mode:");
        if (adminPassword === "admin123") { // <-- CHANGE THIS ADMIN PASSWORD!
            isAdminMode = !isAdminMode;
            toggleAdminModeBtn.textContent = isAdminMode ? 'Exit Admin Mode' : 'Toggle Admin Mode';
            adminShipInfo.classList.toggle('hidden', !isAdminMode);
            // Re-render planets to apply/remove draggable attribute
            renderPlanets(planetsData); // Re-render with updated isAdminMode
            console.log('Admin Mode:', isAdminMode);
        } else if (adminPassword !== null) { // If user didn't cancel prompt
            alert("Incorrect admin password.");
        }
    });

    saveShipReasonBtn.addEventListener('click', () => {
        if (lastDraggedShipId) {
            const reason = shipReasonInput.value;
            // Find the planet associated with the last dragged ship
            const planet = planetsData.find(p => p.ship_location === lastDraggedShipId);
            if (planet) {
                planet.ship_reason = reason;
                console.log(`Saved reason for ${lastDraggedShipId}: ${reason}`);
                alert(`Reason saved for ship near ${planet.name}. (Note: This is not persistent without a backend.)`);
            } else {
                alert("No ship is currently associated with a planet to save a reason for.");
            }
        } else {
            alert("No ship has been dragged yet to save a reason for.");
        }
    });


    function renderPlanets(planets) {
        planetsContainer.innerHTML = ''; // Clear previous content

        planets.forEach(planet => {
            const planetCard = document.createElement('div');
            planetCard.classList.add('planet-card');
            planetCard.dataset.planetId = planet.id; // Store planet ID for ship dropping

            const planetImageContainer = document.createElement('div');
            planetImageContainer.classList.add('planet-image-container');

            const planetImage = document.createElement('img');
            planetImage.classList.add('planet-image');
            // CORRECTED IMAGE PATH: /warhammer-crusade-tracker/images/planetX.png
            planetImage.src = planet.image || `/warhammer-crusade-tracker/images/planet1.png`; // Placeholder if image not found
            planetImage.alt = planet.name;

            // Percentage Overlay
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


            // Planet Info on Hover (for mobile/smaller screens)
            const planetInfoHover = document.createElement('div');
            planetInfoHover.classList.add('planet-info-hover');
            planetInfoHover.innerHTML = `
                <h3>${planet.name}</h3>
                <p>${planet.description}</p>
                <p><strong>Control:</strong></p>
                ${planet.factions_control.map(fc => `<p style="color:${fc.color};">${fc.faction}: ${fc.percentage}%</p>`).join('')}
                ${planet.ship_reason ? `<p><strong>Battle:</strong> ${planet.ship_reason}</p>` : ''}
            `;

            planetImageContainer.appendChild(planetImage);
            planetImageContainer.appendChild(planetInfoHover);
            planetCard.appendChild(planetImageContainer);

            // Text info always visible on larger screens
            const planetTextInfo = document.createElement('div');
            planetTextInfo.classList.add('planet-info-hover'); // Reusing class, but behavior changed by CSS media query
            planetTextInfo.innerHTML = `
                <h3>${planet.name}</h3>
                <p>${planet.description}</p>
                <p><strong>Control:</strong></p>
                ${planet.factions_control.map(fc => `<p style="color:${fc.color};">${fc.faction}: ${fc.percentage}%</p>`).join('')}
                ${planet.ship_reason ? `<p><strong>Battle:</strong> ${planet.ship_reason}</p>` : ''}
            `;
            planetCard.appendChild(planetTextInfo);


            // Ship Image
            const shipImage = document.createElement('img');
            shipImage.classList.add('ship-image');
            // CORRECTED IMAGE PATH: /warhammer-crusade-tracker/images/ship.png
            shipImage.src = '/warhammer-crusade-tracker/images/ship.png'; // Replace with your ship image path
            shipImage.alt = 'Crusade Ship';
            shipImage.id = `ship-${planet.id}`; // Unique ID for each ship instance
            shipImage.dataset.shipId = planet.id; // Store which planet this ship belongs to conceptually

            if (isAdminMode) {
                shipImage.classList.add('admin-mode');
                shipImage.draggable = true; // Enable drag only in admin mode
                shipImage.addEventListener('dragstart', handleDragStart);
            } else {
                shipImage.classList.remove('admin-mode');
                shipImage.draggable = false;
                shipImage.removeEventListener('dragstart', handleDragStart);
            }

            // Position ship if it was previously set (non-persistent in this version)
            if (planet.ship_location) {
                const targetPlanetCard = document.querySelector(`.planet-card[data-planet-id="${planet.ship_location}"]`);
                if (targetPlanetCard) {
                    // Position the ship relative to the target planet card
                    // This is a simplified positioning. For precise placement, you'd need more complex calculations.
                    shipImage.style.position = 'absolute';
                    shipImage.style.top = '10px'; // Example offset
                    shipImage.style.left = 'calc(100% - 70px)'; // Example offset
                    targetPlanetCard.appendChild(shipImage);
                }
            } else {
                // Default position if not linked to a planet
                planetCard.appendChild(shipImage);
            }

            planetsContainer.appendChild(planetCard);
        });

        // Set up drop targets for planets
        const allPlanetCards = document.querySelectorAll('.planet-card');
        allPlanetCards.forEach(card => {
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('drop', handleDrop);
        });
    }

    // --- Drag and Drop for Ships (Admin Mode) ---
    function handleDragStart(e) {
        if (!isAdminMode) return;
        currentDraggingShip = e.target;
        lastDraggedShipId = e.target.dataset.shipId; // Store the ID of the ship being dragged
        e.dataTransfer.setData('text/plain', e.target.id); // Set data for transfer
        e.target.classList.add('dragging');
    }

    function handleDragOver(e) {
        e.preventDefault(); // Allow drop
    }

    function handleDrop(e) {
        e.preventDefault();
        if (!isAdminMode || !currentDraggingShip) return;

        const droppedOnPlanetCard = e.currentTarget;
        const planetId = droppedOnPlanetCard.dataset.planetId;

        // Update the ship's conceptual location in planetsData (non-persistent)
        planetsData.forEach(p => {
            if (p.ship_location === currentDraggingShip.dataset.shipId) {
                p.ship_location = null; // Clear old location
                p.ship_reason = null;
            }
        });

        const targetPlanet = planetsData.find(p => p.id === planetId);
        if (targetPlanet) {
            targetPlanet.ship_location = currentDraggingShip.dataset.shipId;
            // Update the ship's visual position
            // Append the ship to the new planet card
            droppedOnPlanetCard.appendChild(currentDraggingShip);

            // For simplicity, we'll just place it at a fixed spot on the new card
            currentDraggingShip.style.position = 'absolute';
            currentDraggingShip.style.top = '10px';
            currentDraggingShip.style.left = 'calc(100% - 70px)'; // Adjust as needed
        }

        currentDraggingShip.classList.remove('dragging');
        currentDraggingShip = null;
        // Re-render planets to update ship positions and potentially info (though not persistent)
        renderPlanets(planetsData);
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