// --- Global Data Storage (no longer dependent on Firebase) ---
let armiesData = []; // Will hold army data loaded from JSON
let factionsData = []; // Will hold faction data loaded from JSON

// --- Fetch Data from JSON Files ---
async function fetchArmiesDataForAdmin() {
    try {
        const response = await fetch('data/armies.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        armiesData = await response.json();
        console.log("Admin: Armies data loaded from JSON:", armiesData);
        return armiesData;
    } catch (error) {
        console.error("Admin: Error fetching armies data from JSON:", error);
        document.getElementById('admin-loading-message').innerHTML = '<p style="color: var(--warning-red);">Failed to load army data. Check data/armies.json.</p>';
        return []; // Return empty array on error
    }
}

async function fetchFactionsDataForAdmin() {
    try {
        const response = await fetch('data/factions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        factionsData = await response.json();
        console.log("Admin: Factions data loaded from JSON:", factionsData);
        return factionsData;
    } catch (error) {
        console.error("Admin: Error fetching factions data from JSON:", error);
        return []; // Return empty array on error
    }
}


// --- Render Army Cards for Admin Panel ---
function renderAdminArmyCards() {
    const armyListContainer = document.getElementById('army-admin-list');
    armyListContainer.innerHTML = ''; // Clear existing content

    if (armiesData.length === 0) {
        armyListContainer.innerHTML = '<p style="text-align: center; color: var(--auspex-medium-grey);">No armies found. Check data/armies.json.</p>';
        return;
    }

    armiesData.forEach(army => {
        const factionName = factionsData.find(f => f.id === army.faction)?.name || 'Unknown Faction';
        const card = document.createElement('div');
        card.className = 'army-admin-card';
        card.dataset.armyId = army.id; // Store army ID on the card for easy lookup

        card.innerHTML = `
            <h3>${army.name}</h3>
            <p><strong>Player:</strong> ${army.player}</p>
            <p><strong>Faction:</strong> <span class="math-inline">\{factionName\}</p\>
<label\>CP\: <input type\="number" data\-field\="crusade\_points" value\="</span>{army.crusade_points}"></label>
            <label>Battles: <input type="number" data-field="battles_played" value="<span class="math-inline">\{army\.battles\_played\}"\></label\>
<label\>Victories\: <input type\="number" data\-field\="victories" value\="</span>{army.victories}"></label>
            <label>Notes: <textarea data-field="notes"><span class="math-inline">\{army\.notes \|\| ''\}</textarea\></label\>
<label\>Description\: <textarea data\-field\="description"\></span>{army.description || ''}</textarea></label>
            <button class="button save-changes-btn" data-army-id="${army.id}">Apply Changes (Local Only)</button>
        `;
        armyListContainer.appendChild(card);
    });

    // Attach event listeners to all 'Apply Changes' buttons
    document.querySelectorAll('.save-changes-btn').forEach(button => {
        button.addEventListener('click', handleApplyChangesClick);
    });
}

// --- Handle Changes (Local Only) ---
function handleApplyChangesClick(event) {
    const armyId = event.target.dataset.armyId;
    const armyCard = event.target.closest('.army-admin-card');
    const armyIndex = armiesData.findIndex(army => army.id === armyId);

    if (armyIndex === -1) {
        console.error("Army not found in local data:", armyId);
        return;
    }

    const currentArmy = armiesData[armyIndex];

    // Update local armiesData with new values from inputs
    armyCard.querySelectorAll('input[data-field], textarea[data-field]').forEach(input => {
        const field = input.dataset.field;
        let value = input.value;

        // Convert to number if it's a numeric field
        if (input.type === 'number') {
            value = parseInt(value) || 0;
        }

        currentArmy[field] = value;
    });

    // No actual database save here.