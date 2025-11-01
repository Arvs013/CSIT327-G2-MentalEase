// ===== Profile Dropdown =====
const profilePic = document.getElementById('profilePic');
const profileDropdown = document.getElementById('profileDropdown');

profilePic.addEventListener('click', () => profileDropdown.classList.toggle('show'));
window.addEventListener('click', (e) => {
    if (!profilePic.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('show');
    }
});

// ===== Email Modal =====
const openModalBtn = document.getElementById('openModalBtn');
const emailModal = document.getElementById('emailModal');
const closeModalBtn = document.getElementById('closeModalBtn');

openModalBtn.addEventListener('click', () => emailModal.classList.add('show'));
closeModalBtn.addEventListener('click', () => emailModal.classList.remove('show'));
window.addEventListener('click', (e) => {
    if (e.target === emailModal) emailModal.classList.remove('show');
});

// ===== Mood Selection =====
const moodIcons = document.querySelectorAll('.mood-icon');
let selectedMood = null;

moodIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        moodIcons.forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
        selectedMood = icon.dataset.mood;
    });
});

const saveMoodBtn = document.getElementById('saveMoodBtn');
const moodMessage = document.getElementById('moodMessage');

saveMoodBtn.addEventListener('click', () => {
    if(selectedMood) {
        moodMessage.style.display = 'block';
        moodMessage.textContent = `Mood "${selectedMood}" saved successfully!`;
        setTimeout(() => moodMessage.style.display = 'none', 2000);
    } else {
        moodMessage.style.display = 'block';
        moodMessage.textContent = 'Please select a mood first.';
        setTimeout(() => moodMessage.style.display = 'none', 2000);
    }
});
