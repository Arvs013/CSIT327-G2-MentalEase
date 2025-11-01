// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  // Profile Dropdown
  const profilePic = document.getElementById('profilePic');
  const profileDropdown = document.getElementById('profileDropdown');
  if (profilePic && profileDropdown) {
    profilePic.addEventListener('click', () => {
      profileDropdown.style.display = profileDropdown.style.display === 'flex' ? 'none' : 'flex';
    });
    window.addEventListener('click', e => {
      if (!profilePic.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.style.display = 'none';
      }
    });
  }

  // Email modal
  const emailModal = document.getElementById('emailModal');
  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (openModalBtn) openModalBtn.addEventListener('click', () => { emailModal.style.display = 'block'; });
  if (closeModalBtn) closeModalBtn.addEventListener('click', () => { emailModal.style.display = 'none'; });
  window.addEventListener('click', e => {
    if (e.target === emailModal) emailModal.style.display = 'none';
  });

  // Mood selection
  const moodIcons = document.querySelectorAll('.mood-icon');
  let selectedMood = null;
  moodIcons.forEach(icon => {
    icon.addEventListener('click', () => {
      moodIcons.forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');
      selectedMood = icon.dataset.mood;
    });
  });

  // Mood History & Chart (in-memory)
  const moodHistoryList = document.getElementById('moodHistoryList');
  let moodHistory = [];

  // Simple bar chart (DOM-based)
  const moodBarChart = document.getElementById('moodBarChart');
  const daysOfWeek = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let weeklyMoods = []; // [{ day, mood, score }]

  function renderMoodHistory() {
    moodHistoryList.innerHTML = '';
    moodHistory.slice().reverse().forEach(entry => {
      const li = document.createElement('li');
      li.textContent = `${entry.date} ${entry.moodEmoji} ${entry.mood}`;
      moodHistoryList.appendChild(li);
    });
  }

  // Mood score map for bar heights
  const moodScores = {
    ecstatic: 10, amazing: 9, happy: 8, calm: 7,
    neutral: 5, tired: 4, stressed: 3, anxious: 2,
    sad: 1, awful: 0
  };

  const emojiMap = {
    ecstatic: '🤩', amazing: '🥳', happy: '😊',
    calm: '😌', neutral: '😐', tired: '🥱',
    stressed: '😤', anxious: '😰', sad: '😔', awful: '😭'
  };

  // Save mood button
  document.getElementById('saveMoodBtn').addEventListener('click', () => {
    if (!selectedMood) return alert('Select a mood first!');
    const now = new Date();
    const moodEntry = {
      mood: selectedMood,
      moodEmoji: emojiMap[selectedMood],
      date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString(),
      score: moodScores[selectedMood]
    };
    moodHistory.push(moodEntry);

    // Update mood history UI
    renderMoodHistory();

    // Update weekly moods bar
    addMoodToWeekly(selectedMood);

    // Simple user feedback
    const moodMessage = document.getElementById('moodMessage');
    if (moodMessage) {
      moodMessage.style.display = 'block';
      setTimeout(() => { moodMessage.style.display = 'none'; }, 1500);
    }

    // Reset selection visual (optional)
    moodIcons.forEach(i => i.classList.remove('selected'));
    selectedMood = null;
  });

  // Bar chart handling
  function addMoodToWeekly(mood) {
    const dayIndex = new Date().getDay(); // 0 (Sun) - 6 (Sat)
    const day = daysOfWeek[(dayIndex + 6) % 7]; // map to Mon..Sun
    const score = moodScores[mood];

    const existingIndex = weeklyMoods.findIndex(w => w.day === day);
    if (existingIndex >= 0) {
      weeklyMoods[existingIndex] = { day, mood, score };
    } else {
      weeklyMoods.push({ day, mood, score });
    }

    // Keep only one entry per day in order Mon..Sun
    weeklyMoods = daysOfWeek.map(d => weeklyMoods.find(w => w.day === d) || null).filter(x => x);

    renderBarChart();
  }

  function renderBarChart() {
    if (!moodBarChart) return;
    moodBarChart.innerHTML = '';
    weeklyMoods.forEach(entry => {
      const bar = document.createElement('div');
      bar.style.width = '20px';
      bar.style.margin = '0 6px';
      bar.style.backgroundColor = '#7e22ce';
      bar.style.height = `${(entry.score || 0) * 20}px`;
      bar.style.borderRadius = '4px 4px 0 0';
      bar.title = `${entry.day}: ${entry.mood} (${entry.score})`;
      moodBarChart.appendChild(bar);
    });
  }

  // Initialize (optional empty state)
  renderMoodHistory();
  renderBarChart();

  // Optional: Journal Save
  const journalBtn = document.querySelector('.journal-action-btn');
  if (journalBtn) {
    journalBtn.addEventListener('click', () => {
      const text = document.querySelector('.journal-textarea').value.trim();
      if (!text) return alert('Write something first!');
      alert('Journal entry saved!');
      document.querySelector('.journal-textarea').value = '';
    });
  }

  // Email form submission (demo)
  const emailForm = document.getElementById('emailChangeForm');
  if (emailForm) {
    emailForm.addEventListener('submit', e => {
      e.preventDefault();
      const newEmail = document.getElementById('newEmailInput').value.trim();
      if (newEmail) {
        const saveMessage = document.getElementById('saveMessage');
        if (saveMessage) saveMessage.innerText = 'Email updated successfully!';
        emailForm.reset();
      }
    });
  }
});

// Sample mood history data (later can be replaced with real Django data)
const moodHistory = [
    { date: "2025-01-01", mood: 8 },
    { date: "2025-01-02", mood: 6 },
    { date: "2025-01-03", mood: 4 },
    { date: "2025-01-04", mood: 9 },
    { date: "2025-01-05", mood: 3 },
    { date: "2025-01-06", mood: 7 },
    { date: "2025-01-07", mood: 5 }
];

const moodLabels = moodHistory.map(entry => entry.date);
const moodValues = moodHistory.map(entry => entry.mood);

// Create chart
const ctx = document.getElementById('moodChart').getContext('2d');
const moodChart = new Chart(ctx, {
    type: 'line', // can change to 'bar'
    data: {
        labels: moodLabels,
        datasets: [{
            label: 'Mood Level (1-10)',
            data: moodValues,
            borderWidth: 3,
            tension: 0.4,
            fill: true
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                max: 10
            }
        }
    }
});

