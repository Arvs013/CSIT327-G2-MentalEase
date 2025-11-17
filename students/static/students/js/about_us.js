// ===== Profile Dropdown =====
const profilePic = document.getElementById('profilePic');
const profileDropdown = document.getElementById('profileDropdown');

if (profilePic && profileDropdown) {
    profilePic.addEventListener('click', function(e) {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });

    window.addEventListener('click', function(e) {
        if (!profilePic.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });
}