document.addEventListener('DOMContentLoaded', () => {
    // --- Global Data Variables (Accessible to all functions below) ---
    let factionsData = [];
    let armiesData = []; // This will now be populated from Firestore
    let planetsData = [];

    // --- DOM Elements for Sections (only relevant for index.html) ---
    const mainContent = document.getElementById('main-content');
    const factionProgressSection = document.getElementById('faction-progress-section');
    const armyRosterSection = document.getElementById('army-roster-section');
    const planetaryControlSection = document.getElementById('planetary-control-section');
    const resourcesSection = document.getElementById('resources-section');

    const armyListOverview = document.getElementById('army-list-overview');
    const armyDetailPageContainer = document.getElementById('army-detail-page-container');
    const armyDetailContent = document.getElementById('army-detail-content');
    const backToRosterBtn = document.getElementById('back-to-roster-btn');

    // --- Faction Filter Elements (only relevant for index.html) ---
    const factionFilterDropdown = document.getElementById('faction-filter');

    // --- Firebase Variables ---
    let db; // Firestore instance
    let auth; // Auth instance
    let userId = null; // Current user ID
    let isAuthReady = false; // Flag to ensure Firestore operations happen after auth

    // Reference to Firebase modules and global variables exposed by the HTML script
    const { initializeApp, getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } = window.firebase;
    const appId = window.__app_id;
    const firebaseConfig = window.__firebase_config;
    const initialAuthToken = window.__initial_auth_token;

    // --- Firebase Initialization and Authentication ---
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Main: Firebase app initialized.");
    } catch (error) {
        console.error("Main: Error initializing Firebase app:", error);
        console.error("Firebase initialization failed. Check console for details.");
        if (mainContent) {
            mainContent.innerHTML = `<p style="color: white; text-align: center;">
                                        Error initializing Firebase. Please check console for details.
                                    </p>`;
        }
        return;
    }


    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            console.log("Main: Authenticated with user ID:", userId);
            isAuthReady = true;
            initializeCrusadeTracker();
        } else {
            if (initialAuthToken) {
                try {
                    await signInWithCustomToken(auth, initialAuthToken);
                    console.log("Main: Signed in with custom token.");
                } catch (error) {
                    console.error("Main: Error signing in with custom token:", error);
                    console.error("Authentication failed. Check console for details.");
                }
            } else {
                try {
                    await signInAnonymously(auth);
                    console.log("Main: Signed in anonymously.");
                } catch (error) {
                    console.error("Main: Error signing in anonymously:", error);
                    console.error("Anonymous authentication failed. Check console for details.");
                }
            }
        }
    });


    // --- Helper for generating consistent colors for armies ---
    const colors = [
        '#FF6384', // Red
        '#36A2EB', // Blue
        '#FFCE56', // Yellow
        '#4BC0C0', // Teal
        '#9966FF', // Purple
        '#FF9F40', // Orange
        '#C9CBCF', // Grey
        '#6A8B82', // Green-Grey
        '#E6B0AA', // Light Brown
        '#D2B4DE', // Lavender
        '#A9CCE3', // Light Blue
        '#FADBD8'  // Light Pink
    ];
    let colorIndex = 0;
    function getNextColor() {
        const color = colors[colorIndex % colors.length];
        colorIndex++;
        return color;
    }

    // --- Router Function (only for internal index.html views) ---
    function router() {
        const hash = window.location.hash;
        console.log('Current hash:', hash);

        if (factionProgressSection && armyRosterSection && planetaryControlSection && resourcesSection) {
            factionProgressSection.classList.add('hidden');
            armyRosterSection.classList.add('hidden');
            planetaryControlSection.classList.add('hidden');
            resourcesSection.classList.add('hidden');

            armyListOverview.classList.remove('hidden');
            armyDetailPageContainer.classList.add('hidden');
            armyDetailContent.innerHTML = '';

            if (hash.startsWith('#army-')) {
                const armyId = hash.substring(6);
                renderArmyDetailPage(armyId);
                armyRosterSection.classList.remove('hidden');
            } else {
                factionProgressSection.classList.remove('hidden');
                armyRosterSection.classList.remove('hidden');
                planetaryControlSection.classList.remove('hidden');
                resourcesSection.classList.remove('hidden');
                filterArmies(factionFilterDropdown.value);
            }
        }
    }

    // --- Auto-Refresh Logic ---
    let currentAppVersion = null;
    const VERSION_CHECK_INTERVAL = 30000; // Increased to 30 seconds (30000 ms)

    async function checkAppVersion() {
        try {
            const response = await fetch(`data/version.json?t=${new Date().getTime()}`);
            const data = await response.json();
            const latestVersion = data.version;

            if (currentAppVersion !== null && latestVersion !== currentAppVersion) {
                console.log(`New version detected! Old: ${currentAppVersion}, New: ${latestVersion}. Reloading page...`);
                setTimeout(() => {
                    alert("A new version of the Crusade Tracker is available! The page will now refresh.");
                    window.location.reload(true);
                }, 100);
            } else if (currentAppVersion === null) {
                currentAppVersion = latestVersion;
                console.log(`Initial app version set to: ${currentAppVersion}`);
            }
        } catch (error) {
            console.error('Error checking app version:', error);
        }
    }

    // --- Main Application Initialization (only for index.html) ---
    async function initializeCrusadeTracker() {
        console.log("Crusade Tracker Initialized!");

        if (!isAuthReady) {
            console.log("Main: Authentication not ready, retrying initializeCrusadeTracker...");
            return;
        }

        try {
            const [factionsRes, planetsRes, versionRes] = await Promise.all([
                fetch('data/factions.json'),
                fetch('data/planets.json'),
                fetch('data/version.json')
            ]);

            factionsData = await factionsRes.json();
            planetsData = await planetsRes.json();
            currentAppVersion = (await versionRes.json()).version;
            console.log(`Main: Initial version loaded from file: ${currentAppVersion}`);


            const armiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/armies`);
            onSnapshot(armiesCollectionRef, (snapshot) => {
                armiesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('Main: Armies data updated from Firestore.', armiesData);

                populateFactionFilter(factionsData);
                renderFactionChart(factionsData, armiesData);
                renderPlanets(planetsData);
                router();
            }, (error) => {
                console.error('Main: Error listening to armies data from Firestore:', error);
                if (mainContent) {
                    mainContent.innerHTML = `<p style="color: white; text-align: center;">
                                                Failed to load army data from database. Check console for details.
                                            </p>`;
                }
            });

            window.addEventListener('hashchange', router);

            if (factionFilterDropdown) {
                factionFilterDropdown.addEventListener('change', (event) => {
                    filterArmies(event.target.value);
                });
            }

            if (backToRosterBtn) {
                backToRosterBtn.addEventListener('click', () => {
                    window.location.hash = '';
                });
            }

            setInterval(checkAppVersion, VERSION_CHECK_INTERVAL);

        } catch (error) {
            console.error('Error loading static data or setting up Firestore listener:', error);
            if (mainContent) {
                mainContent.innerHTML = `<p style="color: white; text-align: center;">
                                            Failed to load campaign data. Please check the data files and database connection.
                                        </p>`;
            }
        }
    }

    // --- Faction Filter Logic ---
    function populateFactionFilter(factions) {
        if (!factionFilterDropdown) return;
        factionFilterDropdown.innerHTML = '<option value="all">All Factions</option>';
        factions.forEach(faction => {
            const option = document.createElement('option');
            option.value = faction.name;
            option.textContent = faction.name;
            factionFilterDropdown.appendChild(option);
        });
    }

    function filterArmies(selectedFaction) {
        let filtered = armiesData;
        if (selectedFaction !== 'all') {
            filtered = armiesData.filter(army => army.faction === selectedFaction);
        }
        renderArmyListOverview(filtered);
    }


    // --- Faction Progress Stacked Bar Graph ---
    function renderFactionChart(factions, armies) {
        const ctx = document.getElementById('factionBarChart');
        if (!ctx) return;

        const factionLabels = factions.map(f => f.name);
        const factionIndexMap = new Map(factionLabels.map((name, index) => [name, index]));

        const datasets = [];
        const armyColors = new Map();

        armies.forEach(army => {
            if (!armyColors.has(army.id)) {
                armyColors.set(army.id, getNextColor());
            }
            const armyColor = armyColors.get(army.id);

            const data = new Array(factionLabels.length).fill(0);
            const factionIndex = factionIndexMap.get(army.faction);
            if (factionIndex !== undefined) {
                data[factionIndex] = army.crusade_points;
            }

            datasets.push({
                label: army.name,
                data: data,
                backgroundColor: armyColor,
                borderColor: 'rgba(255, 255, 255, 0.6)',
                borderWidth: 1
            });
        });

        if (Chart.getChart(ctx)) {
            Chart.getChart(ctx).destroy();
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: factionLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        max: 400,
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'white',
                            boxWidth: 20,
                            padding: 10
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        borderColor: 'white',
                        borderWidth: 1,
                        titleColor: 'white',
                        bodyColor: 'white',
                        callbacks: {
                            title: function(context) {
                                if (context.length > 0) {
                                    return context[0].label;
                                }
                                return '';
                            },
                            label: function(context) {
                                const hoveredFaction = context.label;
                                const armyName = context.dataset.label;
                                const army = armies.find(a => a.name === armyName && a.faction === hoveredFaction);
                                if (army) {
                                    return `${army.name}: ${army.crusade_points} Crusade Points`;
                                }
                                return '';
                            },
                            filter: function(tooltipItem) {
                                const hoveredFaction = tooltipItem.label;
                                const armyName = tooltipItem.dataset.label;
                                const army = armies.find(a => a.name === armyName && a.faction === hoveredFaction);
                                return !!army;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Army List Overview (main page) ---
    function renderArmyListOverview(armiesToRender) {
        if (!armyListOverview) return;

        armyListOverview.innerHTML = '';
        armyListOverview.classList.remove('hidden');
        armyDetailPageContainer.classList.add('hidden');
        armyDetailContent.innerHTML = '';

        if (armiesToRender.length === 0) {
            armyListOverview.innerHTML = '<p style="text-align: center; color: white;">No armies found for this filter.</p>';
            return;
        }

        armiesToRender.forEach(army => {
            const armyCard = document.createElement('div');
            armyCard.classList.add('army-card');
            armyCard.dataset.armyId = army.id;

            armyCard.innerHTML = `
                <div class="army-card-header">
                    <h3>${army.name}</h3>
                </div>
                <p><strong>Faction:</strong> ${army.faction}</p>
                <p>${army.description ? army.description.substring(0, 100) + '...' : 'No description.'}</p>
                <button class="view-button" data-army-id="${army.id}">View Details</button>
            `;
            armyCard.querySelector('.view-button').addEventListener('click', (e) => {
                const armyId = e.target.dataset.armyId;
                window.location.hash = `#army-${armyId}`;
            });
            armyListOverview.appendChild(armyCard);
        });
    }

    // --- Army Detail Page ---
    function renderArmyDetailPage(armyId) {
        if (!armyDetailContent || !armyListOverview || !armyDetailPageContainer) return;

        const army = armiesData.find(a => a.id === armyId);
        if (!army) {
            armyDetailContent.innerHTML = `<p style="color: white;">Army not found!</p>`;
            return;
        }

        armyListOverview.classList.add('hidden');
        armyDetailPageContainer.classList.remove('hidden');

        armyDetailContent.innerHTML = `
            <h3>${army.name}</h3>
            <p><strong>Player:</strong> ${army.player}</p>
            <p><strong>Faction:</strong> ${army.faction}</p>
            <p><strong>Description:</strong> ${army.description || 'N/A'}</p>
            <p><strong>Crusade Points:</strong> ${army.crusade_points}</p>
            <p><strong>Battles Played:</strong> ${army.battles_played}</p>
            <p><strong>Victories:</strong> ${army.victories}</p>
            <p><strong>Notes:</strong> ${army.notes || 'N/A'}</p>
        `;

        document.getElementById('back-to-roster-btn').classList.remove('hidden');
    }


    // --- Planetary Control (Planets) ---
    const planetsContainer = document.getElementById('planets-container');
    let currentActivePlanetId = null;

    function renderPlanets(planets) {
        if (!planetsContainer) return;

        planetsContainer.innerHTML = '';
        planetsContainer.classList.remove('single-view');

        const backButton = document.createElement('button');
        backButton.id = 'back-to-planets-btn';
        backButton.classList.add('button', 'back-button', 'hidden');
        backButton.textContent = 'Back to All Planets';
        backButton.addEventListener('click', showAllPlanets);
        planetsContainer.appendChild(backButton);

        planets.forEach(planet => {
            const planetCard = document.createElement('div');
            planetCard.classList.add('planet-card');
            planetCard.dataset.planetId = planet.id;

            const planetImageContainer = document.createElement('div');
            planetImageContainer.classList.add('planet-image-container');

            const planetImage = document.createElement('img');
            planetImage.classList.add('planet-image');
            planetImage.src = planet.image || `images/planet1.png`;
            planetImage.alt = planet.name;

            const totalFactionPercentage = planet.army_control.reduce((sum, ac) => sum + ac.percentage, 0);
            let currentHeight = 0;
            const factionAggregatedControl = {};
            planet.army_control.forEach(ac => {
                const army = armiesData.find(a => a.id === ac.army_id);
                if (army) {
                    factionAggregatedControl[army.faction] = (factionAggregatedControl[army.faction] || 0) + ac.percentage;
                }
            });

            const sortedFactions = Object.keys(factionAggregatedControl).sort();
            sortedFactions.forEach(factionName => {
                const percentage = factionAggregatedControl[factionName];
                const faction = factionsData.find(f => f.name === factionName);
                const color = faction ? `rgba(57, 255, 20, ${0.5 + (factionsData.indexOf(faction) * 0.1)})` : 'rgba(128, 128, 128, 0.5)';

                const segmentDiv = document.createElement('div');
                segmentDiv.classList.add('planet-overlay-segment');
                segmentDiv.style.height = `${(percentage / totalFactionPercentage) * 100}%`;
                segmentDiv.style.backgroundColor = color;
                segmentDiv.style.bottom = `${currentHeight}%`;
                planetImageContainer.appendChild(segmentDiv);
                currentHeight += (percentage / totalFactionPercentage) * 100;
            });

            if (totalFactionPercentage < 100) {
                const remainingHeight = 100 - totalFactionPercentage;
                const baseOverlay = document.createElement('div');
                baseOverlay.classList.add('planet-overlay-segment');
                baseOverlay.style.height = `${remainingHeight}%`;
                baseOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                baseOverlay.style.bottom = `${currentHeight}%`;
                planetImageContainer.appendChild(baseOverlay);
            }

            planetImageContainer.appendChild(planetImage);
            planetCard.appendChild(planetImageContainer);

            const planetInfoShort = document.createElement('div');
            planetInfoShort.classList.add('planet-info-short');
            planetInfoShort.innerHTML = `
                <h3>${planet.name}</h3>
                <p>${planet.description ? planet.description.substring(0, 50) + '...' : 'No description.'}</p>
            `;
            planetCard.appendChild(planetInfoShort);

            const planetDetailContentInCard = document.createElement('div');
            planetDetailContentInCard.classList.add('planet-detail-content-in-card');
            planetCard.appendChild(planetDetailContentInCard);

            planetCard.addEventListener('click', () => {
                if (currentActivePlanetId === planet.id) {
                    showAllPlanets();
                } else {
                    showPlanetDetail(planet.id);
                }
            });

            planetsContainer.appendChild(planetCard);
        });
    }

    function showPlanetDetail(planetId) {
        if (!planetsContainer) return;

        const selectedPlanet = planetsData.find(p => p.id === planetId);
        if (!selectedPlanet) return;

        currentActivePlanetId = planetId;

        document.getElementById('back-to-planets-btn').classList.remove('hidden');

        planetsContainer.classList.add('single-view');

        document.querySelectorAll('.planet-card').forEach(card => {
            const cardId = card.dataset.planetId;

            if (cardId !== planetId) {
                card.classList.add('inactive');
            } else {
                card.classList.remove('inactive');
                card.classList.add('active');

                const detailContentDiv = card.querySelector('.planet-detail-content-in-card');
                const shortInfoDiv = card.querySelector('.planet-info-short');

                if (shortInfoDiv) shortInfoDiv.classList.add('hidden');
                if (detailContentDiv) detailContentDiv.classList.remove('hidden');

                const armyControlHtml = selectedPlanet.army_control.map(ac => {
                    const army = armiesData.find(a => a.id === ac.army_id);
                    return army ? `<p style="color:var(--auspex-green-light);"><strong>${army.name}:</strong> ${ac.percentage}%</p>` : '';
                }).join('');

                const battleInfoHtml = selectedPlanet.battle_reason ? `
                    <div class="battle-info">
                        <h4>Current Battle:</h4>
                        <p>${selectedPlanet.battle_reason}</p>
                    </div>
                ` : '';

                detailContentDiv.innerHTML = `
                    <h3>${selectedPlanet.name}</h3>
                    <p>${selectedPlanet.description || 'N/A'}</p>
                    <div class="control-info">
                        <h4>Army Control:</h4>
                        ${armyControlHtml}
                    </div>
                    ${battleInfoHtml}
                `;
            }
        });
    }

    function showAllPlanets() {
        if (!planetsContainer) return;

        currentActivePlanetId = null;

        document.getElementById('back-to-planets-btn').classList.add('hidden');

        planetsContainer.classList.remove('single-view');

        document.querySelectorAll('.planet-card').forEach(card => {
            card.classList.remove('inactive', 'active');

            const shortInfoDiv = card.querySelector('.planet-info-short');
            const detailContentDiv = card.querySelector('.planet-detail-content-in-card');
            if (shortInfoDiv) shortInfoDiv.classList.remove('hidden');
            if (detailContentDiv) {
                detailContentDiv.classList.add('hidden');
                detailContentDiv.innerHTML = '';
            }
        });
    }
});