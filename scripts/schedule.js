document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('sector-auspex-canvas');
    const ctx = canvas.getContext('2d');
    const weeklyBattlesSchedule = document.getElementById('weekly-battles-schedule');
    const battleArmyFilterDropdown = document.getElementById('battle-army-filter'); // New dropdown

    let planetsData = [];
    let armiesData = [];
    let planet1Image = new Image();
    const loadedShipImages = {}; // Cache for specific ship images (ship1.png to ship10.png)
    let activeShips = []; // To store ship positions and data for interaction
    let generatedBattles = []; // Store all generated battles

    let hoveredShip = null; // Track currently hovered ship for canvas drawing

    // --- Data Loading ---
    async function loadData() {
        try {
            const [planetsRes, armiesRes] = await Promise.all([
                fetch('data/planets.json'),
                fetch('data/armies.json')
            ]);
            planetsData = await planetsRes.json();
            armiesData = await armiesRes.json();

            // Load planet1 image
            const planet1 = planetsData.find(p => p.id === 'planet1');
            if (planet1) {
                planet1Image.src = planet1.image;
                await new Promise(resolve => planet1Image.onload = resolve); // Wait for image to load
            }

            // Load specific ship images (ship1.png to ship10.png)
            const shipImagePromises = [];
            // Assuming armiesData has at least 10 armies for 10 ships, or fewer if less are available
            for (let i = 0; i < armiesData.length && i < 10; i++) {
                const shipNum = i + 1;
                const img = new Image();
                img.src = `images/ship${shipNum}.png`; // Assuming ship1.png, ship2.png, etc.
                loadedShipImages[armiesData[i].id] = img; // Map ship image to army ID
                shipImagePromises.push(new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = () => {
                        console.warn(`Failed to load ship image: ${img.src}. Using placeholder.`);
                        // Fallback to a simple colored square with text if image fails to load
                        img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23505050"/><text x="50" y="50" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">SHIP${shipNum}</text></svg>`;
                        resolve();
                    };
                }));
            }
            await Promise.all(shipImagePromises);

            console.log('Schedule page data loaded:', { planetsData, armiesData, loadedShipImages });

            // Populate the battle filter dropdown
            populateBattleArmyFilter(armiesData);

            // Generate battles once after data is loaded
            generatedBattles = generateBattles(armiesData, 3); // Each army has 3 matches
            console.log('Generated Battles:', generatedBattles);

            // Initial render
            resizeCanvas(); // This will call renderScene
            renderWeeklyBattles(generatedBattles, 'all'); // Render all battles initially

        } catch (error) {
            console.error('Error loading data for schedule page:', error);
            if (canvas) canvas.style.display = 'none';
            if (weeklyBattlesSchedule) weeklyBattlesSchedule.innerHTML = '<p style="color: var(--auspex-green-light); text-align: center;">Failed to load campaign data.</p>';
        }
    }

    // --- Canvas Drawing ---
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        // Maintain aspect ratio, but ensure it's not too small or too large
        canvas.height = Math.min(container.clientWidth * 0.7, 600); // Adjusted aspect ratio for more vertical space
        renderScene();
    }

    function renderScene() {
        if (!ctx || !planet1Image.complete) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

        const planet = planetsData.find(p => p.id === 'planet1');
        if (!planet) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const planetRadius = Math.min(canvas.width, canvas.height) * 0.25; // Planet slightly bigger
        const shipCircleRadius = planetRadius * 1.8; // Ships further out
        const shipSize = planetRadius * 0.4; // Ships a little bigger

        // Draw Planet 1
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
        ctx.clip(); // Clip to the circle
        ctx.drawImage(planet1Image, centerX - planetRadius, centerY - planetRadius, planetRadius * 2, planetRadius * 2);
        ctx.restore();

        // Draw planet border
        ctx.beginPath();
        ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'var(--auspex-green-light)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'var(--auspex-green-light)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        activeShips = []; // Clear previous ship data

        // Draw Ships and Lines
        const armiesToDisplay = armiesData.slice(0, 10); // Use up to 10 armies for the visual
        const totalArmies = armiesToDisplay.length;

        armiesToDisplay.forEach((army, index) => {
            const angle = (Math.PI * 2 / totalArmies) * index - (Math.PI / 2); // Start at top, rotate clockwise

            const shipX = centerX + shipCircleRadius * Math.cos(angle);
            const shipY = centerY + shipCircleRadius * Math.sin(angle);

            // Draw line from ship to planet
            ctx.beginPath();
            ctx.moveTo(shipX, shipY);
            const dx = centerX - shipX;
            const dy = centerY - shipY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const planetEdgeX = centerX - (dx / dist) * planetRadius;
            const planetEdgeY = centerY - (dy / dist) * planetRadius;
            ctx.lineTo(planetEdgeX, planetEdgeY);
            ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)'; // Fainter green line
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw ship image
            const currentShipImage = loadedShipImages[army.id] || loadedShipImages['generic']; // Fallback to generic if specific not found
            const drawX = shipX - shipSize / 2;
            const drawY = shipY - shipSize / 2;
            ctx.drawImage(currentShipImage, drawX, drawY, shipSize, shipSize);

            // Store ship bounding box and data for interaction
            activeShips.push({
                id: army.id,
                name: army.name,
                player: army.player,
                x: drawX,
                y: drawY,
                width: shipSize,
                height: shipSize,
                centerX: shipX, // Store center for text positioning
                centerY: shipY
            });
        });

        // Draw info for the currently hovered ship
        if (hoveredShip) {
            drawShipInfoOnCanvas(hoveredShip, hoveredShip.centerX, hoveredShip.centerY, shipSize);
        }
    }

    // --- On-Canvas Interactivity (Hover/Tap) ---
    function getShipAtCoordinates(coordX, coordY) {
        for (const ship of activeShips) {
            if (coordX >= ship.x && coordX <= ship.x + ship.width &&
                coordY >= ship.y && coordY <= ship.y + ship.height) {
                return ship;
            }
        }
        return null;
    }

    function drawShipInfoOnCanvas(ship, shipX, shipY, shipSize) {
        const textOffset = shipSize / 2 + 10; // Offset text from ship image
        const armyName = ship.name;
        const playerName = `Player: ${ship.player}`;

        // Set font for measuring
        ctx.font = 'bold 14px "Inter"';
        const nameWidth = ctx.measureText(armyName).width;
        ctx.font = '12px "Inter"';
        const playerWidth = ctx.measureText(playerName).width;
        const maxWidth = Math.max(nameWidth, playerWidth);

        const padding = 8;
        const rectWidth = maxWidth + padding * 2;
        const rectHeight = 30 + padding * 2; // Height for two lines of text

        // Calculate background rectangle position
        const rectX = shipX - rectWidth / 2;
        const rectY = shipY - textOffset - rectHeight; // Position above the ship

        // Draw background rectangle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Dark background for readability
        ctx.strokeStyle = 'var(--auspex-green-light)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'var(--auspex-green-light)';
        ctx.shadowBlur = 8;
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 5); // Rounded corners
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Draw text
        ctx.fillStyle = 'var(--auspex-green-light)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top'; // Align text to the top of the line

        // Army Name
        ctx.font = 'bold 14px "Inter"';
        ctx.fillText(armyName, shipX, rectY + padding);

        // Player Name
        ctx.font = '12px "Inter"';
        ctx.fillStyle = 'var(--auspex-light-grey)';
        ctx.fillText(playerName, shipX, rectY + padding + 18); // 18px below army name
    }


    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const currentShip = getShipAtCoordinates(mouseX, mouseY);

        if (currentShip && currentShip !== hoveredShip) {
            hoveredShip = currentShip;
            renderScene(); // Redraw to show new hovered ship info
        } else if (!currentShip && hoveredShip) {
            hoveredShip = null;
            renderScene(); // Redraw to hide ship info
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (hoveredShip) {
            hoveredShip = null;
            renderScene(); // Redraw to hide ship info
        }
    });

    // For touch devices (tap to show/hide)
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault(); // Prevent scrolling on touch
        const rect = canvas.getBoundingClientRect();
        const touchX = event.touches[0].clientX - rect.left;
        const touchY = event.touches[0].clientY - rect.top;

        const tappedShip = getShipAtCoordinates(touchX, touchY);

        if (tappedShip) {
            if (hoveredShip && hoveredShip.id === tappedShip.id) {
                // Tapped the same ship again, hide info
                hoveredShip = null;
            } else {
                hoveredShip = tappedShip;
            }
            renderScene(); // Redraw to update info display
        } else if (hoveredShip) {
            // Tapped outside any ship, hide info
            hoveredShip = null;
            renderScene(); // Redraw to hide info
        }
    });

    // --- Battle Generation Logic ---
    function generateBattles(armies, matchesPerArmy) {
        const allArmies = armies.map(army => ({ id: army.id, name: army.name, player: army.player }));
        const battles = [];
        const armyMatchCount = {};
        const armyOpponents = {}; // To track who each army has fought

        allArmies.forEach(army => {
            armyMatchCount[army.id] = 0;
            armyOpponents[army.id] = new Set();
        });

        let battleIdCounter = 1;
        let attempts = 0;
        const maxAttempts = allArmies.length * matchesPerArmy * 3; // Increased safety break

        while (Object.values(armyMatchCount).some(count => count < matchesPerArmy) && attempts < maxAttempts) {
            attempts++;

            // Get armies that still need matches
            const potentialParticipants = allArmies.filter(army => armyMatchCount[army.id] < matchesPerArmy);

            if (potentialParticipants.length < 2) {
                if (potentialParticipants.length === 1 && armyMatchCount[potentialParticipants[0].id] < matchesPerArmy) {
                    const soloArmy = potentialParticipants[0];
                    const possibleOpponent = allArmies.find(
                        a => a.id !== soloArmy.id &&
                             armyMatchCount[a.id] < matchesPerArmy &&
                             !armyOpponents[soloArmy.id].has(a.id)
                    );
                    if (possibleOpponent) {
                         potentialParticipants.push(possibleOpponent);
                    }
                }
                if (potentialParticipants.length < 2) break;
            }

            // Shuffle and pick two armies
            potentialParticipants.sort(() => Math.random() - 0.5);
            let army1 = potentialParticipants[0];
            let army2 = potentialParticipants[1];

            // Ensure they haven't fought each other yet in this set
            if (armyOpponents[army1.id].has(army2.id) || armyOpponents[army2.id].has(army1.id)) {
                continue; // Try again
            }

            // Ensure both armies still need matches
            if (armyMatchCount[army1.id] < matchesPerArmy && armyMatchCount[army2.id] < matchesPerArmy) {
                battles.push({
                    id: battleIdCounter++, // Keep original ID for sorting consistency within army blocks
                    army1: army1,
                    army2: army2,
                    outcome: 'Undecided'
                });
                armyMatchCount[army1.id]++;
                armyMatchCount[army2.id]++;
                armyOpponents[army1.id].add(army2.id);
                armyOpponents[army2.id].add(army1.id);
            }
        }
        return battles;
    }

    // --- Battle Filter Dropdown ---
    function populateBattleArmyFilter(armies) {
        battleArmyFilterDropdown.innerHTML = '<option value="all">All Armies</option>';
        armies.forEach(army => {
            const option = document.createElement('option');
            option.value = army.id;
            option.textContent = `${army.name} (${army.player})`;
            battleArmyFilterDropdown.appendChild(option);
        });

        battleArmyFilterDropdown.addEventListener('change', (event) => {
            const selectedArmyId = event.target.value;
            // Pass the full generatedBattles and the selectedArmyId
            renderWeeklyBattles(generatedBattles, selectedArmyId);
        });
    }

    // --- Weekly Battles Schedule Table ---
    function renderWeeklyBattles(allBattles, selectedArmyId = 'all') {
        weeklyBattlesSchedule.innerHTML = ''; // Clear previous content

        // Filter battles based on selected army, if not 'all'
        let battlesToDisplay = allBattles;
        if (selectedArmyId !== 'all') {
            battlesToDisplay = allBattles.filter(battle =>
                battle.army1.id === selectedArmyId || battle.army2.id === selectedArmyId
            );
        }

        if (battlesToDisplay.length === 0) {
            weeklyBattlesSchedule.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No battles found for this selection.</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('battle-schedule-table');

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Battle #</th>
                <th>Army 1</th>
                <th></th> <th>Army 2</th>
                <th>Status</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        // Group battles by army for display
        const battlesGroupedByArmy = new Map(); // Map: armyId -> [{battle, isArmy1}, ...]

        battlesToDisplay.forEach(battle => {
            // Add battle to army1's list
            if (!battlesGroupedByArmy.has(battle.army1.id)) {
                battlesGroupedByArmy.set(battle.army1.id, []);
            }
            battlesGroupedByArmy.get(battle.army1.id).push({ battle: battle, isArmy1: true });

            // Add battle to army2's list (if different from army1)
            if (battle.army1.id !== battle.army2.id) {
                if (!battlesGroupedByArmy.has(battle.army2.id)) {
                    battlesGroupedByArmy.set(battle.army2.id, []);
                }
                battlesGroupedByArmy.get(battle.army2.id).push({ battle: battle, isArmy1: false });
            }
        });

        // Get sorted list of army IDs to ensure consistent order (alphabetical by name)
        const sortedArmyIds = Array.from(battlesGroupedByArmy.keys()).sort((aId, bId) => {
            const armyA = armiesData.find(a => a.id === aId);
            const armyB = armiesData.find(a => a.id === bId);
            return armyA.name.localeCompare(armyB.name);
        });

        sortedArmyIds.forEach(armyId => {
            const armyBattles = battlesGroupedByArmy.get(armyId);
            const currentArmy = armiesData.find(a => a.id === armyId);

            // Sort battles for this specific army by their original ID for consistent ordering
            armyBattles.sort((a, b) => a.battle.id - b.battle.id);

            let armySpecificBattleCount = 0; // Reset for each army
            armyBattles.forEach(entry => {
                const battle = entry.battle;
                armySpecificBattleCount++; // Increment for each battle of this army

                const row = document.createElement('tr');

                // Set data-label for mobile view
                const dataLabel = `${currentArmy.name} Battle`;

                row.innerHTML = `
                    <td data-label="${dataLabel}">${currentArmy.name} Battle ${armySpecificBattleCount}</td>
                    <td data-label="Army 1">${battle.army1.name} (${battle.army1.player})</td>
                    <td data-label="" class="vs-cell">VS</td>
                    <td data-label="Army 2">${battle.army2.name} (${battle.army2.player})</td>
                    <td data-label="Status" class="status-cell">${battle.outcome}</td>
                `;
                tbody.appendChild(row);
            });
        });

        table.appendChild(tbody);
        weeklyBattlesSchedule.appendChild(table);
    }

    // --- Initialize ---
    window.addEventListener('resize', resizeCanvas);
    loadData(); // Start loading data and rendering
});
