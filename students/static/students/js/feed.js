document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // --- New Post ---
    const newPostForm = document.getElementById("newPostForm");
    newPostForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = newPostForm.content.value.trim();
        const anonymous = newPostForm.anonymous.checked;
        if (!content) return;

        await fetch(newPostForm.action, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrfToken,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ content, anonymous })
        });
        newPostForm.reset();
        location.reload();
    });

    // --- Likes ---
    document.querySelectorAll(".likeForm").forEach(form => {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const postId = form.querySelector("[name=post_id]").value;
            await fetch(form.action, {
                method: "POST",
                headers: { "X-CSRFToken": csrfToken },
                body: new URLSearchParams({ post_id: postId })
            });
            location.reload();
        });
    });

    // --- Comments ---
    document.querySelectorAll(".commentForm").forEach(form => {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const postId = form.querySelector("[name=post_id]").value;
            const content = form.querySelector("[name=content]").value.trim();
            if (!content) return;

            await fetch(form.action, {
                method: "POST",
                headers: { "X-CSRFToken": csrfToken },
                body: new URLSearchParams({ post_id: postId, content })
            });
            form.reset();
            location.reload();
        });
    });
});
