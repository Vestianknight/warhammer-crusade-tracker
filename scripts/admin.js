// admin.js
// This script handles the password protection for the admin page.

document.addEventListener('DOMContentLoaded', async () => { // Made async to await version fetch
    const passwordOverlay = document.getElementById('admin-password-overlay');
    const passwordInput = document.getElementById('admin-password-input');
    const passwordSubmit = document.getElementById('admin-password-submit');
    const adminContent = document.getElementById('admin-content');
    const backToHomeOverlayBtn = document.getElementById('back-to-home-from-admin-overlay');
    const backToHomeContentBtn = document.getElementById('back-to-home-from-admin-content');


    const CORRECT_PASSWORD = "1234"; // Admin password

    let currentAppVersion = '0.0.0'; // Initialize with a placeholder or very old version

    // --- Auto-Refresh Logic (Moved and modified for correct initialization) ---
    const VERSION_CHECK_INTERVAL = 5000; // Check every 5 seconds (for development)

    async function initializeVersion() {
        try {
            const response = await fetch(`data/version.json?t=${new Date().getTime()}`);
            const data = await response.json();
            currentAppVersion = data.version; // Set currentAppVersion based on loaded file
            console.log(`Admin: Initial app version loaded: ${currentAppVersion}`);
        } catch (error) {
            console.error('Admin: Error loading initial app version:', error);
            // Fallback if version.json cannot be loaded
            currentAppVersion = 'fallback-version';
        }
    }

    async function checkAppVersion() {
        try {
            const response = await fetch(`data/version.json?t=${new Date().getTime()}`);
            const data = await response.json();
            const latestVersion = data.version;

            if (latestVersion !== currentAppVersion) {
                console.log(`Admin: New version detected! Old: ${currentAppVersion}, New: ${latestVersion}. Reloading page...`);
                alert("A new version of the Crusade Tracker is available! The page will now refresh.");
                window.location.reload(true); // Force a hard reload from the server
            }
        } catch (error) {
            console.error('Admin: Error checking app version:', error);
        }
    }

    // Call initializeVersion immediately on DOMContentLoaded
    await initializeVersion();
    // Start periodic version check only after currentAppVersion is initialized
    setInterval(checkAppVersion, VERSION_CHECK_INTERVAL);


    // --- Password Protection Logic ---
    // Check if elements exist before adding listeners (important for robustness)
    if (passwordOverlay && passwordInput && passwordSubmit && adminContent) {
        // Initially show the overlay
        passwordOverlay.classList.remove('hidden');
        adminContent.style.display = 'none'; // Hide content until authenticated

        passwordSubmit.addEventListener('click', () => {
            if (passwordInput.value === CORRECT_PASSWORD) {
                passwordOverlay.classList.add('hidden');
                adminContent.style.display = 'block'; // Show content
                passwordInput.value = ''; // Clear password field
                // Call the function from admin_data.js to load and render army data
                if (window.loadAdminArmies) {
                    window.loadAdminArmies();
                } else {
                    console.error('Admin: loadAdminArmies function not found. Is admin_data.js loaded correctly?');
                }
            } else {
                alert("Incorrect password. Access denied.");
                passwordInput.value = ''; // Clear password field
            }
        });

    adminPasswordSubmit.addEventListener('click', checkPassword);
    adminPasswordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            checkPassword();
        }
    });

    backToHomeOverlayBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    if (backToHomeContentBtn) {
        backToHomeContentBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; // Redirect to the home page
        });
    }
});
