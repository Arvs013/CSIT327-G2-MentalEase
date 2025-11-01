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

    // Update mood history
    function updateMoodHistory() {
        moodHistoryList.innerHTML = "";
        if (moodData.length === 0) {
            moodHistoryList.innerHTML = "<li>No mood entries yet.</li>";
            return;
        }

        moodData.slice().reverse().forEach(entry => {
            const li = document.createElement("li");
            li.textContent = `${entry.date} — ${entry.emoji} ${entry.mood}`;
            moodHistoryList.appendChild(li);
        });
    }

    // Update chart
    function updateChart() {
        const labels = moodData.map(m => m.date);
        const scores = moodData.map(m => m.score);
        const colors = moodData.map(m => m.color);

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
                        backgroundColor: 'rgba(147,51,234,0.1)',
                        tension: 0.3,
                        pointBackgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { min: 0, max: 10, ticks: { stepSize: 1 } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        } else {
            moodChart.data.labels = labels;
            moodChart.data.datasets[0].data = scores;
            moodChart.data.datasets[0].pointBackgroundColor = colors;
            moodChart.update();
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

    // Initial load
    updateMoodHistory();
    if (moodData.length > 0) updateChart();
});
