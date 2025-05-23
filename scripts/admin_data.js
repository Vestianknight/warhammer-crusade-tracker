// admin_data.js
// This script handles the display and local updates of army data on the admin page.
// Data is currently managed in memory and does NOT persist across page reloads.

document.addEventListener('DOMContentLoaded', () => {
    const armyAdminList = document.getElementById('army-admin-list');
    let currentArmiesData = []; // Store armies data locally

    /**
     * Fetches army data and renders the editable list.
     */
    async function loadAdminArmies() {
        try {
            const response = await fetch('data/armies.json');
            currentArmiesData = await response.json();
            renderArmyAdminList(currentArmiesData);
            console.log('Admin: Armies data loaded for editing.', currentArmiesData);
        } catch (error) {
            console.error('Admin: Error loading armies data:', error);
            armyAdminList.innerHTML = '<p style="color: white; text-align: center;">Failed to load army data for administration.</p>';
        }
    }

    /**
     * Renders the list of armies with editable fields.
     * @param {Array} armies - The array of army objects.
     */
    function renderArmyAdminList(armies) {
        if (!armyAdminList) return;

        armyAdminList.innerHTML = ''; // Clear previous content

        if (armies.length === 0) {
            armyAdminList.innerHTML = '<p style="text-align: center; color: white;">No armies found to manage.</p>';
            return;
        }

        armies.forEach(army => {
            const armyCard = document.createElement('div');
            armyCard.classList.add('army-admin-card');
            armyCard.dataset.armyId = army.id; // Store army ID for easy lookup

            armyCard.innerHTML = `
                <h3>${army.name} (${army.player})</h3>
                <div class="admin-field-group">
                    <label for="crusade_points_${army.id}">Crusade Points:</label>
                    <input type="number" id="crusade_points_${army.id}" value="${army.crusade_points}" min="0" class="admin-input">
                </div>
                <div class="admin-field-group">
                    <label for="battles_played_${army.id}">Battles Played:</label>
                    <input type="number" id="battles_played_${army.id}" value="${army.battles_played}" min="0" class="admin-input">
                </div>
                <div class="admin-field-group">
                    <label for="victories_${army.id}">Victories:</label>
                    <input type="number" id="victories_${army.id}" value="${army.victories}" min="0" class="admin-input">
                </div>
                <div class="admin-field-group full-width">
                    <label for="notes_${army.id}">Notes:</label>
                    <textarea id="notes_${army.id}" class="admin-textarea">${army.notes || ''}</textarea>
                </div>
                <button class="button save-army-button" data-army-id="${army.id}">Save Changes</button>
            `;
            armyAdminList.appendChild(armyCard);
        });

        // Add event listeners to all save buttons
        document.querySelectorAll('.save-army-button').forEach(button => {
            button.addEventListener('click', handleSaveArmy);
        });
    }

    /**
     * Handles saving changes for a specific army.
     * @param {Event} event - The click event from the save button.
     */
    function handleSaveArmy(event) {
        const armyId = event.target.dataset.armyId;
        const armyIndex = currentArmiesData.findIndex(army => army.id === armyId);

        if (armyIndex === -1) {
            console.error('Admin: Army not found for ID:', armyId);
            return;
        }

        const updatedArmy = { ...currentArmiesData[armyIndex] }; // Create a copy

        // Get updated values from input fields
        updatedArmy.crusade_points = parseInt(document.getElementById(`crusade_points_${armyId}`).value, 10);
        updatedArmy.battles_played = parseInt(document.getElementById(`battles_played_${armyId}`).value, 10);
        updatedArmy.victories = parseInt(document.getElementById(`victories_${armyId}`).value, 10);
        updatedArmy.notes = document.getElementById(`notes_${armyId}`).value;

        // Update the local data array
        currentArmiesData[armyIndex] = updatedArmy;

        console.log('Admin: Locally updated army data:', updatedArmy);
        // In the next step, this is where we'll integrate Firestore save logic.
        alert(`Changes for ${updatedArmy.name} saved locally! (Not persistent yet)`);
    }

    // Expose loadAdminArmies to be called by admin.js after authentication
    window.loadAdminArmies = loadAdminArmies;
});