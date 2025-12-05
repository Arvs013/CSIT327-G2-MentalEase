document.addEventListener("DOMContentLoaded", () => {
    const getCSRFToken = () => {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    };

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