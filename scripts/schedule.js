document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('sector-auspex-canvas');
    const ctx = canvas.getContext('2d');
    const weeklyBattlesSchedule = document.getElementById('weekly-battles-schedule');
    const battleArmyFilterDropdown = document.getElementById('battle-army-filter');

    let planetsData = [];
    let armiesData = [];
    let planet1Image = new Image();
    const loadedShipImages = {};
    let activeShips = [];
    let generatedBattles = [];

    let hoveredShip = null;

    // --- Data Loading ---
    async function loadData() {
        try {
            const [planetsRes, armiesRes] = await Promise.all([
                fetch('data/planets.json'),
                fetch('data/armies.json')
            ]);
            planetsData = await planetsRes.json();
            armiesData = await armiesRes.json();

            const planet1 = planetsData.find(p => p.id === 'planet1');
            if (planet1) {
                planet1Image.src = planet1.image;
                await new Promise(resolve => planet1Image.onload = resolve);
            }

            const shipImagePromises = [];
            for (let i = 0; i < armiesData.length && i < 10; i++) {
                const shipNum = i + 1;
                const img = new Image();
                img.src = `images/ship${shipNum}.png`;
                loadedShipImages[armiesData[i].id] = img;
                shipImagePromises.push(new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = () => {
                        console.warn(`Failed to load ship image: ${img.src}. Using placeholder.`);
                        img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23505050"/><text x="50" y="50" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">SHIP${shipNum}</text></svg>`;
                        resolve();
                    };
                }));
            }
            await Promise.all(shipImagePromises);

            console.log('Schedule page data loaded:', { planetsData, armiesData, loadedShipImages });

            populateBattleArmyFilter(armiesData);
            generatedBattles = generateBattles(armiesData, 3);
            console.log('Generated Battles:', generatedBattles);

            resizeCanvas();
            renderWeeklyBattles(generatedBattles, 'all');

        } catch (error) {
            console.error('Error loading data for schedule page:', error);
            if (canvas) canvas.style.display = 'none';
            if (weeklyBattlesSchedule) weeklyWeeklyBattlesSchedule.innerHTML = '<p style="color: var(--auspex-green-light); text-align: center;">Failed to load campaign data.</p>';
        }
    }

    // --- Canvas Drawing ---
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = Math.min(container.clientWidth * 0.8, 650); // Adjusted aspect ratio and max height for more room
        renderScene();
    }

    function renderScene() {
        if (!ctx || !planet1Image.complete) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const planet = planetsData.find(p => p.id === 'planet1');
        if (!planet) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const planetRadius = Math.min(canvas.width, canvas.height) * 0.28; // Planet slightly bigger
        const shipCircleRadius = planetRadius * 1.9; // Ships further out
        const shipWidth = planetRadius * 0.5; // Ships wider
        const shipHeight = planetRadius * 0.3; // Ships proportional height (adjust as needed)

        // Draw Planet 1
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
        ctx.clip();
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
        ctx.shadowBlur = 0;

        activeShips = [];

        // Draw Ships and Lines
        const armiesToDisplay = armiesData.slice(0, 10);
        const totalArmies = armiesToDisplay.length;

        armiesToDisplay.forEach((army, index) => {
            const angle = (Math.PI * 2 / totalArmies) * index - (Math.PI / 2);

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
            ctx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw ship image
            const currentShipImage = loadedShipImages[army.id] || loadedShipImages['generic'];
            const drawX = shipX - shipWidth / 2;
            const drawY = shipY - shipHeight / 2;
            ctx.drawImage(currentShipImage, drawX, drawY, shipWidth, shipHeight);

            activeShips.push({
                id: army.id,
                name: army.name,
                player: army.player,
                x: drawX,
                y: drawY,
                width: shipWidth,
                height: shipHeight,
                centerX: shipX,
                centerY: shipY,
                angle: angle // Store angle for positioning text
            });
        });

        if (hoveredShip) {
            drawShipInfoOnCanvas(hoveredShip, hoveredShip.centerX, hoveredShip.centerY, hoveredShip.width, hoveredShip.height, hoveredShip.angle);
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

    function drawShipInfoOnCanvas(ship, shipX, shipY, shipWidth, shipHeight, angle) {
        const armyName = ship.name;
        const playerName = `Player: ${ship.player}`;

        ctx.font = 'bold 14px "Inter"';
        const nameWidth = ctx.measureText(armyName).width;
        ctx.font = '12px "Inter"';
        const playerWidth = ctx.measureText(playerName).width;
        const maxWidth = Math.max(nameWidth, playerWidth);

        const padding = 8;
        const rectWidth = maxWidth + padding * 2;
        const rectHeight = 30 + padding * 2;

        let textX, textY;
        let textAlign = 'center';
        let textBaseline = 'middle';

        // Determine position based on angle (quadrant)
        // Adjust text position to be outside the circle of ships,
        // and to the side/above/below based on quadrant.
        const offsetDistance = Math.max(shipWidth, shipHeight) / 2 + 15; // Distance from ship edge

        if (angle > -Math.PI * 0.25 && angle <= Math.PI * 0.25) { // Right side
            textX = shipX + offsetDistance;
            textY = shipY;
            textAlign = 'left';
        } else if (angle > Math.PI * 0.25 && angle <= Math.PI * 0.75) { // Bottom side
            textX = shipX;
            textY = shipY + offsetDistance;
            textBaseline = 'top';
        } else if (angle > Math.PI * 0.75 || angle <= -Math.PI * 0.75) { // Left side
            textX = shipX - offsetDistance;
            textY = shipY;
            textAlign = 'right';
        } else { // Top side (angle > -Math.PI * 0.75 and <= -Math.PI * 0.25)
            textX = shipX;
            textY = shipY - offsetDistance;
            textBaseline = 'bottom';
        }

        // Calculate background rectangle position based on final text position
        let rectX, rectY;
        if (textAlign === 'center') {
            rectX = textX - rectWidth / 2;
        } else if (textAlign === 'left') {
            rectX = textX;
        } else { // 'right'
            rectX = textX - rectWidth;
        }

        if (textBaseline === 'middle') {
            rectY = textY - rectHeight / 2;
        } else if (textBaseline === 'top') {
            rectY = textY;
        } else { // 'bottom'
            rectY = textY - rectHeight;
        }


        // Draw background rectangle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = 'var(--auspex-green-light)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'var(--auspex-green-light)';
        ctx.shadowBlur = 8;
        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 5);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw text
        ctx.fillStyle = 'white'; // Explicitly white text
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'top'; // Always align text to top of its line within the box

        // Army Name
        ctx.font = 'bold 14px "Inter"';
        ctx.fillText(armyName, textX, rectY + padding);

        // Player Name
        ctx.font = '12px "Inter"';
        ctx.fillStyle = 'white'; // Explicitly white text
        ctx.fillText(playerName, textX, rectY + padding + 18);
    }


    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const currentShip = getShipAtCoordinates(mouseX, mouseY);

        if (currentShip && currentShip !== hoveredShip) {
            hoveredShip = currentShip;
            renderScene();
        } else if (!currentShip && hoveredShip) {
            hoveredShip = null;
            renderScene();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (hoveredShip) {
            hoveredShip = null;
            renderScene();
        }
    });

    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touchX = event.touches[0].clientX - rect.left;
        const touchY = event.touches[0].clientY - rect.top;

        const tappedShip = getShipAtCoordinates(touchX, touchY);

        if (tappedShip) {
            if (hoveredShip && hoveredShip.id === tappedShip.id) {
                hoveredShip = null;
            } else {
                hoveredShip = tappedShip;
            }
            renderScene();
        } else if (hoveredShip) {
            hoveredShip = null;
            renderScene();
        }
    });

    // --- Battle Generation Logic ---
    function generateBattles(armies, matchesPerArmy) {
        const allArmies = armies.map(army => ({ id: army.id, name: army.name, player: army.player }));
        const battles = [];
        const armyMatchCount = {};
        const armyOpponents = {};

        allArmies.forEach(army => {
            armyMatchCount[army.id] = 0;
            armyOpponents[army.id] = new Set();
        });

        let battleIdCounter = 1;
        let attempts = 0;
        const maxAttempts = allArmies.length * matchesPerArmy * 3;

        while (Object.values(armyMatchCount).some(count => count < matchesPerArmy) && attempts < maxAttempts) {
            attempts++;

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

            potentialParticipants.sort(() => Math.random() - 0.5);
            let army1 = potentialParticipants[0];
            let army2 = potentialParticipants[1];

            if (armyOpponents[army1.id].has(army2.id) || armyOpponents[army2.id].has(army1.id)) {
                continue;
            }

            if (armyMatchCount[army1.id] < matchesPerArmy && armyMatchCount[army2.id] < matchesPerArmy) {
                battles.push({
                    id: battleIdCounter++,
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
            renderWeeklyBattles(generatedBattles, selectedArmyId);
        });
    }

    // --- Weekly Battles Schedule Table ---
    function renderWeeklyBattles(allBattles, selectedArmyId = 'all') {
        weeklyBattlesSchedule.innerHTML = '';

        const table = document.createElement('table');
        table.classList.add('battle-schedule-table');

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Battle #</th>
                <th>Army 1</th>
                <th></th>
                <th>Army 2</th>
                <th>Status</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        // Group battles by army for display
        const battlesGroupedByArmy = new Map();

        // Populate the map with battles where each army is a participant
        allBattles.forEach(battle => {
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

        if (selectedArmyId === 'all') {
            // Render all armies, grouped and numbered per army
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
                    const dataLabel = `${currentArmy.name} Battle`; // For mobile view

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
        } else {
            // Render only battles for the selected army, numbered 1, 2, 3
            const selectedArmyBattles = battlesGroupedByArmy.get(selectedArmyId) || [];
            const currentArmy = armiesData.find(a => a.id === selectedArmyId);

            // Sort battles for the selected army by their original ID
            selectedArmyBattles.sort((a, b) => a.battle.id - b.battle.id);

            let armySpecificBattleCount = 0;
            selectedArmyBattles.forEach(entry => {
                const battle = entry.battle;
                armySpecificBattleCount++;

                const row = document.createElement('tr');
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

            if (selectedArmyBattles.length === 0) {
                 weeklyBattlesSchedule.innerHTML = `<p style="text-align: center; color: var(--auspex-medium-grey);">No battles found for ${currentArmy.name}.</p>`;
                 return;
            }
        }


        if (tbody.children.length === 0) {
            weeklyBattlesSchedule.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No battles found for this selection.</p>';
            return;
        }

        table.appendChild(tbody);
        weeklyBattlesSchedule.appendChild(table);
    }

    // --- Initialize ---
    window.addEventListener('resize', resizeCanvas);
    loadData(); // Start loading data and rendering
});