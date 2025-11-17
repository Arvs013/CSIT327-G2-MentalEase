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

// ===== Statistics =====
const journalCount = document.getElementById('journalCount');
const moodCount = document.getElementById('moodCount');
const streakCount = document.getElementById('streakCount');

function updateStatistics() {
    const journalEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
    const moodHistory = JSON.parse(localStorage.getItem('moodHistory')) || [];

    if (journalCount) journalCount.textContent = journalEntries.length;
    if (moodCount) moodCount.textContent = moodHistory.length;
    if (streakCount) streakCount.textContent = calculateStreak(moodHistory);
}

function calculateStreak(moodHistory) {
    if (moodHistory.length === 0) return 0;

    const sorted = [...moodHistory].sort((a, b) => b.timestamp - a.timestamp);
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let entry of sorted) {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((currentDate - entryDate) / (1000 * 60 * 60 * 24));

        if (dayDiff === streak) streak++;
        else if (dayDiff > streak) break;
    }
    return streak;
}

// ===== Edit Username Modal =====
const editUsernameBtn = document.getElementById('editUsernameBtn');
const usernameModal = document.getElementById('usernameModal');
const closeUsernameModal = document.getElementById('closeUsernameModal');
const usernameForm = document.getElementById('usernameForm');
const usernameInput = document.getElementById('usernameInput');
const usernameDisplay = document.getElementById('usernameDisplay');
const usernameMessage = document.getElementById('usernameMessage');

if (editUsernameBtn) {
    editUsernameBtn.addEventListener('click', () => {
        usernameInput.value = usernameDisplay.textContent;
        usernameModal.classList.add('show');
    });
}

if (closeUsernameModal) {
    closeUsernameModal.addEventListener('click', () => {
        usernameModal.classList.remove('show');
        usernameMessage.classList.remove('show');
    });
}

if (usernameModal) {
    window.addEventListener('click', (e) => {
        if (e.target === usernameModal) {
            usernameModal.classList.remove('show');
            usernameMessage.classList.remove('show');
        }
    });
}

if (usernameForm) {
    usernameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUsername = usernameInput.value.trim();

        if (newUsername) {
            usernameDisplay.textContent = newUsername;
            usernameMessage.textContent = 'Username updated successfully!';
            usernameMessage.classList.add('show', 'success');
            usernameMessage.classList.remove('error');

            setTimeout(() => {
                usernameModal.classList.remove('show');
                usernameMessage.classList.remove('show');
            }, 2000);
        } else {
            usernameMessage.textContent = 'Please enter a valid username.';
            usernameMessage.classList.add('show', 'error');
            usernameMessage.classList.remove('success');
        }
    });
}

// ===== Edit Email Modal =====
const editEmailBtn = document.getElementById('editEmailBtn');
const emailModal = document.getElementById('emailModal');
const closeEmailModal = document.getElementById('closeEmailModal');
const emailForm = document.getElementById('emailForm');
const emailInput = document.getElementById('emailInput');
const emailDisplay = document.getElementById('emailDisplay');
const emailMessage = document.getElementById('emailMessage');
const openModalBtn = document.getElementById('openModalBtn');
const saveMessage = document.getElementById('saveMessage');

if (editEmailBtn) {
    editEmailBtn.addEventListener('click', () => {
        const currentEmail = emailDisplay.textContent;
        emailInput.value = currentEmail !== 'Not set' ? currentEmail : '';
        emailModal.classList.add('show');
    });
}

if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
        emailModal.classList.add('show');
        profileDropdown.classList.remove('show');
    });
}

if (closeEmailModal) {
    closeEmailModal.addEventListener('click', () => {
        emailModal.classList.remove('show');
        emailMessage.classList.remove('show');
        saveMessage.textContent = '';
    });
}

if (emailModal) {
    window.addEventListener('click', (e) => {
        if (e.target === emailModal) {
            emailModal.classList.remove('show');
            emailMessage.classList.remove('show');
            saveMessage.textContent = '';
        }
    });
}

if (emailForm) {
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newEmail = emailInput.value.trim();

        if (newEmail) {
            emailDisplay.textContent = newEmail;
            emailMessage.textContent = 'Email updated successfully!';
            emailMessage.classList.add('show', 'success');
            emailMessage.classList.remove('error');

            saveMessage.textContent = 'Confirmation email sent!';

            setTimeout(() => {
                emailModal.classList.remove('show');
                emailMessage.classList.remove('show');
                saveMessage.textContent = '';
                emailForm.reset();
            }, 2000);
        } else {
            emailMessage.textContent = 'Please enter a valid email address.';
            emailMessage.classList.add('show', 'error');
            emailMessage.classList.remove('success');
        }
    });
}

// ===== Change Password Modal =====
const changePasswordBtn = document.getElementById('changePasswordBtn');
const passwordModal = document.getElementById('passwordModal');
const closePasswordModal = document.getElementById('closePasswordModal');
const passwordForm = document.getElementById('passwordForm');
const passwordMessage = document.getElementById('passwordMessage');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');

if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
        passwordModal.classList.add('show');
    });
}

if (closePasswordModal) {
    closePasswordModal.addEventListener('click', () => {
        passwordModal.classList.remove('show');
        passwordMessage.classList.remove('show');
        passwordForm.reset();
    });
}

if (passwordModal) {
    window.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            passwordModal.classList.remove('show');
            passwordMessage.classList.remove('show');
            passwordForm.reset();
        }
    });
}

if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const current = currentPassword.value;
        const newPass = newPassword.value;
        const confirm = confirmPassword.value;

        if (!current || !newPass || !confirm) {
            passwordMessage.textContent = 'Please fill in all fields.';
            passwordMessage.classList.add('show', 'error');
            passwordMessage.classList.remove('success');
            return;
        }

        if (newPass !== confirm) {
            passwordMessage.textContent = 'New passwords do not match.';
            passwordMessage.classList.add('show', 'error');
            passwordMessage.classList.remove('success');
            return;
        }

        if (newPass.length < 6) {
            passwordMessage.textContent = 'Password must be at least 6 characters.';
            passwordMessage.classList.add('show', 'error');
            passwordMessage.classList.remove('success');
            return;
        }

        passwordMessage.textContent = 'Password changed successfully!';
        passwordMessage.classList.add('show', 'success');
        passwordMessage.classList.remove('error');

        setTimeout(() => {
            passwordModal.classList.remove('show');
            passwordMessage.classList.remove('show');
            passwordForm.reset();
        }, 2000);
    });
}

// ===== Initialize =====
window.addEventListener('load', () => {
    updateStatistics();
});
