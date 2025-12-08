// Navbar JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Hamburger Menu Toggle
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navbarMenu = document.getElementById('navbarMenu');
    
    if (hamburgerBtn && navbarMenu) {
        hamburgerBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            navbarMenu.classList.toggle('active');
        });
    }
    
    // Dropdown Toggles
    const getHelpToggle = document.getElementById('getHelpToggle');
    const getHelpMenu = document.getElementById('getHelpMenu');
    const profileToggle = document.getElementById('profileToggle');
    const profileMenu = document.getElementById('profileMenu');
    const profileWrapper = profileToggle ? profileToggle.closest('.profile-dropdown-wrapper') : null;
    
    // Get Help Dropdown
    if (getHelpToggle && getHelpMenu) {
        const dropdownWrapper = getHelpToggle.closest('.dropdown-wrapper');
        
        getHelpToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownWrapper.classList.toggle('active');
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (!dropdownWrapper.contains(e.target)) {
                dropdownWrapper.classList.remove('active');
            }
        });
    }
    
    // Profile Dropdown
    if (profileToggle && profileMenu && profileWrapper) {
        profileToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            profileWrapper.classList.toggle('active');
            
            // Close Get Help dropdown if open
            if (getHelpMenu) {
                const getHelpWrapper = getHelpMenu.closest('.dropdown-wrapper');
                if (getHelpWrapper) {
                    getHelpWrapper.classList.remove('active');
                }
            }
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileWrapper.contains(e.target)) {
                profileWrapper.classList.remove('active');
            }
        });
    }
    
    // Close dropdowns on window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            if (navbarMenu) navbarMenu.classList.remove('active');
            if (hamburgerBtn) hamburgerBtn.classList.remove('active');
        }
    });
});

