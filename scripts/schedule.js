document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('sector-auspex-canvas');
    const ctx = canvas.getContext('2d');
    const shipInfoPopup = document.getElementById('ship-info-popup');
    const weeklyBattlesSchedule = document.getElementById('weekly-battles-schedule');

    let planetsData = [];
    let armiesData = [];
    let planet1Image = new Image();
    const loadedShipImages = {}; // Cache for specific ship images (ship1.png to ship10.png)
    let activeShips = []; // To store ship positions and data for interaction

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
            for (let i = 0; i < armiesData.length && i < 10; i++) { // Load up to 10 ships, matching armies
                const shipNum = i + 1;
                const img = new Image();
                img.src = `images/ship${shipNum}.png`; // Assuming ship1.png, ship2.png, etc.
                loadedShipImages[armiesData[i].id] = img; // Map ship image to army ID
                shipImagePromises.push(new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = () => {
                        console.warn(`Failed to load ship image: ${img.src}. Using placeholder.`);
                        // Fallback to a simple colored square if image fails to load
                        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23505050"/><text x="50" y="50" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">SHIP</text></svg>';
                        resolve();
                    };
                }));
            }
            await Promise.all(shipImagePromises);

            console.log('Schedule page data loaded:', { planetsData, armiesData, loadedShipImages });
            renderScene();
            renderWeeklyBattles();
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
        canvas.height = Math.min(container.clientWidth * 0.75, 600);
        renderScene();
    }

    function renderScene() {
        if (!ctx || !planet1Image.complete) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const planet = planetsData.find(p => p.id === 'planet1');
        if (!planet) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const planetRadius = Math.min(canvas.width, canvas.height) * 0.2;
        const shipCircleRadius = planetRadius * 1.6;
        const shipSize = planetRadius * 0.3; // Slightly larger for better detail

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
        const armiesToDisplay = armiesData.slice(0, 10); // Use up to 10 armies for the visual
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
                height: shipSize
            });
        });
    }

    // --- Interactivity (Hover/Tap) ---
    let hoveredShip = null;

    function getShipAtCoordinates(coordX, coordY) {
        for (const ship of activeShips) {
            if (coordX >= ship.x && coordX <= ship.x + ship.width &&
                coordY >= ship.y && coordY <= ship.y + ship.height) {
                return ship;
            }
        }
        return null;
    }

    function showPopup(ship, x, y) {
        shipInfoPopup.innerHTML = `
            <strong>${ship.name}</strong><br>
            <span>Player: ${ship.player}</span>
        `;
        shipInfoPopup.style.left = `${x + 10}px`;
        shipInfoPopup.style.top = `${y + 10}px`;
        shipInfoPopup.classList.remove('hidden');
    }

    function hidePopup() {
        shipInfoPopup.classList.add('hidden');
        shipInfoPopup.innerHTML = '';
    }

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const currentShip = getShipAtCoordinates(mouseX, mouseY);

        if (currentShip && currentShip !== hoveredShip) {
            hoveredShip = currentShip;
            showPopup(currentShip, mouseX, mouseY);
        } else if (!currentShip && hoveredShip) {
            hoveredShip = null;
            hidePopup();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        hoveredShip = null;
        hidePopup();
    });

    // For touch devices (tap to show/hide)
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touchX = event.touches[0].clientX - rect.left;
        const touchY = event.touches[0].clientY - rect.top;

        const tappedShip = getShipAtCoordinates(touchX, touchY);

        if (tappedShip) {
            if (hoveredShip && hoveredShip.id === tappedShip.id) {
                hoveredShip = null;
                hidePopup();
            } else {
                hoveredShip = tappedShip;
                showPopup(tappedShip, touchX, touchY);
            }
        } else {
            hoveredShip = null;
            hidePopup();
        }
    });

    // --- Weekly Battles Schedule ---
    function renderWeeklyBattles() {
        // Generate battles ensuring each army has 3 matches
        const allArmies = armiesData.map(army => ({ id: army.id, name: army.name, player: army.player }));
        const battles = [];
        const armyMatchCount = {}; // Track matches per army

        // Initialize match counts for all armies
        allArmies.forEach(army => armyMatchCount[army.id] = 0);

        let battleId = 1;
        let attempts = 0;
        const maxAttempts = 1000; // Prevent infinite loops

        while (battles.length < (allArmies.length * 3) / 2 && attempts < maxAttempts) { // (total armies * matches per army) / 2 armies per battle
            attempts++;

            // Select two random armies that need more matches
            const eligibleArmies = allArmies.filter(army => armyMatchCount[army.id] < 3);

            if (eligibleArmies.length < 2) {
                if (eligibleArmies.length === 1 && armyMatchCount[eligibleArmies[0].id] < 3) {
                    // One army left, try to pair it with someone who still has matches to give
                    const potentialOpponent = allArmies.find(a => a.id !== eligibleArmies[0].id && armyMatchCount[a.id] < 3);
                    if (potentialOpponent) {
                         eligibleArmies.push(potentialOpponent);
                    }
                }
                if (eligibleArmies.length < 2) break; // Cannot form another battle
            }

            // Shuffle eligible armies and pick the first two
            eligibleArmies.sort(() => Math.random() - 0.5);
            const army1 = eligibleArmies[0];
            const army2 = eligibleArmies[1];

            // Ensure they haven't fought before in this generated set (simple check)
            const alreadyFought = battles.some(b =>
                (b.army1Id === army1.id && b.army2Id === army2.id) ||
                (b.army1Id === army2.id && b.army2Id === army1.id)
            );

            if (!alreadyFought) {
                battles.push({
                    id: battleId++,
                    army1: `${army1.name} (${army1.player})`,
                    army2: `${army2.name} (${army2.player})`,
                    army1Id: army1.id, // Store IDs for check
                    army2Id: army2.id,
                    outcome: 'Undecided'
                });
                armyMatchCount[army1.id]++;
                armyMatchCount[army2.id]++;
            }
        }

        // Sort battles by ID for consistent display
        battles.sort((a, b) => a.id - b.id);

        weeklyBattlesSchedule.innerHTML = ''; // Clear previous content

        if (battles.length === 0) {
            weeklyBattlesSchedule.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No battles scheduled for this week.</p>';
            return;
        }

        // Create the table structure
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
        battles.forEach(battle => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${battle.id}</td>
                <td>${battle.army1}</td>
                <td class="vs-cell">VS</td>
                <td>${battle.army2}</td>
                <td class="status-cell">${battle.outcome}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        weeklyBattlesSchedule.appendChild(table);
    }

    // --- Initialize ---
    window.addEventListener('resize', resizeCanvas);
    loadData(); // Start loading data and rendering
});