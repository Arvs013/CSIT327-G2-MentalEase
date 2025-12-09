document.addEventListener("DOMContentLoaded", function () {
    const moodIcons = document.querySelectorAll(".mood-icon");
    const moodHistoryList = document.getElementById("moodHistoryList");
    const chartCanvas = document.getElementById("moodChart");

    // Return early if chart canvas does not exist
    if (!chartCanvas) return;

    const ctx = chartCanvas.getContext("2d");
    let moodChart = null;

    // Load saved moods from localStorage
    let moodData = JSON.parse(localStorage.getItem("moodData")) || [];

    // Load moods from Supabase and sync with localStorage
    async function loadMoodsFromAPI() {
        try {
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

            const response = await fetch('/students/api/moods/');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.moods && data.moods.length > 0) {
                    // Convert Supabase moods to localStorage format
                    const apiMoods = data.moods.map(mood => {
                        // Use created_at instead of date
                        const dateStr = mood.created_at || mood.date || '';
                        let dateOnly = dateStr;
                        if (dateStr.includes('T')) {
                            dateOnly = dateStr.split('T')[0];
                        }
                        
                        // Map mood_text and mood_value to our format
                        const moodText = mood.mood_text || mood.mood || '';
                        const moodKey = moodText.toLowerCase();
                        const moodInfo = moodMap[moodKey] || { 
                            emoji: '😐', 
                            score: mood.mood_value !== undefined ? mood.mood_value : 5, 
                            color: '#9ca3af' 
                        };
                        
                        return {
                            date: dateOnly,
                            mood: moodText || 'Neutral',
                            emoji: moodInfo.emoji,
                            score: mood.mood_value !== undefined ? mood.mood_value : moodInfo.score,
                            color: moodInfo.color
                        };
                    });

                    // Merge with localStorage (API takes precedence)
                    const localMoods = JSON.parse(localStorage.getItem("moodData")) || [];
                    const mergedMoods = [...apiMoods];
                    
                    // Add local moods that don't exist in API (by date)
                    localMoods.forEach(localMood => {
                        const localDate = localMood.date.includes('T') ? localMood.date.split('T')[0] : localMood.date;
                        const exists = mergedMoods.some(apiMood => {
                            const apiDate = apiMood.date.includes('T') ? apiMood.date.split('T')[0] : apiMood.date;
                            return apiDate === localDate;
                        });
                        if (!exists) {
                            mergedMoods.push(localMood);
                        }
                    });

                    moodData = mergedMoods;
                    localStorage.setItem("moodData", JSON.stringify(moodData));
                    updateMoodHistory();
                    if (moodData.length > 0) updateChart();
                }
            }
        } catch (error) {
            console.error('Error loading moods from API:', error);
            // Continue with localStorage data if API fails
        }
    }

    // Load moods from API on page load
    loadMoodsFromAPI();

    // Migrate existing localStorage moods to Supabase (one-time)
    async function migrateLocalMoodsToSupabase() {
        const localMoods = JSON.parse(localStorage.getItem("moodData")) || [];
        if (localMoods.length === 0) return;

        // Check if migration has been done
        if (localStorage.getItem("moodsMigrated") === "true") return;

        try {
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

            // Migrate each mood entry
            for (const mood of localMoods) {
                const moodKey = mood.mood ? mood.mood.toLowerCase() : 'neutral';
                const moodInfo = moodMap[moodKey] || moodMap.neutral;
                
                let dateStr = mood.date;
                if (!dateStr.includes('T') && !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Convert from MM/DD/YYYY or other format to YYYY-MM-DD
                    try {
                        const date = new Date(dateStr);
                        dateStr = date.toISOString().split('T')[0];
                    } catch (e) {
                        continue; // Skip invalid dates
                    }
                }

                await fetch('/students/api/moods/save/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        mood: mood.mood || 'Neutral',
                        mood_emoji: mood.emoji || moodInfo.emoji,
                        score: mood.score !== undefined ? mood.score : moodInfo.score,
                        date: dateStr + 'T00:00:00Z' // Format as ISO datetime for created_at
                    })
                });
            }

            // Mark migration as done
            localStorage.setItem("moodsMigrated", "true");
            console.log('Moods migrated to Supabase');
        } catch (error) {
            console.error('Error migrating moods:', error);
        }
    }

    // Run migration after a short delay
    setTimeout(() => {
        migrateLocalMoodsToSupabase();
    }, 1000);

    // Mood mapping
    const moodMap = {
        ecstatic: { emoji: "🤩", score: 10, color: "#fde047" },
        amazing: { emoji: "🥳", score: 9, color: "#facc15" },
        happy: { emoji: "😊", score: 8, color: "#a3e635" },
        calm: { emoji: "😌", score: 7, color: "#4ade80" },
        neutral: { emoji: "😐", score: 5, color: "#9ca3af" },
        tired: { emoji: "🥱", score: 4, color: "#fcd34d" },
        stressed: { emoji: "😤", score: 3, color: "#f97316" },
        anxious: { emoji: "😰", score: 2, color: "#f87171" },
        sad: { emoji: "😔", score: 1, color: "#60a5fa" },
        awful: { emoji: "😭", score: 0, color: "#3b82f6" }
    };

    // Format date for display
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Check if it's today
            if (date.toDateString() === today.toDateString()) {
                return "Today";
            }
            // Check if it's yesterday
            if (date.toDateString() === yesterday.toDateString()) {
                return "Yesterday";
            }
            
            // Format as MM/DD/YYYY
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
        } catch (e) {
            // If date parsing fails, return the original string
            return dateString;
        }
    }

    // Update mood history
    function updateMoodHistory() {
        moodHistoryList.innerHTML = "";
        if (moodData.length === 0) {
            const emptyLi = document.createElement("li");
            emptyLi.className = "empty-state";
            emptyLi.innerHTML = '<span style="color: #9ca3af; font-style: italic; width: 100%; text-align: center; display: block; padding: 1rem;">No mood entries yet. Start tracking your mood!</span>';
            moodHistoryList.appendChild(emptyLi);
            return;
        }

        // Sort by date (most recent first) and limit to last 10 entries
        const sortedData = moodData
            .slice()
            .sort((a, b) => {
                try {
                    return new Date(b.date) - new Date(a.date);
                } catch (e) {
                    return 0;
                }
            })
            .slice(0, 10);

        sortedData.forEach((entry, index) => {
            const li = document.createElement("li");
            
            const entryDiv = document.createElement("div");
            entryDiv.className = "mood-history-entry";
            
            const dateSpan = document.createElement("span");
            dateSpan.className = "mood-history-date";
            dateSpan.textContent = formatDate(entry.date);
            
            const emojiSpan = document.createElement("span");
            emojiSpan.className = "mood-history-emoji";
            emojiSpan.textContent = entry.emoji;
            
            const moodSpan = document.createElement("span");
            moodSpan.className = "mood-history-mood";
            moodSpan.textContent = entry.mood;
            
            entryDiv.appendChild(dateSpan);
            entryDiv.appendChild(emojiSpan);
            entryDiv.appendChild(moodSpan);
            
            li.appendChild(entryDiv);
            moodHistoryList.appendChild(li);
        });
    }

    // Update chart
    function updateChart() {
        if (moodData.length === 0) {
            if (moodChart) {
                moodChart.destroy();
                moodChart = null;
            }
            return;
        }

        // Sort by date
        const sortedData = moodData.slice().sort((a, b) => {
            try {
                return new Date(a.date) - new Date(b.date);
            } catch (e) {
                return 0;
            }
        });

        const labels = sortedData.map(m => {
            const date = new Date(m.date);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${month}/${day}`;
        });
        const scores = sortedData.map(m => m.score);
        const colors = sortedData.map(m => m.color);

        if (!moodChart) {
            moodChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Mood Level',
                        data: scores,
                        fill: true,
                        borderColor: '#9333ea',
                        backgroundColor: 'rgba(147, 51, 234, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointBackgroundColor: colors,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointHoverBackgroundColor: colors,
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: false 
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            callbacks: {
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const mood = sortedData[index].mood;
                                    return `Mood: ${mood} (${context.parsed.y}/10)`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            min: 0, 
                            max: 10, 
                            ticks: { 
                                stepSize: 1,
                                font: {
                                    size: 11
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            ticks: {
                                font: {
                                    size: 11
                                },
                                maxRotation: 45,
                                minRotation: 45
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        } else {
            moodChart.data.labels = labels;
            moodChart.data.datasets[0].data = scores;
            moodChart.data.datasets[0].pointBackgroundColor = colors;
            moodChart.update('active');
        }
    }

    // Handle mood clicks
    moodIcons.forEach(icon => {
        icon.addEventListener("click", function () {
            moodIcons.forEach(i => i.classList.remove("selected"));
            this.classList.add("selected");

            const moodKey = this.getAttribute("data-mood");
            const moodInfo = moodMap[moodKey];
            const today = new Date().toLocaleDateString();

            // Check if today already has an entry and replace it
            const existingIndex = moodData.findIndex(e => e.date === today);
            const newEntry = {
                date: today,
                mood: moodKey.charAt(0).toUpperCase() + moodKey.slice(1),
                emoji: moodInfo.emoji,
                score: moodInfo.score,
                color: moodInfo.color
            };

            if (existingIndex >= 0) {
                moodData[existingIndex] = newEntry;
            } else {
                moodData.push(newEntry);
            }

            localStorage.setItem("moodData", JSON.stringify(moodData));
            updateMoodHistory();
            updateChart();
        });
    });

    // Save Mood Button Handler
    const saveMoodBtn = document.getElementById('saveMoodBtn');
    const moodMessage = document.getElementById('moodMessage');
    
    if (saveMoodBtn) {
        saveMoodBtn.addEventListener('click', async function() {
            const selectedMood = document.querySelector('.mood-icon.selected');
            if (!selectedMood) {
                if (moodMessage) {
                    moodMessage.innerHTML = `
                        <span class="mood-feedback-icon">⚠️</span>
                        <span class="mood-feedback-text">Please select a mood first</span>
                    `;
                    moodMessage.className = 'mood-feedback error show';
                    setTimeout(() => {
                        moodMessage.classList.remove('show');
                        setTimeout(() => {
                            moodMessage.style.display = 'none';
                            moodMessage.innerHTML = '';
                        }, 400);
                    }, 3000);
                }
                return;
            }

            const moodKey = selectedMood.getAttribute('data-mood');
            const moodInfo = moodMap[moodKey];
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Disable button
            saveMoodBtn.disabled = true;
            saveMoodBtn.textContent = 'Saving...';

            try {
                // Get CSRF token
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

                // Save to Supabase
                const response = await fetch('/students/api/moods/save/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        mood: moodKey.charAt(0).toUpperCase() + moodKey.slice(1),
                        mood_emoji: moodInfo.emoji,
                        score: moodInfo.score,
                        date: today + 'T00:00:00Z' // Format as ISO datetime for created_at
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Also save to localStorage for immediate UI update
                    const existingIndex = moodData.findIndex(e => {
                        const entryDate = e.date.includes('T') ? e.date.split('T')[0] : e.date;
                        return entryDate === today;
                    });
                    
                    const newEntry = {
                        date: today,
                        mood: moodKey.charAt(0).toUpperCase() + moodKey.slice(1),
                        emoji: moodInfo.emoji,
                        score: moodInfo.score,
                        color: moodInfo.color
                    };

                    if (existingIndex >= 0) {
                        moodData[existingIndex] = newEntry;
                    } else {
                        moodData.push(newEntry);
                    }

                    localStorage.setItem("moodData", JSON.stringify(moodData));
                    updateMoodHistory();
                    updateChart();

                    // Show success message with icon
                    if (moodMessage) {
                        moodMessage.innerHTML = `
                            <span class="mood-feedback-icon">✨</span>
                            <span class="mood-feedback-text">Mood saved successfully!</span>
                        `;
                        moodMessage.className = 'mood-feedback success show';
                        setTimeout(() => {
                            moodMessage.classList.remove('show');
                            setTimeout(() => {
                                moodMessage.style.display = 'none';
                                moodMessage.innerHTML = '';
                            }, 400);
                        }, 3000);
                    }

                    // Reset button
                    saveMoodBtn.disabled = false;
                    saveMoodBtn.textContent = 'Save Mood Entry';
                } else {
                    throw new Error(data.error || 'Failed to save mood');
                }
            } catch (error) {
                console.error('Error saving mood:', error);
                if (moodMessage) {
                    moodMessage.innerHTML = `
                        <span class="mood-feedback-icon">❌</span>
                        <span class="mood-feedback-text">Failed to save mood: ${error.message}</span>
                    `;
                    moodMessage.className = 'mood-feedback error show';
                    setTimeout(() => {
                        moodMessage.classList.remove('show');
                        setTimeout(() => {
                            moodMessage.style.display = 'none';
                            moodMessage.innerHTML = '';
                        }, 400);
                    }, 4000);
                }
                saveMoodBtn.disabled = false;
                saveMoodBtn.textContent = 'Save Mood Entry';
            }
        });
    }

    // Initial load
    updateMoodHistory();
    if (moodData.length > 0) updateChart();
});
