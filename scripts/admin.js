document.addEventListener('DOMContentLoaded', () => {
    // --- Admin Global Data Variables ---
    let armiesData = []; // Will store a copy of the armies data
    const CORRECT_ADMIN_PASSWORD = "1234"; // Admin password

    // --- DOM Elements ---
    const passwordOverlay = document.getElementById('password-overlay');
    const adminPasswordInput = document.getElementById('admin-password-input');
    const adminPasswordSubmit = document.getElementById('admin-password-submit');
    const passwordErrorMessage = document.getElementById('password-error-message');
    const adminContent = document.getElementById('admin-content');

    const adminArmySelect = document.getElementById('admin-army-select');
    const armyEditForm = document.getElementById('army-edit-form');
    const editArmyName = document.getElementById('edit-army-name');
    const editCrusadePoints = document.getElementById('edit-crusade-points');
    const editBattlesPlayed = document.getElementById('edit-battles-played');
    const editVictories = document.getElementById('edit-victories');
    const saveArmyChangesBtn = document.getElementById('save-army-changes');

    // --- Password Authentication Logic ---
    adminPasswordSubmit.addEventListener('click', () => {
        if (adminPasswordInput.value === CORRECT_ADMIN_PASSWORD) {
            passwordOverlay.classList.add('hidden');
            adminContent.classList.remove('hidden');
            initializeAdminPanel(); // Initialize admin panel after successful login
        } else {
            passwordErrorMessage.classList.remove('hidden');
            adminPasswordInput.value = ''; // Clear input on error
        }
    });

    adminPasswordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            adminPasswordSubmit.click(); // Trigger button click on Enter key
        }
    });

    // --- Main Admin Panel Initialization ---
    async function initializeAdminPanel() {
        console.log("Admin Panel Initialized!");

        try {
            const armiesRes = await fetch('data/armies.json'); // Fetch armies data
            armiesData = await armiesRes.json();
            console.log('Armies data loaded for admin:', armiesData);

            populateArmySelect(armiesData);

            // Set up event listener for army selection
            adminArmySelect.addEventListener('change', (event) => {
                const selectedArmyId = event.target.value;
                displayArmyForEditing(selectedArmyId);
            });

            // The 'save-army-changes' button functionality will be added later.
            // For now, it won't do anything.
            // saveArmyChangesBtn.addEventListener('click', saveArmyChanges);

        } catch (error) {
            console.error('Error loading armies data for admin:', error);
            adminContent.innerHTML = `<p style="color: red; text-align: center;">
                                        Failed to load army data for admin.
                                    </p>`;
        }
    }

    // --- Populate Army Selection Dropdown ---
    function populateArmySelect(armies) {
        adminArmySelect.innerHTML = '<option value="">-- Select an Army --</option>'; // Reset dropdown
        armies.forEach(army => {
            const option = document.createElement('option');
            option.value = army.id;
            option.textContent = `${army.name} (${army.faction})`;
            adminArmySelect.appendChild(option);
        });
    }

    // --- Display Selected Army's Data for Editing ---
    function displayArmyForEditing(armyId) {
        if (!armyId) {
            armyEditForm.classList.add('hidden'); // Hide form if no army selected
            return;
        }

        const army = armiesData.find(a => a.id === armyId);
        if (army) {
            editArmyName.textContent = army.name;
            editCrusadePoints.value = army.crusade_points;
            editBattlesPlayed.value = army.battles_played;
            editVictories.value = army.victories;
            armyEditForm.classList.remove('hidden'); // Show the form
        } else {
            console.warn(`Army with ID '${armyId}' not found.`);
            armyEditForm.classList.add('hidden');
        }
    }

    // --- Initial setup (show password overlay) ---
    // The password overlay is visible by default in HTML, so no action needed here.
    // The adminContent is hidden by default in HTML, so no action needed here.
    // The main-content in index.html is controlled by a similar password overlay.
});