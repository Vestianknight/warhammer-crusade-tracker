// admin_data.js
// This script handles the display and persistent updates of army data on the admin page using Firestore.

document.addEventListener('DOMContentLoaded', () => {
    const armyAdminList = document.getElementById('army-admin-list');
    const adminLoadingMessage = document.getElementById('admin-loading-message'); // Get the loading message element
    let db; // Firestore instance
    let auth; // Auth instance
    let userId = null; // Current user ID
    let isAuthReady = false; // Flag to ensure Firestore operations happen after auth

    // Reference to Firebase modules exposed by the HTML script
    const { initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } = window.firebase;
    const appId = window.__app_id;
    const firebaseConfig = window.__firebase_config;
    const initialAuthToken = window.__initial_auth_token;

    // --- Firebase Initialization and Authentication ---
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Admin: Firebase app initialized.");
        if (adminLoadingMessage) adminLoadingMessage.textContent = "Authenticating...";
    } catch (error) {
        console.error("Admin: Error initializing Firebase app:", error);
        if (adminLoadingMessage) adminLoadingMessage.textContent = "Error: Firebase initialization failed.";
        alert("Error initializing Firebase. Check console for details.");
        return; // Stop execution if Firebase init fails
    }


    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            console.log("Admin: Authenticated with user ID:", userId);
            isAuthReady = true;
            if (adminLoadingMessage) adminLoadingMessage.textContent = "User authenticated. Seeding data if necessary...";
            // After authentication, load armies data
            await seedInitialArmiesData(); // Ensure initial data is seeded if necessary
            loadAdminArmies(); // Start listening for real-time updates
        } else {
            // User is signed out, or not yet signed in. Sign in anonymously if no custom token.
            if (adminLoadingMessage) adminLoadingMessage.textContent = "Authenticating...";
            if (initialAuthToken) {
                try {
                    await signInWithCustomToken(auth, initialAuthToken);
                    console.log("Admin: Signed in with custom token.");
                } catch (error) {
                    console.error("Admin: Error signing in with custom token:", error);
                    if (adminLoadingMessage) adminLoadingMessage.textContent = "Authentication failed.";
                    alert("Authentication failed. Please try again. Check console for details.");
                }
            } else {
                try {
                    await signInAnonymously(auth);
                    console.log("Admin: Signed in anonymously.");
                } catch (error) {
                    console.error("Admin: Error signing in anonymously:", error);
                    if (adminLoadingMessage) adminLoadingMessage.textContent = "Anonymous authentication failed.";
                    alert("Anonymous authentication failed. Please try again. Check console for details.");
                }
            }
        }
    });

    /**
     * Seeds initial army data from armies.json to Firestore if the collection is empty.
     * This ensures the app has data on first run.
     */
    async function seedInitialArmiesData() {
        if (!userId || !db) {
            console.warn("Admin: Cannot seed data, userId or db not available.");
            return;
        }
        const armiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/armies`);
        try {
            const existingDocs = await getDocs(armiesCollectionRef);

            if (existingDocs.empty) {
                console.log("Admin: Armies collection is empty. Seeding initial data from armies.json...");
                if (adminLoadingMessage) adminLoadingMessage.textContent = "Seeding initial army data...";
                try {
                    const response = await fetch('data/armies.json');
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const initialArmies = await response.json();

                    for (const army of initialArmies) {
                        await setDoc(doc(armiesCollectionRef, army.id), army);
                    }
                    console.log("Admin: Initial armies data seeded successfully.");
                    if (adminLoadingMessage) adminLoadingMessage.textContent = "Initial army data seeded. Loading...";
                } catch (error) {
                    console.error("Admin: Error seeding initial armies data from armies.json:", error);
                    if (adminLoadingMessage) adminLoadingMessage.textContent = `Error seeding data: ${error.message}`;
                    alert(`Error seeding initial data. Check if data/armies.json exists and is valid. Details in console.`);
                }
            } else {
                console.log("Admin: Armies collection already contains data. Skipping seeding.");
                if (adminLoadingMessage) adminLoadingMessage.textContent = "Armies data exists. Loading...";
            }
        } catch (error) {
            console.error("Admin: Error checking existing armies documents:", error);
            if (adminLoadingMessage) adminLoadingMessage.textContent = `Error accessing database: ${error.message}`;
            alert(`Error accessing Firestore to check for existing data. Check security rules and network. Details in console.`);
        }
    }

    /**
     * Fetches army data from Firestore using onSnapshot for real-time updates.
     */
    function loadAdminArmies() {
        if (!userId || !db) {
            console.warn("Admin: Cannot load armies, userId or db not available.");
            if (adminLoadingMessage) adminLoadingMessage.textContent = "Waiting for authentication...";
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
            if (adminLoadingMessage) adminLoadingMessage.classList.add('hidden'); // Hide message once loaded
        }, (error) => {
            console.error('Admin: Error listening to armies data:', error);
            if (adminLoadingMessage) adminLoadingMessage.textContent = `Error loading data: ${error.message}`;
            alert('Error loading army data from database. Check console for details (e.g., security rules).');
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
            armyCard.dataset.armyId = army.id;

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

        document.querySelectorAll('.save-army-button').forEach(button => {
            button.addEventListener('click', handleSaveArmy);
        });
    }

    /**
     * Handles saving changes for a specific army to Firestore.
     * @param {Event} event - The click event from the save button.
     */
    async function handleSaveArmy(event) {
        if (!userId || !db) {
            alert("Database not ready. Please wait a moment and try again.");
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

            await setDoc(armyToUpdateRef, updatedData, { merge: true });
            console.log(`Admin: Changes for army ${armyId} saved to Firestore.`);
            // No alert needed here, as onSnapshot will automatically re-render and show the updated data
        } catch (error) {
            console.error(`Admin: Error saving changes for army ${armyId}:`, error);
            alert(`Failed to save changes for army ${armyId}. Check console for details.`);
        }
    }

    // This function is called by admin.js after password authentication.
    // However, with onAuthStateChanged, the data loading will also trigger automatically
    // once authentication is complete. This function primarily acts as a trigger point
    // after the password is entered, ensuring the UI is ready to display data.
    window.loadAdminArmies = () => {
        // If auth is already ready, it means onAuthStateChanged has already triggered loadAdminArmies().
        // This prevents double-loading if the password is entered after a refresh where auth was already established.
        if (!isAuthReady) {
            if (adminLoadingMessage) adminLoadingMessage.textContent = "Password correct. Initializing data...";
        }
        // The onAuthStateChanged listener will handle the actual data loading.
        // We just ensure the message is set correctly.
    };
});