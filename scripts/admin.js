document.addEventListener('DOMContentLoaded', () => {
    const passwordOverlay = document.getElementById('admin-password-overlay');
    const passwordInput = document.getElementById('admin-password-input');
    const passwordSubmit = document.getElementById('admin-password-submit');
    const adminContent = document.getElementById('admin-content');

    const backToHomeOverlayBtn = document.getElementById('back-to-home-from-admin-overlay');
    const backToHomeContentBtn = document.getElementById('back-to-home-from-admin-content');


    const CORRECT_PASSWORD = "1234"; // Admin password

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
            } else {
                // Changed alert message color to white for consistency
                alert("Incorrect password. Access denied.");
                passwordInput.value = ''; // Clear password field
            }
        });

        // Allow pressing Enter in the password field
        passwordInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                passwordSubmit.click();
            }
        });
    }

    // Add event listeners for the new "Back to Home" buttons
    if (backToHomeOverlayBtn) {
        backToHomeOverlayBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; // Redirect to the home page
        });
    }

    if (backToHomeContentBtn) {
        backToHomeContentBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; // Redirect to the home page
        });
    }


    // Auto-Refresh Logic (copied from main.js to keep admin.html updated)
    let currentAppVersion = '1.0.0'; // Default initial version (matches version.json)
    const VERSION_CHECK_INTERVAL = 5000; // Check every 5 seconds (for development)

    async function checkAppVersion() {
        try {
            // Add a cache-busting parameter to ensure we always get the latest version.json
            const response = await fetch(`data/version.json?t=${new Date().getTime()}`);
            const data = await response.json();
            const latestVersion = data.version;

            if (latestVersion !== currentAppVersion) {
                console.log(`New version detected! Old: ${currentAppVersion}, New: ${latestVersion}. Reloading page...`);
                alert("A new version of the Crusade Tracker is available! The page will now refresh.");
                window.location.reload(true); // Force a hard reload from the server
            }
        } catch (error) {
            console.error('Error checking app version:', error);
        }
    }

    // Start periodic version check for the admin page
    setInterval(checkAppVersion, VERSION_CHECK_INTERVAL);
});
