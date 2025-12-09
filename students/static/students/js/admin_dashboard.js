document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-chip');
    const sections = document.querySelectorAll('.admin-section');

    const pendingContainer = document.getElementById('pendingPostsContainer');
    const approvedContainer = document.getElementById('approvedPostsContainer');
    const declinedContainer = document.getElementById('declinedPostsContainer');
    const usersContainer = document.getElementById('usersTableContainer');
    const userSearchInput = document.getElementById('userSearchInput');

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.dataset.target;
            sections.forEach(section => {
                section.style.display = section.id === target ? 'block' : 'none';
            });

            if (target === 'pendingSection') loadPosts('pending', pendingContainer);
            if (target === 'approvedSection') loadPosts('approved', approvedContainer);
            if (target === 'declinedSection') loadPosts('declined', declinedContainer);
            if (target === 'usersSection') loadUsers(userSearchInput?.value || '');
        });
    });

    // Refresh buttons
    document.getElementById('refreshPending')?.addEventListener('click', () => loadPosts('pending', pendingContainer));
    document.getElementById('refreshApproved')?.addEventListener('click', () => loadPosts('approved', approvedContainer));
    document.getElementById('refreshDeclined')?.addEventListener('click', () => loadPosts('declined', declinedContainer));
    document.getElementById('refreshUsers')?.addEventListener('click', () => loadUsers(userSearchInput?.value || ''));

    // Initial load
    loadPosts('pending', pendingContainer);

    // Posts loader
    async function loadPosts(status, container) {
        if (!container) return;
        container.innerHTML = '<div class="empty-state">Loading posts...</div>';
        try {
            const response = await fetch(`/api/admin/posts/?status=${status}`);
            const data = await response.json();
            if (!data.success) {
                container.innerHTML = `<div class="empty-state" style="color:#dc2626;">${data.error || 'Failed to load posts'}</div>`;
                return;
            }
            renderPosts(data.posts || [], status, container);
        } catch (err) {
            console.error('Error loading posts', err);
            container.innerHTML = '<div class="empty-state" style="color:#dc2626;">Unable to load posts right now.</div>';
        }
    }

    // Convert to Philippine Time (PHT/UTC+8)
    function formatPhilippineTime(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            // Parse the date string
            let date;
            
            // Handle different datetime formats from Supabase/Django
            // Journal entries: datetime.now(timezone.utc).isoformat() -> has timezone (UTC) 
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
                    const displaySecond = second.toString().padStart(2, '0');
                    
                    // Format as: "MM/DD/YYYY, HH:MM:SS AM/PM PHT"
                    const monthStr = (month + 1).toString().padStart(2, '0');
                    const dayStr = day.toString().padStart(2, '0');
                    const hourStr = displayHour.toString().padStart(2, '0');
                    
                    return `${monthStr}/${dayStr}/${year}, ${hourStr}:${displayMinute}:${displaySecond} ${period} PHT`;
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
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
                
                const formatted = formatter.format(date);
                const parts = formatted.split(', ');
                if (parts.length === 2) {
                    const datePart = parts[0].split('/');
                    const timePart = parts[1].split(' ');
                    const timeComponents = timePart[0].split(':');
                    const period = timePart[1].toUpperCase();
                    
                    return `${datePart[0]}/${datePart[1]}/${datePart[2]}, ${timeComponents[0]}:${timeComponents[1]}:${timeComponents[2]} ${period} PHT`;
                }
                return formatted;
            }
            
            // Fallback
            if (isNaN(date.getTime())) {
                console.error('Invalid date:', dateString);
                return dateString;
            }
            
            return dateString;
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.error('Invalid date:', dateString);
                return dateString;
            }
            
            // Use the most reliable method: toLocaleString with Asia/Manila timezone
            // This correctly handles all timezone conversions
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Manila',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            
            // Format the date
            const formatted = formatter.format(date);
            
            // Parse the formatted string: "MM/DD/YYYY, HH:MM:SS AM/PM"
            const parts = formatted.split(', ');
            if (parts.length !== 2) {
                // Fallback parsing
                const datePart = parts[0].split('/');
                const timePart = parts[1] ? parts[1].split(' ') : ['00:00:00', 'AM'];
                const timeComponents = timePart[0].split(':');
                const period = timePart[1] || 'AM';
                
                return `${datePart[0]}/${datePart[1]}/${datePart[2]}, ${timeComponents[0]}:${timeComponents[1]}:${timeComponents[2] || '00'} ${period} PHT`;
            }
            
            const datePart = parts[0].split('/');
            const timePart = parts[1].split(' ');
            const timeComponents = timePart[0].split(':');
            const period = timePart[1].toUpperCase();
            
            const month = datePart[0];
            const day = datePart[1];
            const year = datePart[2];
            const hour = timeComponents[0].padStart(2, '0');
            const minute = timeComponents[1].padStart(2, '0');
            const second = (timeComponents[2] || '00').padStart(2, '0');
            
            return `${month}/${day}/${year}, ${hour}:${minute}:${second} ${period} PHT`;
        } catch (e) {
            console.error('Error formatting date:', e, 'Input:', dateString);
            return dateString;
        }
    }

    function renderPosts(posts, status, container) {
        if (!posts.length) {
            container.innerHTML = '<div class="empty-state">No posts found.</div>';
            return;
        }

        container.innerHTML = '';
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'moderation-card';

            // Get actual submitter username
            const submitterUsername = post.student ? 
                (post.student.full_name || post.student.username || 'Unknown User') : 
                'Unknown User';
            
            // Determine how it will appear to others
            const willAppearAs = post.is_anonymous ? 'Anonymous' : 'Public';
            const willAppearAsColor = post.is_anonymous ? '#6b7280' : '#10b981';
            const willAppearAsBg = post.is_anonymous ? '#f3f4f6' : '#d1fae5';
            
            // Format timestamp in Philippine Time
            const phTimestamp = formatPhilippineTime(post.created_at);
            
            // Get character count
            const content = post.content || '';
            const charCount = content.length;
            const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

            card.innerHTML = `
                <div class="moderation-card-header">
                    <div class="moderation-card-meta">
                        <div class="meta-row">
                            <div class="submitter-info">
                                <span class="submitter-badge">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    ${escapeHtml(submitterUsername)}
                                </span>
                                <span class="visibility-badge" style="background:${willAppearAsBg}; color:${willAppearAsColor};">
                                    Will appear as: ${willAppearAs}
                                </span>
                            </div>
                            <div class="timestamp-info">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span class="timestamp-text">${phTimestamp}</span>
                            </div>
                        </div>
                        <div class="post-metadata">
                            <span class="metadata-item">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                ${charCount} characters, ${wordCount} words
                            </span>
                            <span class="metadata-item">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                ${status === 'pending' ? 'Awaiting Review' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="moderation-card-content">
                    <p class="post-content">${escapeHtml(content)}</p>
                </div>
                <div class="moderation-actions">
                    ${status === 'pending' ? `
                        <button class="approve-btn" data-id="${post.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Approve
                        </button>
                        <button class="decline-btn" data-id="${post.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Decline
                        </button>
                    ` : ''}
                    ${status === 'approved' ? `
                        <button class="revert-btn" data-id="${post.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                <path d="M21 3v5h-5"></path>
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                <path d="M3 21v-5h5"></path>
                            </svg>
                            Revoke Approval
                        </button>
                    ` : ''}
                    ${status === 'declined' ? `
                        <button class="revert-btn" data-id="${post.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                <path d="M21 3v5h-5"></path>
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                <path d="M3 21v-5h5"></path>
                            </svg>
                            Reconsider
                        </button>
                    ` : ''}
                </div>
            `;

            if (status === 'pending') {
                card.querySelector('.approve-btn')?.addEventListener('click', () => updatePostStatus(post.id, 'approve'));
                card.querySelector('.decline-btn')?.addEventListener('click', () => updatePostStatus(post.id, 'decline'));
            }
            if (status === 'approved') {
                card.querySelector('.revert-btn')?.addEventListener('click', () => updatePostStatus(post.id, 'pending'));
            }
            if (status === 'declined') {
                card.querySelector('.revert-btn')?.addEventListener('click', () => updatePostStatus(post.id, 'pending'));
            }

            container.appendChild(card);
        });
    }

    async function updatePostStatus(postId, action) {
        if (!postId) return;
        let url = '';
        if (action === 'approve') {
            url = `/api/admin/posts/${postId}/approve/`;
        } else if (action === 'decline') {
            url = `/api/admin/posts/${postId}/decline/`;
        } else if (action === 'pending') {
            url = `/api/admin/posts/${postId}/pending/`;
        }
        if (!url) return;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
            const data = await response.json();
            if (data.success) {
                // Refresh pending and approved/declined lists
                loadPosts('pending', pendingContainer);
                loadPosts('approved', approvedContainer);
                loadPosts('declined', declinedContainer);
                
                // Update stats display
                updateStatsDisplay();
            } else {
                alert(data.error || 'Unable to update post.');
            }
        } catch (err) {
            console.error('Error updating post', err);
            alert('Unable to update post right now.');
        }
    }
    
    // Update stats display after post actions
    async function updateStatsDisplay() {
        try {
            // Fetch counts from API
            const pendingResponse = await fetch('/api/admin/posts/?status=pending');
            const pendingData = await pendingResponse.json();
            const pendingCount = pendingData.posts ? pendingData.posts.length : 0;
            
            const allPostsResponse = await fetch('/api/admin/posts/');
            const allPostsData = await allPostsResponse.json();
            const totalPosts = allPostsData.posts ? allPostsData.posts.length : 0;
            
            // Update pending count
            const pendingCountEl = document.getElementById('pendingCount');
            if (pendingCountEl) {
                pendingCountEl.textContent = pendingCount;
            }
            
            // Update total posts count
            const totalPostsCountEl = document.getElementById('totalPostsCount');
            if (totalPostsCountEl) {
                totalPostsCountEl.textContent = totalPosts;
            }
            
            // Note: User count doesn't change when approving/declining posts, so we don't update it
        } catch (err) {
            console.error('Error updating stats display:', err);
            // Silently fail - stats will update on page refresh
        }
    }

    // Users
    async function loadUsers(searchTerm = '') {
        if (!usersContainer) return;
        usersContainer.innerHTML = '<div class="empty-state">Loading users...</div>';
        try {
            const url = searchTerm ? `/api/admin/users/?search=${encodeURIComponent(searchTerm)}` : '/api/admin/users/';
            const response = await fetch(url);
            const data = await response.json();
            if (!data.success) {
                usersContainer.innerHTML = `<div class="empty-state" style="color:#dc2626;">${data.error || 'Failed to load users'}</div>`;
                return;
            }
            renderUsers(data.users || []);
        } catch (err) {
            console.error('Error loading users', err);
            usersContainer.innerHTML = '<div class="empty-state" style="color:#dc2626;">Unable to load users right now.</div>';
        }
    }

    function renderUsers(users) {
        if (!users.length) {
            usersContainer.innerHTML = '<div class="empty-state">No users found.</div>';
            return;
        }

        usersContainer.innerHTML = '';

        // Add select all header
        const headerCard = document.createElement('div');
        headerCard.className = 'user-management-header';
        headerCard.innerHTML = `
            <div class="select-all-container">
                <input type="checkbox" id="selectAllUsers" style="width: 18px; height: 18px; cursor: pointer; accent-color: #9333ea;">
                <label for="selectAllUsers" style="font-weight: 600; color: #374151; cursor: pointer;">Select All</label>
            </div>
            <div class="bulk-actions-container">
                <button class="bulk-delete-btn" id="bulkDeleteBtn" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete Selected
                </button>
            </div>
        `;
        usersContainer.appendChild(headerCard);

        const currentUserId = usersContainer.getAttribute('data-current-user-id') || 
                              (document.body.getAttribute('data-user-id') ? 
                               document.body.getAttribute('data-user-id') : null);

        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            
            const isAdmin = user.is_admin || false;
            const isSelf = currentUserId && String(user.id) === String(currentUserId);
            const accountTypeBadge = isAdmin ? 
                '<span class="account-badge admin-badge">Admin</span>' : 
                '<span class="account-badge user-badge">User</span>';
            
            // Format date joined
            const dateJoined = formatPhilippineTime(user.created_at || user.date_joined);
            
            // Get post count (if available in user object)
            const postCount = user.post_count || 0;

            card.innerHTML = `
                <div class="user-card-header">
                    <div class="user-card-meta">
                        <div class="user-main-info">
                            <div class="user-identity">
                                <input type="checkbox" class="user-checkbox" name="selected_users" value="${user.id}" ${isSelf ? 'disabled' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #9333ea;">
                                <div class="user-avatar">
                                    ${user.profile_picture_url ? 
                                        `<img src="${escapeHtml(user.profile_picture_url)}" alt="${escapeHtml(user.username || 'User')}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                                        ''
                                    }
                                    <div class="avatar-placeholder" style="${user.profile_picture_url ? 'display:none;' : 'display:flex;'} align-items:center; justify-content:center; width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color:white; font-weight:700; font-size:1.1rem;">
                                        ${escapeHtml((user.username || user.full_name || 'U')[0].toUpperCase())}
                                    </div>
                                </div>
                                <div class="user-details">
                                    <div class="user-name-row">
                                        <span class="username-text">${escapeHtml(user.username || 'N/A')}</span>
                                        ${accountTypeBadge}
                                    </div>
                                    <div class="user-full-name">${escapeHtml(user.full_name || 'No name provided')}</div>
                                </div>
                            </div>
                        </div>
                        <div class="user-metadata">
                            <div class="metadata-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                <a href="mailto:${escapeHtml(user.email || '')}" class="email-link">${escapeHtml(user.email || 'N/A')}</a>
                            </div>
                            <div class="metadata-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>Joined: ${dateJoined}</span>
                            </div>
                            ${postCount > 0 ? `
                            <div class="metadata-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                <span>${postCount} post${postCount !== 1 ? 's' : ''}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="user-card-actions">
                    ${isSelf ? `
                        <span class="self-indicator">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            This is you
                        </span>
                    ` : `
                        <button class="user-delete-btn" data-user-id="${user.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            Delete User
                        </button>
                    `}
                </div>
            `;

            const deleteBtn = card.querySelector('.user-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Delete this user and all their posts?')) {
                        deleteUser(user.id);
                    }
                });
            }

            usersContainer.appendChild(card);
        });

        // Select all functionality
        const selectAll = usersContainer.querySelector('#selectAllUsers');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                const checkboxes = usersContainer.querySelectorAll('.user-checkbox:not(:disabled)');
                checkboxes.forEach(cb => cb.checked = this.checked);
                updateBulkDeleteButton();
            });
        }

        // Individual checkbox change
        const checkboxes = usersContainer.querySelectorAll('.user-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                updateBulkDeleteButton();
                // Update select all checkbox state
                const allChecked = Array.from(usersContainer.querySelectorAll('.user-checkbox:not(:disabled)')).every(c => c.checked);
                if (selectAll) selectAll.checked = allChecked;
            });
        });

        // Bulk delete button
        const bulkDeleteBtn = usersContainer.querySelector('#bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', async () => {
                const selected = Array.from(usersContainer.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);
                if (selected.length === 0) return;
                
                if (confirm(`Delete ${selected.length} selected user${selected.length !== 1 ? 's' : ''}? This will also delete their posts.`)) {
                    bulkDeleteBtn.disabled = true;
                    bulkDeleteBtn.textContent = 'Deleting...';
                    try {
                        await Promise.all(selected.map(id => deleteUser(id)));
                        await loadUsers(userSearchInput?.value || '');
                    } catch (err) {
                        console.error('Error in bulk delete:', err);
                    } finally {
                        bulkDeleteBtn.disabled = false;
                        bulkDeleteBtn.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete Selected
                        `;
                    }
                }
            });
        }

        updateBulkDeleteButton();
    }

    function updateBulkDeleteButton() {
        const bulkDeleteBtn = usersContainer.querySelector('#bulkDeleteBtn');
        if (!bulkDeleteBtn) return;
        
        const selected = usersContainer.querySelectorAll('.user-checkbox:checked');
        bulkDeleteBtn.disabled = selected.length === 0;
    }

    async function deleteUser(userId) {
        if (!userId) return Promise.resolve();
        try {
            const response = await fetch(`/api/admin/users/${userId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
            const data = await response.json();
            if (data.success) {
                // Reload users after deletion
                await loadUsers(userSearchInput?.value || '');
                // Update stats
                updateStatsDisplay();
                return Promise.resolve();
            } else {
                alert(data.error || 'Unable to delete user.');
                return Promise.reject(data.error);
            }
        } catch (err) {
            console.error('Error deleting user', err);
            alert('Unable to delete user right now.');
            return Promise.reject(err);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

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
});

