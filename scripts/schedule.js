// --- Global Data Storage (no longer dependent on Firebase) ---
let armiesData = [];
let planetsData = [];
let factionsData = [];
let scheduleData = []; // Assuming you might add a schedule.json later

// --- Fetch Data Functions ---
async function fetchArmiesDataForSchedule() {
    try {
        const response = await fetch('data/armies.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        armiesData = await response.json();
        console.log("Schedule: Armies data loaded:", armiesData);
    } catch (error) {
        console.error("Schedule: Error fetching armies data:", error);
        document.getElementById('weekly-battles-schedule').innerHTML = '<p style="color: var(--warning-red);">Failed to load army data for schedule.</p>';
    }
}

async function fetchFactionsDataForSchedule() {
    try {
        const response = await fetch('data/factions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        factionsData = await response.json();
        console.log("Schedule: Factions data loaded:", factionsData);
    } catch (error) {
        console.error("Schedule: Error fetching factions data:", error);
    }
}

async function fetchPlanetsDataForSchedule() {
    try {
        const response = await fetch('data/planets.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        planetsData = await response.json();
        console.log("Schedule: Planets data loaded:", planetsData);
    } catch (error) {
        console.error("Schedule: Error fetching planets data:", error);
    }
}

// Assuming you might have a schedule.json file for battle events
async function fetchScheduleData() {
    try {
        const response = await fetch('data/schedule.json'); // You'll need to create this file
        if (!response.ok) {
            console.warn("Schedule: data/schedule.json not found or could not be loaded. This is expected if you don't have one yet.");
            scheduleData = []; // No schedule data
            return;
        }
        scheduleData = await response.json();
        console.log("Schedule data loaded:", scheduleData);
    } catch (error) {
        console.error("Schedule: Error fetching schedule data:", error);
        scheduleData = []; // Ensure it's empty on error
    }
}

async function fetchAllScheduleData() {
    await Promise.all([
        fetchArmiesDataForSchedule(),
        fetchFactionsDataForSchedule(),
        fetchPlanetsDataForSchedule(),
        fetchScheduleData() // Fetch schedule.json
    ]);
    // After all data is loaded, render the schedule
    populateArmyFilterForSchedule();
    renderSectorAuspex();
    renderWeeklyBattlesSchedule();
}

// --- Rendering Functions ---

let auspexInterval; // To store the interval ID for clearing later

function renderSectorAuspex() {
    const canvas = document.getElementById('sector-auspex-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 400; // Set a fixed width
    canvas.height = 400; // Set a fixed height

    // Clear any previous animation interval
    if (auspexInterval) {
        clearInterval(auspexInterval);
    }

    // Helper to redraw static auspex elements
    function renderSectorAuspexBase() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear to draw background
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Auspex scan lines
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // Green lines
        ctx.lineWidth = 1;

        // Draw concentric circles
        for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, i * 40, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw horizontal and vertical lines
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        // Draw planets
        planetsData.forEach(planet => {
            // Use actual planet positions if they exist in your JSON, otherwise this remains random
            // For now, let's make positions consistent once chosen
            const seed = (planet.id.charCodeAt(0) + planet.id.charCodeAt(1)) / 2; // Simple pseudo-random from ID
            const x = canvas.width / 2 + (Math.sin(seed * 100) * 0.4 + (seed % 0.5)) * (canvas.width / 2 - 50);
            const y = canvas.height / 2 + (Math.cos(seed * 100) * 0.4 + (seed % 0.5)) * (canvas.height / 2 - 50);


            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            const controllingFaction = factionsData.find(f => String(f.id) === String(planet.controlling_faction)); // Robust comparison
            ctx.fillStyle = controllingFaction ? controllingFaction.color : 'gray'; // Use faction color
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Add text for planet name
            ctx.fillStyle = 'white';
            ctx.font = '10px Inter';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(planet.name, x + 8, y);
        });
    }

    // Draw the initial static elements
    renderSectorAuspexBase();

    // Draw a rotating radar sweep (simple animation)
    let angle = 0;
    auspexInterval = setInterval(() => {
        renderSectorAuspexBase(); // Redraw static elements with planets

        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        ctx.lineTo(
            canvas.width / 2 + Math.cos(angle) * (canvas.width / 2),
            canvas.height / 2 + Math.sin(angle) * (canvas.height / 2)
        );
        ctx.stroke();
        angle += 0.05; // Adjust speed
    }, 50);
}


function populateArmyFilterForSchedule() {
    const armyFilterSelect = document.getElementById('battle-army-filter');
    armyFilterSelect.innerHTML = '<option value="all">All Armies</option>'; // Always start with "All Armies"

    armiesData.forEach(army => {
        const option = document.createElement('option');
        option.value = army.id;
        option.textContent = army.name;
        armyFilterSelect.appendChild(option);
    });

    armyFilterSelect.addEventListener('change', (event) => {
        renderWeeklyBattlesSchedule(event.target.value);
    });
}

function renderWeeklyBattlesSchedule(filterArmyId = 'all') {
    const scheduleContainer = document.getElementById('weekly-battles-schedule');
    scheduleContainer.innerHTML = ''; // Clear existing content

    if (scheduleData.length === 0) {
        scheduleContainer.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No scheduled battles found.</p>';
        return;
    }

    let filteredSchedule = scheduleData;
    if (filterArmyId !== 'all') {
        filteredSchedule = scheduleData.filter(battle =>
            battle.armies_involved.includes(String(filterArmyId)) // Robust comparison
        );
    }

    if (filteredSchedule.length === 0) {
        scheduleContainer.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No scheduled battles for the selected army.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'schedule-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Location</th>
                <th>Armies Involved</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector('tbody');

    filteredSchedule.forEach(battle => {
        const row = document.createElement('tr');
        const armiesNames = battle.armies_involved.map(armyId => {
            const army = armiesData.find(a => String(a.id) === String(armyId)); // Robust comparison
            return army ? army.name : `[Unknown Army: ${armyId}]`;
        }).join(', ');

        const locationName = planetsData.find(p => String(p.id) === String(battle.location))?.name || battle.location; // Robust comparison

        row.innerHTML = `
            <td>${battle.date}</td>
            <td>${battle.event_name}</td>
            <td>${locationName}</td>
            <td>${armiesNames}</td>
            <td>${battle.status}</td>
        `;
        tbody.appendChild(row);
    });

    scheduleContainer.appendChild(table);
}


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', fetchAllScheduleData);
