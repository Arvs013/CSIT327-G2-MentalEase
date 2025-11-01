document.addEventListener('DOMContentLoaded', () => {
    // --- Profile Dropdown ---
    const profilePic = document.getElementById('profilePic');
    const profileDropdown = document.getElementById('profileDropdown');
    profilePic.addEventListener('click', () => {
        profileDropdown.style.display = profileDropdown.style.display === 'flex' ? 'none' : 'flex';
    });
    window.addEventListener('click', e => {
        if (!profilePic.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
        }
    });

    // --- Email Modal ---
    const emailModal = document.getElementById('emailModal');
    document.getElementById('openModalBtn').addEventListener('click', () => emailModal.style.display = 'block');
    document.getElementById('closeModalBtn').addEventListener('click', () => emailModal.style.display = 'none');
    window.addEventListener('click', e => { if(e.target === emailModal) emailModal.style.display = 'none'; });

    // --- Mood Selection ---
    const moodIcons = document.querySelectorAll('.mood-icon');
    let selectedMood = null;
    moodIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            moodIcons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
            selectedMood = icon.dataset.mood;
        });
    });

    // --- Mood History ---
    const moodHistoryList = document.getElementById('moodHistoryList');
    let moodHistory = [];

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

    const moodBarChart = document.getElementById('moodBarChart');
    const daysOfWeek = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let weeklyMoods = [];

    function renderMoodHistory() {
        moodHistoryList.innerHTML = '';
        moodHistory.slice().reverse().forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `${entry.date} ${entry.moodEmoji} ${entry.mood}`;
            moodHistoryList.appendChild(li);
        });
    }

    function renderBarChart() {
        moodBarChart.innerHTML = '';
        weeklyMoods.forEach(entry => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `${(entry.score || 0) * 15}px`;
            bar.title = `${entry.day}: ${entry.mood} (${entry.score})`;
            moodBarChart.appendChild(bar);
        });
    }

    document.getElementById('saveMoodBtn').addEventListener('click', () => {
        if(!selectedMood) return alert('Select a mood first!');
        const now = new Date();
        const moodEntry = {
            mood: selectedMood,
            moodEmoji: emojiMap[selectedMood],
            date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString(),
            score: moodScores[selectedMood]
        };
        moodHistory.push(moodEntry);

        // Update History & Bar Chart
        renderMoodHistory();
        const dayIndex = (now.getDay() + 6) % 7; 
        const day = daysOfWeek[dayIndex];
        const existingIndex = weeklyMoods.findIndex(w => w.day === day);
        if(existingIndex >= 0) weeklyMoods[existingIndex] = {day, mood: selectedMood, score: moodScores[selectedMood]};
        else weeklyMoods.push({day, mood: selectedMood, score: moodScores[selectedMood]});
        weeklyMoods = daysOfWeek.map(d => weeklyMoods.find(w => w.day === d) || null).filter(x => x);
        renderBarChart();

        // Feedback & Reset
        const msg = document.getElementById('moodMessage');
        msg.style.display = 'block';
        setTimeout(()=>msg.style.display='none',1500);
        moodIcons.forEach(i=>i.classList.remove('selected'));
        selectedMood = null;
    });

    // --- Journal ---
    const journalBtn = document.querySelector('.journal-action-btn');
    journalBtn.addEventListener('click', () => {
        const text = document.querySelector('.journal-textarea').value.trim();
        if(!text) return alert('Write something first!');
        alert('Journal entry saved!');
        document.querySelector('.journal-textarea').value = '';
    });

    // --- Email form ---
    const emailForm = document.getElementById('emailChangeForm');
    emailForm.addEventListener('submit', e=>{
        e.preventDefault();
        const newEmail = document.getElementById('newEmailInput').value.trim();
        if(newEmail){
            document.getElementById('saveMessage').innerText='Email updated successfully!';
            emailForm.reset();
        }
    });

    // --- Chart.js Line Chart ---
    const moodChartCtx = document.getElementById('moodChart').getContext('2d');
    const moodChart = new Chart(moodChartCtx,{
        type:'line',
        data:{labels:[], datasets:[{label:'Mood Level', data:[], borderWidth:3, tension:0.4, fill:true}]},
        options:{scales:{y:{beginAtZero:true, max:10}}}
    });
});
