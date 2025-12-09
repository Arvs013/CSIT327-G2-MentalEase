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

async function updateStatistics() {
    try {
        // Fetch journal count
        const journalResponse = await fetch('/students/api/journals/');
        if (journalResponse.ok) {
            const journalData = await journalResponse.json();
            if (journalData.success && journalData.journals) {
                if (journalCount) journalCount.textContent = journalData.journals.length;
            } else {
                if (journalCount) journalCount.textContent = '0';
            }
        } else {
            if (journalCount) journalCount.textContent = '0';
        }
    } catch (error) {
        console.error('Error fetching journal count:', error);
        if (journalCount) journalCount.textContent = '0';
    }

    try {
        // Fetch mood entries - try both URL patterns
        let moodResponse = await fetch('/students/api/moods/');
        if (!moodResponse.ok) {
            // Try without /students/ prefix
            moodResponse = await fetch('/api/moods/');
        }
        
        if (moodResponse.ok) {
            const moodData = await moodResponse.json();
            console.log('Mood data received:', moodData); // Debug log
            if (moodData.success && moodData.moods) {
                const moods = moodData.moods;
                console.log('Mood entries:', moods); // Debug log
                if (moodCount) moodCount.textContent = moods.length;
                
                // Calculate streak from mood entries
                if (streakCount) {
                    const streak = calculateStreak(moods);
                    console.log('Calculated streak:', streak); // Debug log
                    streakCount.textContent = streak;
                }
            } else {
                console.log('No moods in response or success=false:', moodData); // Debug log
                if (moodCount) moodCount.textContent = '0';
                if (streakCount) streakCount.textContent = '0';
            }
        } else {
            console.error('Mood API response not OK:', moodResponse.status, moodResponse.statusText);
            if (moodCount) moodCount.textContent = '0';
            if (streakCount) streakCount.textContent = '0';
        }
    } catch (error) {
        console.error('Error fetching mood count:', error);
        if (moodCount) moodCount.textContent = '0';
        if (streakCount) streakCount.textContent = '0';
    }
}

function calculateStreak(moodEntries) {
    if (!moodEntries || moodEntries.length === 0) {
        console.log('No mood entries for streak calculation');
        return 0;
    }

    // Extract unique dates from mood entries
    const dates = new Set();
    moodEntries.forEach(entry => {
        // Use created_at (Supabase schema) or fallback to date/timestamp
        const dateStr = entry.created_at || entry.date || entry.timestamp;
        if (dateStr) {
            // Extract just the date part (YYYY-MM-DD)
            let dateOnly = dateStr;
            if (dateStr.includes('T')) {
                dateOnly = dateStr.split('T')[0];
            } else if (dateStr.includes(' ')) {
                dateOnly = dateStr.split(' ')[0];
            }
            // Remove any timezone info
            dateOnly = dateOnly.split('+')[0].split('Z')[0];
            dates.add(dateOnly);
        }
    });

    console.log('Unique dates extracted:', Array.from(dates)); // Debug log

    if (dates.size === 0) return 0;

    // Convert to Date objects and sort in descending order (most recent first)
    const dateObjects = Array.from(dates).map(d => {
        const date = new Date(d + 'T00:00:00');
        date.setHours(0, 0, 0, 0);
        return date;
    }).sort((a, b) => b - a); // Descending order
    
    console.log('Sorted date objects:', dateObjects.map(d => d.toISOString().split('T')[0])); // Debug log
    
    // Calculate streak - consecutive days starting from today
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start checking from today, going backwards day by day
    let checkDate = new Date(today);
    
    // Keep checking consecutive days until we find a gap
    while (true) {
        // Check if there's an entry for checkDate
        const hasEntry = dateObjects.some(dateObj => {
            return dateObj.getTime() === checkDate.getTime();
        });
        
        if (hasEntry) {
            streak++;
            // Move to previous day
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // No entry for this day, streak ends
            break;
        }
        
        // Safety check to prevent infinite loop
        if (streak > 365) break;
    }

    console.log('Final streak:', streak); // Debug log
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

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
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

        // Disable button and show loading state
        const submitBtn = passwordForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Changing...';

        try {
            const response = await fetch('/api/change-password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    current_password: current,
                    new_password: newPass,
                    confirm_password: confirm
                })
            });

            const data = await response.json();

            if (data.success) {
                passwordMessage.textContent = data.message || 'Password changed successfully!';
                passwordMessage.classList.add('show', 'success');
                passwordMessage.classList.remove('error');

                // Reset form after success
                setTimeout(() => {
                    passwordModal.classList.remove('show');
                    passwordMessage.classList.remove('show');
                    passwordForm.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }, 2000);
            } else {
                passwordMessage.textContent = data.error || 'Failed to change password.';
                passwordMessage.classList.add('show', 'error');
                passwordMessage.classList.remove('success');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        } catch (error) {
            console.error('Error changing password:', error);
            passwordMessage.textContent = 'An error occurred. Please try again.';
            passwordMessage.classList.add('show', 'error');
            passwordMessage.classList.remove('success');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}

// ===== Initialize =====
window.addEventListener('load', () => {
    updateStatistics();
});
