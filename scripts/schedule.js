document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('sector-auspex-canvas');
    const ctx = canvas.getContext('2d');
    const shipInfoPopup = document.getElementById('ship-info-popup');
    const weeklyBattlesSchedule = document.getElementById('weekly-battles-schedule');

    let planetsData = [];
    let armiesData = [];
    let planet1Image = new Image();
    const loadedShipImages = {}; // Cache for generic ship images
    let activeShips = []; // To store ship positions and data for interaction

    // Generic placeholder ship image URL
    // Using a simple SVG for a generic ship icon
    const GENERIC_SHIP_IMAGE_URL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2339FF14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rocket"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.75-1.06 1.5-1.9 2-2.5c2.5-.83 4.5-2.5 6-4c1.5-1.5 2.5-3.5 4-6c1.46-1.46 2.02-2.9 2-3s-1.44.56-2.9 2c-2.5 2.5-4.24 4.5-5 6c-1.26 1.5-2 3-2.5 5c-.46.5-.9 1-1.5 1.5z"/><path d="M9 18s1.5 2 2 2s2-1.5 2-2s-1.5-2-2-2s-2 1.5-2 2z"/><path d="M15 9s2-1.5 2-2s-1.5-2-2-2s-2 1.5-2 2s1.5 2 2 2z"/></svg>';

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

            // Load generic ship image once
            loadedShipImages['generic'] = new Image();
            loadedShipImages['generic'].src = GENERIC_SHIP_IMAGE_URL;
            await new Promise(resolve => loadedShipImages['generic'].onload = resolve);

            console.log('Schedule page data loaded:', { planetsData, armiesData });
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
        // Set canvas width to its parent's width and maintain aspect ratio or set a max height
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = Math.min(container.clientWidth * 0.75, 600); // Max height 600px, 4:3 aspect ratio
        renderScene();
    }

    function renderScene() {
        if (!ctx || !planet1Image.complete || !loadedShipImages['generic'].complete) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

        const planet = planetsData.find(p => p.id === 'planet1');
        if (!planet) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const planetRadius = Math.min(canvas.width, canvas.height) * 0.2; // Adjust planet size
        const shipCircleRadius = planetRadius * 1.6; // Distance of ships from planet center
        const shipSize = planetRadius * 0.25; // Size of ship images

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
        const totalArmies = armiesData.length;
        armiesData.forEach((army, index) => {
            const angle = (Math.PI * 2 / totalArmies) * index - (Math.PI / 2); // Start at top, rotate clockwise

            const shipX = centerX + shipCircleRadius * Math.cos(angle);
            const shipY = centerY + shipCircleRadius * Math.sin(angle);

            // Draw line from ship to planet
            ctx.beginPath();
            ctx.moveTo(shipX, shipY);
            // Calculate point on planet edge
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
            const currentShipImage = loadedShipImages['generic'];
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
        shipInfoPopup.style.left = `${x + 10}px`; // Offset from cursor
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
        event.preventDefault(); // Prevent scrolling on touch
        const rect = canvas.getBoundingClientRect();
        const touchX = event.touches[0].clientX - rect.left;
        const touchY = event.touches[0].clientY - rect.top;

        const tappedShip = getShipAtCoordinates(touchX, touchY);

        if (tappedShip) {
            if (hoveredShip && hoveredShip.id === tappedShip.id) {
                // Tapped the same ship again, hide popup
                hoveredShip = null;
                hidePopup();
            } else {
                hoveredShip = tappedShip;
                showPopup(tappedShip, touchX, touchY);
            }
        } else {
            // Tapped outside any ship, hide popup
            hoveredShip = null;
            hidePopup();
        }
    });

    // --- Weekly Battles Schedule ---
    function renderWeeklyBattles() {
        // Example battle data - you would update this with actual campaign data
        const battles = [
            { id: 1, army1: 'Ultramarines (John Doe)', army2: 'Tyranid Swarm (Emily White)', outcome: 'Undecided' },
            { id: 2, army1: 'Death Guard (Mike Johnson)', army2: 'Ork Speedwaaagh! (Jane Smith)', outcome: 'Undecided' },
            { id: 3, army1: 'Adeptus Custodes (Chris Evans)', army2: 'Chaos Space Marines (Ben Carter)', outcome: 'Undecided' },
            { id: 4, army1: 'T\'au Empire (David Miller)', army2: 'Craftworld Iyanden (Sarah Lee)', outcome: 'Undecided' }
        ];

        weeklyBattlesSchedule.innerHTML = ''; // Clear previous content

        if (battles.length === 0) {
            weeklyBattlesSchedule.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No battles scheduled for this week.</p>';
            return;
        }

        battles.forEach(battle => {
            const battleEntry = document.createElement('div');
            battleEntry.classList.add('battle-entry');
            battleEntry.innerHTML = `
                <div class="battle-header">
                    <span class="battle-number">Battle ${battle.id}:</span>
                    <span class="battle-participants">${battle.army1} <span class="vs-text">VS</span> ${battle.army2}</span>
                </div>
                <div class="battle-status">
                    Status: <span class="status-indicator">${battle.outcome}</span>
                </div>
            `;
            weeklyBattlesSchedule.appendChild(battleEntry);
        });
    }

    // --- Initialize ---
    window.addEventListener('resize', resizeCanvas);
    loadData(); // Start loading data and rendering
});