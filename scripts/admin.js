// Password protection logic for the admin page
document.addEventListener('DOMContentLoaded', () => {
    const adminPasswordOverlay = document.getElementById('admin-password-overlay');
    const adminPasswordInput = document.getElementById('admin-password-input');
    const adminPasswordSubmit = document.getElementById('admin-password-submit');
    const adminContent = document.getElementById('admin-content');
    const backToHomeOverlayBtn = document.getElementById('back-to-home-from-admin-overlay');
    const backToHomeContentBtn = document.getElementById('back-to-home-from-admin-content');

    const correctPassword = "1234"; // Simple client-side password

    // Hide admin content by default until password is entered
    adminContent.style.display = 'none';
    adminPasswordOverlay.style.display = 'flex'; // Show overlay

    const checkPassword = () => {
        if (adminPasswordInput.value === correctPassword) {
            adminPasswordOverlay.style.display = 'none';
            adminContent.style.display = 'block';
            console.log("Admin password correct. Access granted.");
        } else {
            alert("Incorrect password. Please try again.");
            adminPasswordInput.value = ''; // Clear input
        }
    };

    adminPasswordSubmit.addEventListener('click', checkPassword);
    adminPasswordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            checkPassword();
        }
    });

    backToHomeOverlayBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    backToHomeContentBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});