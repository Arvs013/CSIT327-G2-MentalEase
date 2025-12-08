// Community Page - Anonymous Posts with Likes and Comments

document.addEventListener('DOMContentLoaded', function() {
    const submitPostBtn = document.getElementById('submitPostBtn');
    const postContent = document.getElementById('postContent');
    const postMessage = document.getElementById('postMessage');
    const postsContainer = document.getElementById('postsContainer');

    // Load posts
    async function loadPosts() {
        try {
            const response = await fetch('/api/posts/');
            const data = await response.json();
            
            if (data.success) {
                displayPosts(data.posts || []);
            } else {
                postsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9375rem;">No community posts yet. Be the first to share!</div>';
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            postsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9375rem;">No community posts yet. Be the first to share!</div>';
        }
    }

    // Display posts
    function displayPosts(posts) {
        if (posts.length === 0) {
            postsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">No posts yet. Be the first to share!</div>';
            return;
        }

        postsContainer.innerHTML = '';
        posts.forEach(post => {
            const postCard = createPostCard(post);
            postsContainer.appendChild(postCard);
        });
    }

    // Convert to Philippine Time (PHT/UTC+8)
    function formatPhilippineTime(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            const utcTime = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
            const phTime = new Date(utcTime + (8 * 60 * 60 * 1000));
            
            const month = String(phTime.getMonth() + 1).padStart(2, '0');
            const day = String(phTime.getDate()).padStart(2, '0');
            const year = phTime.getFullYear();
            const hours = phTime.getHours();
            const minutes = String(phTime.getMinutes()).padStart(2, '0');
            const seconds = String(phTime.getSeconds()).padStart(2, '0');
            
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            
            return `${month}/${day}/${year}, ${displayHours}:${minutes}:${seconds} ${ampm} PHT`;
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateString;
        }
    }

    // Create post card
    function createPostCard(post) {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.id = `post-${post.id}`;

        const phTimestamp = formatPhilippineTime(post.created_at);
        
        // Determine author name
        let authorName = 'Anonymous Person';
        if (post.is_anonymous === false && post.author_name) {
            authorName = post.author_name;
        }
        
        // Get character and word count
        const content = post.content || '';
        const charCount = content.length;
        const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

        card.innerHTML = `
            <div class="post-card-header">
                <div class="post-card-meta">
                    <div class="post-author-info">
                        <div class="post-author-avatar">
                            <div class="author-avatar-circle">
                                ${authorName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="post-author-details">
                            <div class="post-author-name-row">
                                <span class="post-author-name">${escapeHtml(authorName)}</span>
                                ${post.is_anonymous ? 
                                    '<span class="post-anonymous-badge">Anonymous</span>' : 
                                    '<span class="post-public-badge">Public</span>'
                                }
                            </div>
                            <div class="post-timestamp">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>${phTimestamp}</span>
                            </div>
                        </div>
                    </div>
                    <div class="post-metadata">
                        <span class="post-metadata-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            ${charCount} characters, ${wordCount} words
                        </span>
                    </div>
                </div>
            </div>
            <div class="post-card-content">
                <p class="post-content-text">${escapeHtml(content)}</p>
            </div>
            <div class="post-card-actions">
                <button class="post-like-btn" data-post-id="${post.id}">
                    <svg class="like-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: fill 0.2s;">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                    <span class="like-count">0</span>
                </button>
                <button class="post-comment-btn" data-post-id="${post.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span class="comment-count">${post.comments_count || 0}</span>
                </button>
            </div>
            <div class="comments-section" id="comments-${post.id}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                <div class="comments-list" style="margin-bottom: 1rem;"></div>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" class="comment-input" data-post-id="${post.id}" placeholder="Write a comment..." style="flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
                    <button class="submit-comment-btn" data-post-id="${post.id}" style="padding: 0.5rem 1rem; background: #9333ea; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600; transition: all 0.2s;">
                        Post
                    </button>
                </div>
            </div>
        `;

        // Load likes and comments
        loadLikesForPost(post.id);
        loadCommentsForPost(post.id);
        
        // Update comment count display if it exists
        const commentCountEl = card.querySelector('.comment-count');
        if (commentCountEl && post.comments_count !== undefined) {
            commentCountEl.textContent = post.comments_count;
        }

        // Event listeners
        const likeBtn = card.querySelector('.post-like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => toggleLike(post.id));
        }

        const commentBtn = card.querySelector('.post-comment-btn');
        if (commentBtn) {
            commentBtn.addEventListener('click', () => {
                const commentsSection = card.querySelector('.comments-section');
                commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
            });
        }

        const submitCommentBtn = card.querySelector('.submit-comment-btn');
        const commentInput = card.querySelector('.comment-input');
        submitCommentBtn.addEventListener('click', () => {
            const content = commentInput.value.trim();
            if (content) {
                createComment(post.id, content);
                commentInput.value = '';
            }
        });

        return card;
    }

    // Toggle like
    async function toggleLike(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/like/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            const data = await response.json();
            if (data.success) {
                loadLikesForPost(postId);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    // Load likes for post
    async function loadLikesForPost(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/likes/`);
            const data = await response.json();
            
            const likeBtn = document.querySelector(`.post-like-btn[data-post-id="${postId}"]`);
            if (likeBtn) {
                const likeCount = likeBtn.querySelector('.like-count');
                const likeIcon = likeBtn.querySelector('.like-icon');
                
                if (data.success) {
                    const count = data.count || 0;
                    const isLiked = data.is_liked || false;
                    
                    likeCount.textContent = count;
                    
                    // Update icon color based on liked state
                    if (isLiked) {
                        likeIcon.style.fill = '#dc2626';
                        likeIcon.style.stroke = '#dc2626';
                        likeBtn.style.color = '#dc2626';
                    } else {
                        likeIcon.style.fill = 'none';
                        likeIcon.style.stroke = '#6b7280';
                        likeBtn.style.color = '#6b7280';
                    }
                }
            }
        } catch (error) {
            console.error('Error loading likes:', error);
        }
    }

    // Load comments for post
    async function loadCommentsForPost(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/comments/`);
            const data = await response.json();
            
            if (data.success) {
                const commentsList = document.querySelector(`#comments-${postId} .comments-list`);
                if (commentsList) {
                    if (data.comments.length === 0) {
                        commentsList.innerHTML = '<div style="color: #6b7280; font-size: 0.875rem; padding: 1rem; text-align: center;">No comments yet</div>';
                    } else {
                        commentsList.innerHTML = '';
                        data.comments.forEach(comment => {
                            const commentDiv = document.createElement('div');
                            commentDiv.style.cssText = 'padding: 0.75rem; margin-bottom: 0.75rem; background: #f9fafb; border-radius: 0.5rem; display: flex; gap: 0.75rem;';
                            
                            const student = comment.student || {};
                            const displayName = student.full_name || student.username || 'Unknown User';
                            const profilePic = student.profile_picture_url || '';
                            const initials = displayName.charAt(0).toUpperCase();
                            const date = new Date(comment.created_at);
                            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            
                            commentDiv.innerHTML = `
                                <div style="flex-shrink: 0;">
                                    ${profilePic ? 
                                        `<img src="${escapeHtml(profilePic)}" alt="${escapeHtml(displayName)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                                        ''
                                    }
                                    <div style="${profilePic ? 'display:none;' : 'display:flex;'} align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color:white; font-weight:700; font-size:0.875rem;">
                                        ${escapeHtml(initials)}
                                    </div>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                        <span style="font-weight: 600; font-size: 0.875rem; color: #1a1a1a;">${escapeHtml(displayName)}</span>
                                        <span style="font-size: 0.75rem; color: #9ca3af;">${dateStr}</span>
                                    </div>
                                    <div style="font-size: 0.875rem; color: #374151; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(comment.content)}</div>
                                </div>
                            `;
                            commentsList.appendChild(commentDiv);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    // Create comment
    async function createComment(postId, content) {
        try {
            const response = await fetch(`/api/posts/${postId}/comments/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ content })
            });

            const data = await response.json();
            if (data.success) {
                loadCommentsForPost(postId);
                // Update comment count after adding comment
                updateCommentCount(postId);
            }
        } catch (error) {
            console.error('Error creating comment:', error);
        }
    }
    
    // Update comment count for a post
    async function updateCommentCount(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/comments/`);
            const data = await response.json();
            
            if (data.success) {
                const commentCount = data.comments ? data.comments.length : 0;
                const commentCountEl = document.querySelector(`.post-comment-btn[data-post-id="${postId}"] .comment-count`);
                if (commentCountEl) {
                    commentCountEl.textContent = commentCount;
                }
            }
        } catch (error) {
            console.error('Error updating comment count:', error);
        }
    }

    // Anonymous toggle
    const isAnonymousToggle = document.getElementById('isAnonymous');
    const privacyValue = document.getElementById('privacyValue');
    
    function updatePrivacyLabel() {
        if (isAnonymousToggle && privacyValue) {
            if (isAnonymousToggle.checked) {
                privacyValue.textContent = 'Post anonymously';
                privacyValue.style.color = '#9333ea';
            } else {
                privacyValue.textContent = 'Post as your name';
                privacyValue.style.color = '#6b7280';
            }
        }
    }
    
    if (isAnonymousToggle && privacyValue) {
        // Set initial state (default to anonymous/checked)
        isAnonymousToggle.checked = true;
        updatePrivacyLabel();
        
        // Handle checkbox change - this will fire when the checkbox state changes
        isAnonymousToggle.addEventListener('change', function() {
            updatePrivacyLabel();
        });
        
        // Also listen for click events to ensure label updates
        isAnonymousToggle.addEventListener('click', function() {
            // Small delay to ensure checkbox state is updated
            setTimeout(function() {
                updatePrivacyLabel();
            }, 0);
        });
    }

    // Submit post
    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', async () => {
            const content = postContent.value.trim();
            const isAnonymous = isAnonymousToggle ? isAnonymousToggle.checked : false;
            
            if (!content) {
                showMessage('Please write something first!', 'error');
                return;
            }

            submitPostBtn.disabled = true;
            submitPostBtn.textContent = 'Submitting...';

            try {
                const response = await fetch('/api/posts/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({ 
                        content,
                        is_anonymous: isAnonymous
                    })
                });

                const data = await response.json();

                if (data.success) {
                    const message = data.message || 'Post submitted successfully and is pending admin approval!';
                    showMessage(message, 'success');
                    postContent.value = '';
                    // Don't reload posts immediately since the post won't be visible until approved
                } else {
                    showMessage(`Error: ${data.error || 'Failed to submit post'}`, 'error');
                }
            } catch (error) {
                console.error('Error submitting post:', error);
                showMessage('Error submitting post. Please try again.', 'error');
            } finally {
                submitPostBtn.disabled = false;
                submitPostBtn.textContent = 'Submit Post';
            }
        });
    }

    // Show message
    function showMessage(text, type) {
        postMessage.style.display = 'block';
        postMessage.textContent = text;
        postMessage.style.background = type === 'success' ? '#f0fdf4' : '#fef2f2';
        postMessage.style.color = type === 'success' ? '#16a34a' : '#dc2626';
        postMessage.style.border = `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`;
        
        setTimeout(() => {
            postMessage.style.display = 'none';
        }, 3000);
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

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

    // Initial load
    loadPosts();
});

