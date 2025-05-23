// admin_data.js
// This script handles the display and persistent updates of army data on the admin page using Firestore.

document.addEventListener('DOMContentLoaded', () => {
    const armyAdminList = document.getElementById('army-admin-list');
    let db; // Firestore instance
    let auth; // Auth instance
    let userId = null; // Current user ID
    let currentArmiesData = []; // Local cache of armies data

    // Reference to Firebase modules exposed by the HTML script
    const { initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } = window.firebase;
    const appId = window.__app_id;
    const firebaseConfig = window.__firebase_config;
    const initialAuthToken = window.__initial_auth_token;

    // --- Firebase Initialization and Authentication ---
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            console.log("Admin: Authenticated with user ID:", userId);
            // After authentication, load armies data
            await seedInitialArmiesData(); // Ensure initial data is seeded if necessary
            loadAdminArmies(); // Start listening for real-time updates
        } else {
            // User is signed out, or not yet signed in. Sign in anonymously if no custom token.
            // This ensures we always have a userId for Firestore paths.
            if (initialAuthToken) {
                try {
                    await signInWithCustomToken(auth, initialAuthToken);
                    console.log("Admin: Signed in with custom token.");
                } catch (error) {
                    console.error("Admin: Error signing in with custom token:", error);
                    alert("Authentication failed. Please try again.");
                }
            } else {
                try {
                    await signInAnonymously(auth);
                    console.log("Admin: Signed in anonymously.");
                } catch (error) {
                    console.error("Admin: Error signing in anonymously:", error);
                    alert("Anonymous authentication failed. Please try again.");
                }
            }
        }
    });

    /**
     * Seeds initial army data from armies.json to Firestore if the collection is empty.
     * This ensures the app has data on first run.
     */
    async function seedInitialArmiesData() {
        if (!userId) {
            console.warn("Admin: Cannot seed data, userId not available.");
            return;
        }
        const armiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/armies`);
        const existingDocs = await getDocs(armiesCollectionRef);

        if (existingDocs.empty) {
            console.log("Admin: Armies collection is empty. Seeding initial data from armies.json...");
            try {
                const response = await fetch('data/armies.json');
                const initialArmies = await response.json();

                for (const army of initialArmies) {
                    // Use setDoc to explicitly set document ID, ensuring consistency
                    await setDoc(doc(armiesCollectionRef, army.id), army);
                }
                console.log("Admin: Initial armies data seeded successfully.");
            } catch (error) {
                console.error("Admin: Error seeding initial armies data:", error);
            }
        } else {
            console.log("Admin: Armies collection already contains data. Skipping seeding.");
        }
    }

    /**
     * Fetches army data from Firestore using onSnapshot for real-time updates.
     */
    function loadAdminArmies() {
        if (!userId) {
            console.warn("Admin: Cannot load armies, userId not available.");
            return;
        }

        const armiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/armies`);

        // Set up real-time listener
        onSnapshot(armiesCollectionRef, (snapshot) => {
            currentArmiesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderArmyAdminList(currentArmiesData);
            console.log('Admin: Armies data updated from Firestore.', currentArmiesData);
        }, (error) => {
            console.error('Admin: Error listening to armies data:', error);
            armyAdminList.innerHTML = '<p style="color: white; text-align: center;">Failed to load army data from database.</p>';
        });
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
     * Handles saving changes for a specific army to Firestore.
     * @param {Event} event - The click event from the save button.
     */
    async function handleSaveArmy(event) {
        if (!userId) {
            alert("Authentication not ready. Please wait a moment and try again.");
            return;
        }

        const armyId = event.target.dataset.armyId;
        const armyToUpdateRef = doc(db, `artifacts/${appId}/users/${userId}/armies`, armyId);

        try {
            const updatedData = {
                crusade_points: parseInt(document.getElementById(`crusade_points_${armyId}`).value, 10),
                battles_played: parseInt(document.getElementById(`battles_played_${armyId}`).value, 10),
                victories: parseInt(document.getElementById(`victories_${armyId}`).value, 10),
                notes: document.getElementById(`notes_${armyId}`).value
            };

            // Use setDoc with merge: true to update only specified fields
            await setDoc(armyToUpdateRef, updatedData, { merge: true });
            console.log(`Admin: Changes for army ${armyId} saved to Firestore.`);
            alert(`Changes for army ${armyId} saved!`);
        } catch (error) {
            console.error(`Admin: Error saving changes for army ${armyId}:`, error);
            alert(`Failed to save changes for army ${armyId}.`);
        }
    }

    // Expose loadAdminArmies to be called by admin.js after password authentication
    // This is a legacy call; with onAuthStateChanged, it will load automatically.
    // However, keeping it for compatibility if admin.js still calls it.
    window.loadAdminArmies = loadAdminArmies;
});