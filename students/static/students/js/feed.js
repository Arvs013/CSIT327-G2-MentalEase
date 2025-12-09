document.addEventListener("DOMContentLoaded", () => {
    const getCSRFToken = () => {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    };

    // ===== Convert to Philippine Time (PHT/UTC+8) =====
    function formatPhilippineTime(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            let date;
            
            // Handle different datetime formats from Supabase/Django
            // Posts/Comments: datetime.now().isoformat() -> no timezone
            // Since Django USE_TZ=False with TIME_ZONE='Asia/Manila',
            // datetime.now() returns Manila time without timezone info
            // The datetime string is ALREADY in Manila time, so we should display it as-is
            if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
                // No timezone info - this is already Manila time from Django
                // Parse it and format directly without timezone conversion
                const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
                
                if (parts) {
                    const year = parseInt(parts[1]);
                    const month = parseInt(parts[2]) - 1; // JS months are 0-indexed
                    const day = parseInt(parts[3]);
                    const hour = parseInt(parts[4]);
                    const minute = parseInt(parts[5]);
                    const second = parseInt(parts[6]);
                    
                    // Format directly as Manila time without conversion
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                      'July', 'August', 'September', 'October', 'November', 'December'];
                    const monthName = monthNames[month];
                    const period = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                    const displayMinute = minute.toString().padStart(2, '0');
                    
                    return `${monthName} ${day}, ${year}, ${displayHour}:${displayMinute} ${period}`;
                } else {
                    // Fallback: try parsing as-is
                    date = new Date(dateString);
                }
            } else {
                // Has timezone info, parse directly and convert to Manila
                date = new Date(dateString);
            }
            
            // For datetimes with timezone, convert to Manila time
            if (date && !isNaN(date.getTime())) {
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Manila',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                return formatter.format(date);
            }
            
            // Fallback
            if (isNaN(date.getTime())) {
                console.error('Invalid date:', dateString);
                return dateString;
            }
            
            return dateString;
        } catch (e) {
            console.error('Error formatting date:', e, 'Input:', dateString);
            return dateString;
        }
    }

    // Format all post and comment times on page load
    function formatAllTimes() {
        // Format post times
        document.querySelectorAll('.post-time[data-post-time]').forEach(element => {
            const timeString = element.getAttribute('data-post-time');
            if (timeString) {
                element.textContent = formatPhilippineTime(timeString);
            }
        });

        // Format comment times
        document.querySelectorAll('.comment-time[data-comment-time]').forEach(element => {
            const timeString = element.getAttribute('data-comment-time');
            if (timeString) {
                element.textContent = formatPhilippineTime(timeString);
            }
        });
    }

    // Format times on page load
    formatAllTimes();

    // --- Dynamic Delete Handler (with Pop-up Confirmation) ---
    document.querySelectorAll(".btn-delete").forEach(button => {
        button.addEventListener("click", async (e) => {
            e.preventDefault();
            const postId = button.getAttribute("data-post-id");
            
            // The pop-up confirmation you requested
            if (confirm("Are you sure you want to delete this post? This cannot be undone.")) {
                const actionUrl = `/feed/delete/${postId}/`; 
                
                const response = await fetch(actionUrl, {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFToken(),
                        "X-Requested-With": "XMLHttpRequest"
                    },
                });

                if (response.ok) {
                    // Remove the post element from the DOM instantly
                    button.closest(".post").remove();
                    // In a full app, you might want to show a toast notification here
                } else {
                    alert("Failed to delete post or you lack permission.");
                }
            }
        });
    });

    // --- Dynamic In-Place Edit Handlers ---
    document.querySelectorAll(".btn-edit").forEach(button => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            const postElement = button.closest(".post");
            toggleEditMode(postElement, true);
        });
    });

    document.querySelectorAll(".cancel-edit-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            const postElement = button.closest(".post");
            toggleEditMode(postElement, false);
        });
    });

    document.querySelectorAll(".save-edit-btn").forEach(button => {
        button.addEventListener("click", async (e) => {
            const postElement = button.closest(".post");
            const postId = postElement.getAttribute("data-post-id");
            const textarea = postElement.querySelector(".edit-textarea");
            const newContent = textarea.value.trim();

            if (!newContent) {
                alert("Post content cannot be empty.");
                return;
            }

            const actionUrl = `/feed/edit/${postId}/`;

            const response = await fetch(actionUrl, {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCSRFToken(),
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: new URLSearchParams({ content: newContent })
            });

            if (response.ok) {
                const data = await response.json();
                // Update the visible P tag with the new content and exit edit mode
                postElement.querySelector(".post-content").textContent = data.new_content;
                toggleEditMode(postElement, false);
            } else {
                alert("Failed to save post.");
            }
        });
    });

    function toggleEditMode(postElement, isEditing) {
        const contentArea = postElement.querySelector(".post-content-area");
        const displayArea = contentArea.querySelector(".post-content");
        const editArea = contentArea.querySelector(".edit-interface");
        const editButton = postElement.querySelector(".btn-edit");
        const deleteButton = postElement.querySelector(".btn-delete");


        if (isEditing) {
            displayArea.style.display = 'none';
            editArea.style.display = 'block';
            editButton.style.display = 'none'; // Hide edit button when editing
            deleteButton.style.display = 'none'; // Hide delete button when editing
        } else {
            displayArea.style.display = 'block';
            editArea.style.display = 'none';
            editButton.style.display = 'inline-block';
            deleteButton.style.display = 'inline-block';
        }
    }

    // --- Likes and Comments (keep these handlers the same as before) ---
    document.querySelectorAll(".like-btn").forEach(button => { /* ... */ });
    document.querySelectorAll(".comment-form").forEach(form => { /* ... */ });
});