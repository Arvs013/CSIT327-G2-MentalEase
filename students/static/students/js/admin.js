// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const adminPostsContainer = document.getElementById('adminPostsContainer');
    const adminResourcesContainer = document.getElementById('adminResourcesContainer');
    const adminUsersContainer = document.getElementById('adminUsersContainer');
    const addResourceBtn = document.getElementById('addResourceBtn');
    const resourceModal = document.getElementById('resourceModal');
    const closeResourceModal = document.getElementById('closeResourceModal');
    const resourceForm = document.getElementById('resourceForm');
    const userSearchInput = document.getElementById('userSearchInput');
    const refreshUsersBtn = document.getElementById('refreshUsersBtn');
    let editingResourceId = null;
    
    // Tab Management
    const tabButtons = document.querySelectorAll('.tab-button');
    const adminSections = document.querySelectorAll('.admin-section');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active tab
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.color = '#6b7280';
                btn.style.borderBottomColor = 'transparent';
            });
            this.classList.add('active');
            this.style.color = '#9333ea';
            this.style.borderBottomColor = '#9333ea';
            
            // Show/hide sections
            adminSections.forEach(section => {
                section.style.display = 'none';
            });
            
            if (tabName === 'users') {
                document.getElementById('usersSection').style.display = 'block';
                loadAdminUsers();
            } else if (tabName === 'posts') {
                document.getElementById('postsSection').style.display = 'block';
                loadAdminPosts();
            } else if (tabName === 'resources') {
                document.getElementById('resourcesSection').style.display = 'block';
                loadAdminResources();
            }
        });
    });
    
    // Load posts on page load (default tab)
    loadAdminPosts();
    
    // Load users on page load if we're on the users page
    if (adminUsersContainer && !adminPostsContainer) {
        // We're on the standalone users page, load users immediately
        loadAdminUsers();
    }
    
    // Refresh posts button
    const refreshPostsBtn = document.getElementById('refreshPostsBtn');
    if (refreshPostsBtn) {
        refreshPostsBtn.addEventListener('click', loadAdminPosts);
    }

    // Load admin posts
    // NOTE: manage-posts page now uses admin_dashboard.js; keep this stub minimal

    // Display admin posts
    function displayAdminPosts(posts) {
        if (!adminPostsContainer) {
            console.error('adminPostsContainer not found in displayAdminPosts');
            return;
        }
        
        // Update total count
        const totalCountEl = document.getElementById('totalCount');
        if (totalCountEl) {
            totalCountEl.textContent = posts.length;
        }
        
        if (posts.length === 0) {
            adminPostsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">No posts to moderate</div>';
            return;
        }

        // Create table
        let tableHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th scope="col">
                            <input type="checkbox" id="selectAllPosts" style="width: 16px; height: 16px;">
                        </th>
                        <th scope="col">ID</th>
                        <th scope="col">STUDENT</th>
                        <th scope="col">CONTENT</th>
                        <th scope="col">IS ANONYMOUS</th>
                        <th scope="col">STATUS</th>
                        <th scope="col">CREATED AT</th>
                        <th scope="col">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        posts.forEach(post => {
            const date = new Date(post.created_at);
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
            });
            
            const studentName = post.student 
                ? `${escapeHtml(post.student.username)} (ID: ${post.student.id.substring(0, 8)})` 
                : 'Anonymous';
            
            const contentPreview = escapeHtml(post.content || '').substring(0, 100);
            const isAnonymous = post.is_anonymous ? 'yes' : 'no';
            const status = post.status || (post.approved ? 'approved' : 'pending');
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            
            tableHTML += `
                <tr>
                    <td>
                        <input type="checkbox" class="post-checkbox" name="selected_posts" value="${post.id}">
                    </td>
                    <td>${post.id ? post.id.substring(0, 8) : 'N/A'}</td>
                    <td>${studentName}</td>
                    <td class="content-cell" title="${escapeHtml(post.content || '')}">${contentPreview}${post.content && post.content.length > 100 ? '...' : ''}</td>
                    <td>
                        <span class="status-icon ${isAnonymous}"></span>
                    </td>
                    <td>
                        <span class="status-icon ${status === 'approved' ? 'yes' : status === 'declined' ? 'no' : ''}"></span> ${statusLabel}
                    </td>
                    <td>${formattedDate}</td>
                    <td>
                        ${status !== 'approved' ? `<button class="action-btn btn-approve approve-post-btn" data-post-id="${post.id}">Approve</button>` : ''}
                        ${status === 'pending' ? `<button class="action-btn btn-delete decline-post-btn" data-post-id="${post.id}">Decline</button>` : ''}
                        <button class="action-btn btn-delete delete-post-btn" data-post-id="${post.id}">Delete</button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
            <div class="admin-footer">
                ${posts.length} post${posts.length !== 1 ? 's' : ''}
            </div>
        `;
        
        adminPostsContainer.innerHTML = tableHTML;
        
        // Add event listeners
        posts.forEach(post => {
            const approveBtn = adminPostsContainer.querySelector(`.approve-post-btn[data-post-id="${post.id}"]`);
            if (approveBtn) {
                approveBtn.addEventListener('click', () => approvePost(post.id));
            }
            
            const declineBtn = adminPostsContainer.querySelector(`.decline-post-btn[data-post-id="${post.id}"]`);
            if (declineBtn) {
                declineBtn.addEventListener('click', () => declinePost(post.id));
            }
            
            const deleteBtn = adminPostsContainer.querySelector(`.delete-post-btn[data-post-id="${post.id}"]`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof window.showDeleteModal === 'function') {
                        window.showDeleteModal(post.id);
                    } else {
                        deletePost(post.id);
                    }
                });
            }
        });
        
        // Select all checkbox
        const selectAll = adminPostsContainer.querySelector('#selectAllPosts');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                const checkboxes = adminPostsContainer.querySelectorAll('.post-checkbox');
                checkboxes.forEach(cb => cb.checked = this.checked);
                updateSelectedCount();
            });
        }
        
        // Individual checkboxes
        const checkboxes = adminPostsContainer.querySelectorAll('.post-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateSelectedCount);
        });
        
        updateSelectedCount();
    }
    
    // Update selected count
    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.post-checkbox:checked');
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            selectedCountEl.innerHTML = `${checkboxes.length} of <span id="totalCount">${document.querySelectorAll('.post-checkbox').length}</span> selected`;
        }
    }

    // Approve post
    async function approvePost(postId) {
        try {
            const response = await fetch(`/api/admin/posts/${postId}/approve/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            const data = await response.json();
            if (data.success) {
                loadAdminPosts();
            }
        } catch (error) {
            console.error('Error approving post:', error);
        }
    }

    // Decline post
    async function declinePost(postId) {
        try {
            const response = await fetch(`/api/admin/posts/${postId}/decline/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            const data = await response.json();
            if (data.success) {
                loadAdminPosts();
            }
        } catch (error) {
            console.error('Error declining post:', error);
        }
    }

    // Delete post
    async function deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const response = await fetch(`/api/admin/posts/${postId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            const data = await response.json();
            if (data.success) {
                loadAdminPosts();
            }
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    }

    // Load admin resources
    async function loadAdminResources() {
        try {
            const response = await fetch('/api/admin/resources/');
            const data = await response.json();
            
            if (data.success) {
                displayAdminResources(data.resources || []);
            } else {
                adminResourcesContainer.innerHTML = '<div style="color: #dc2626;">Error loading resources</div>';
            }
        } catch (error) {
            console.error('Error loading resources:', error);
            adminResourcesContainer.innerHTML = '<div style="color: #dc2626;">Error loading resources</div>';
        }
    }

    // Display admin resources
    function displayAdminResources(resources) {
        if (resources.length === 0) {
            adminResourcesContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">No resources yet</div>';
            return;
        }

        adminResourcesContainer.innerHTML = '';
        resources.forEach(resource => {
            const resourceCard = document.createElement('div');
            resourceCard.style.cssText = 'padding: 1rem; margin-bottom: 1rem; background: #f9fafb; border-radius: 0.5rem; border: 1px solid #e5e7eb;';
            
            resourceCard.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 0.5rem; color: #1a1a1a;">${escapeHtml(resource.name || 'Untitled')}</h4>
                    <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">
                        <span style="background: #e0e7ff; color: #4338ca; padding: 0.25rem 0.75rem; border-radius: 0.25rem;">${resource.type || 'N/A'}</span>
                    </div>
                    <p style="color: #4b5563; font-size: 0.9rem; margin-bottom: 0.5rem;">${escapeHtml(resource.description || '')}</p>
                    ${resource.url ? `<a href="${resource.url}" target="_blank" style="color: #9333ea; text-decoration: none; font-size: 0.875rem;">Visit Link</a>` : ''}
                    ${resource.phone ? `<div style="color: #6b7280; font-size: 0.875rem; margin-top: 0.25rem;">📞 ${resource.phone}</div>` : ''}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="edit-resource-btn" data-resource-id="${resource.id}" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">Edit</button>
                    <button class="delete-resource-btn" data-resource-id="${resource.id}" style="padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">Delete</button>
                </div>
            `;

            const editBtn = resourceCard.querySelector('.edit-resource-btn');
            editBtn.addEventListener('click', () => editResource(resource));

            const deleteBtn = resourceCard.querySelector('.delete-resource-btn');
            deleteBtn.addEventListener('click', () => deleteResource(resource.id));

            adminResourcesContainer.appendChild(resourceCard);
        });
    }

    // Add resource
    if (addResourceBtn) {
        addResourceBtn.addEventListener('click', () => {
            editingResourceId = null;
            document.getElementById('resourceModalTitle').textContent = 'Add Resource';
            resourceForm.reset();
            resourceModal.style.display = 'flex';
        });
    }

    // Close modal
    if (closeResourceModal) {
        closeResourceModal.addEventListener('click', () => {
            resourceModal.style.display = 'none';
        });
    }

    // Edit resource
    function editResource(resource) {
        editingResourceId = resource.id;
        document.getElementById('resourceModalTitle').textContent = 'Edit Resource';
        document.getElementById('resourceName').value = resource.name || '';
        document.getElementById('resourceType').value = resource.type || '';
        document.getElementById('resourceDescription').value = resource.description || '';
        document.getElementById('resourceUrl').value = resource.url || '';
        document.getElementById('resourcePhone').value = resource.phone || '';
        resourceModal.style.display = 'flex';
    }

    // Delete resource
    async function deleteResource(resourceId) {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        try {
            const response = await fetch(`/api/admin/resources/${resourceId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            const data = await response.json();
            if (data.success) {
                loadAdminResources();
            }
        } catch (error) {
            console.error('Error deleting resource:', error);
        }
    }

    // Submit resource form
    if (resourceForm) {
        resourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const resourceData = {
                name: document.getElementById('resourceName').value.trim(),
                type: document.getElementById('resourceType').value,
                description: document.getElementById('resourceDescription').value.trim(),
                url: document.getElementById('resourceUrl').value.trim(),
                phone: document.getElementById('resourcePhone').value.trim()
            };

            try {
                let response;
                if (editingResourceId) {
                    response = await fetch(`/api/admin/resources/${editingResourceId}/update/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify(resourceData)
                    });
                } else {
                    response = await fetch('/api/admin/resources/create/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        body: JSON.stringify(resourceData)
                    });
                }

                const data = await response.json();
                if (data.success) {
                    resourceModal.style.display = 'none';
                    resourceForm.reset();
                    loadAdminResources();
                }
            } catch (error) {
                console.error('Error saving resource:', error);
            }
        });
    }

    // Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
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

    // Load admin users - make it accessible globally
    window.loadAdminUsers = async function(searchQuery = '') {
        const container = document.getElementById('adminUsersContainer');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">Loading users...</div>';
        
        try {
            const url = searchQuery ? `/api/admin/users/?search=${encodeURIComponent(searchQuery)}` : '/api/admin/users/';
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                displayAdminUsers(data.users || []);
            } else {
                container.innerHTML = '<div style="color: #dc2626;">Error loading users</div>';
            }
        } catch (error) {
            console.error('Error loading users:', error);
            container.innerHTML = '<div style="color: #dc2626;">Error loading users</div>';
        }
    };
    
    // Also keep the local reference for use within this scope
    const loadAdminUsers = window.loadAdminUsers;
    
    // Display admin users
    function displayAdminUsers(users) {
        const container = document.getElementById('adminUsersContainer');
        if (!container) return;
        
        // Update total count
        const totalCountEl = document.getElementById('totalCount');
        if (totalCountEl) {
            totalCountEl.textContent = users.length;
        }
        
        if (users.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #c4dce8;">No users found</div>';
            return;
        }
        
        // Create table
        let tableHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th scope="col">
                            <input type="checkbox" id="selectAllUsers" style="width: 16px; height: 16px;">
                        </th>
                        <th scope="col">USERNAME</th>
                        <th scope="col">FULL NAME</th>
                        <th scope="col">EMAIL</th>
                        <th scope="col">ACCOUNT TYPE</th>
                        <th scope="col">CREATED AT</th>
                        <th scope="col">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        users.forEach(user => {
            const isAdmin = user.is_admin || false;
            const date = user.created_at ? new Date(user.created_at) : new Date();
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
            });
            
            const accountType = isAdmin ? 
                '<span class="status-icon yes" style="background: #9333ea;">Admin</span>' : 
                '<span class="status-icon no" style="background: #6b7280;">User</span>';
            
            tableHTML += `
                <tr>
                    <td>
                        <input type="checkbox" class="user-checkbox" name="selected_users" value="${user.id}">
                    </td>
                    <td>${escapeHtml(user.username || 'N/A')}</td>
                    <td>${escapeHtml(user.full_name || 'N/A')}</td>
                    <td>${escapeHtml(user.email || 'N/A')}</td>
                    <td>${accountType}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="action-btn btn-delete delete-user-btn" data-user-id="${user.id}">Delete</button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
            <div class="admin-footer">
                ${users.length} user${users.length !== 1 ? 's' : ''}
            </div>
        `;
        
        container.innerHTML = tableHTML;
        
        // Add event listeners
        users.forEach(user => {
            const deleteBtn = container.querySelector(`.delete-user-btn[data-user-id="${user.id}"]`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof window.showDeleteUserModal === 'function') {
                        window.showDeleteUserModal(user.id);
                    } else {
                        deleteUserId = user.id;
                        const modal = document.getElementById('deleteModal');
                        if (modal) modal.style.display = 'flex';
                    }
                });
            }
        });
        
        // Select all checkbox
        const selectAll = container.querySelector('#selectAllUsers');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                const checkboxes = container.querySelectorAll('.user-checkbox');
                checkboxes.forEach(cb => cb.checked = this.checked);
                updateSelectedUserCount();
            });
        }
        
        // Individual checkboxes
        const checkboxes = container.querySelectorAll('.user-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateSelectedUserCount);
        });
        
        updateSelectedUserCount();
    }
    
    // Update selected user count
    function updateSelectedUserCount() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            selectedCountEl.innerHTML = `${checkboxes.length} of <span id="totalCount">${document.querySelectorAll('.user-checkbox').length}</span> selected`;
        }
    }
    
    // User deletion
    let deleteUserId = null;
    const cancelDeleteUser = document.getElementById('cancelDeleteUser');
    const confirmDeleteUser = document.getElementById('confirmDeleteUser');
    
    if (cancelDeleteUser) {
        cancelDeleteUser.addEventListener('click', function() {
            const deleteModal = document.getElementById('deleteUserModal');
            if (deleteModal) {
                deleteModal.style.display = 'none';
            }
            deleteUserId = null;
        });
    }
    
    if (confirmDeleteUser) {
        confirmDeleteUser.addEventListener('click', async function() {
            if (deleteUserId) {
                try {
                    const response = await fetch(`/api/admin/users/${deleteUserId}/delete/`, {
                        method: 'DELETE',
                        headers: {
                            'X-CSRFToken': getCookie('csrftoken')
                        }
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        const deleteModal = document.getElementById('deleteUserModal');
                        if (deleteModal) {
                            deleteModal.style.display = 'none';
                        }
                        loadAdminUsers(userSearchInput ? userSearchInput.value : '');
                    } else {
                        alert('Error: ' + (data.error || 'Failed to delete user'));
                    }
                } catch (error) {
                    console.error('Error deleting user:', error);
                    alert('Error deleting user');
                }
                deleteUserId = null;
            }
        });
    }
    
    // User search
    if (userSearchInput) {
        userSearchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                loadAdminUsers(e.target.value);
            }
        });
    }
    
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', function() {
            loadAdminUsers(userSearchInput ? userSearchInput.value : '');
        });
    }
    
    // Load users on page load if we're on the standalone users page (adminUsersContainer exists but no tabs)
    if (adminUsersContainer && tabButtons.length === 0) {
        loadAdminUsers();
    }
});


