// ===== Initialize after DOM is ready =====
(function() {
    'use strict';
    
    console.log('Dashboard.js script loaded');
    
    // Wait for DOM to be ready
    function init() {
        console.log('Initializing dashboard.js');
        
        if (!window.supabase) {
            console.warn('Supabase not initialized! Some features may not work.');
        }

        const supabase = window.supabase;
        const CURRENT_STUDENT_ID = window.CURRENT_STUDENT_ID;

    // ===== Profile Dropdown =====
    const profilePic = document.getElementById('profilePic');
    const profileDropdown = document.getElementById('profileDropdown');

    if (profilePic && profileDropdown) {
        profilePic.addEventListener('click', e => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });

        window.addEventListener('click', e => {
            if (!profilePic.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }

    // ===== DOM Elements =====
    const entriesContainer = document.getElementById('entriesContainer');
    const emptyState = document.getElementById('emptyState');
    const totalEntriesSpan = document.getElementById('totalEntries');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');

    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const editForm = document.getElementById('editForm');
    const editTitleInput = document.getElementById('editTitleInput');
    const editContentTextarea = document.getElementById('editContentTextarea');

    const saveJournalBtn = document.getElementById('saveJournalBtn');
    const journalTitleInput = document.getElementById('journalTitle');
    const journalTextarea = document.getElementById('journalTextarea');
    const journalMessage = document.getElementById('journalMessage');
    
    // ===== Floating Notification System =====
    function showFloatingNotification(message, type = 'success') {
        // Remove existing notification if any
        const existing = document.querySelector('.floating-notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'floating-notification';
        notification.setAttribute('data-type', type);
        
        const icon = type === 'success' ? '✓' : '✕';
        const bgColor = type === 'success' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-weight: 600;
            font-size: 0.95rem;
            min-width: 250px;
            animation: slideInNotification 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 4 seconds with fade out
        setTimeout(() => {
            notification.style.animation = 'slideOutNotification 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }
    
    // Add notification animations
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInNotification {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutNotification {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .notification-icon {
                font-size: 1.25rem;
                font-weight: 700;
            }
            .notification-message {
                flex: 1;
            }
        `;
        document.head.appendChild(style);
    }

    let currentEditId = null;
    let currentDeleteId = null;
    let journalEntries = [];
    let filteredEntries = [];

    // ===== Display Entries =====
    function displayEntries() {
        if (!entriesContainer) return;
        
        entriesContainer.innerHTML = '';

        if (!filteredEntries.length) {
            if (emptyState) emptyState.style.display = 'block';
            if (totalEntriesSpan) totalEntriesSpan.textContent = '0';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (totalEntriesSpan) totalEntriesSpan.textContent = filteredEntries.length;

        filteredEntries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'journal-entry';
            card.dataset.id = entry.id;
            card.innerHTML = `
                <h3>${entry.title || 'New Entry'}</h3>
                <p>${entry.content}</p>
                <small>${new Date(entry.created_at).toLocaleString()}</small>
                <div class="entry-actions">
                    <button class="edit-btn" data-id="${entry.id}">Edit</button>
                    <button class="delete-btn" data-id="${entry.id}">Delete</button>
                </div>
            `;
            entriesContainer.appendChild(card);
        });

        attachEntryButtons();
    }

    // ===== Attach Edit/Delete Buttons =====
    function attachEntryButtons() {
        document.querySelectorAll('.edit-btn').forEach(btn =>
            btn.addEventListener('click', () => openEditModal(btn.dataset.id))
        );
        document.querySelectorAll('.delete-btn').forEach(btn =>
            btn.addEventListener('click', () => openDeleteModal(btn.dataset.id))
        );
    }

    // ===== Search & Sort =====
    function filterAndSort() {
        if (!searchInput || !sortSelect || !entriesContainer) return;
        
        const searchTerm = searchInput.value.toLowerCase();

        filteredEntries = journalEntries.filter(e =>
            (e.title || '').toLowerCase().includes(searchTerm) ||
            e.content.toLowerCase().includes(searchTerm)
        );

        filteredEntries.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sortSelect.value === 'newest' ? dateB - dateA : dateA - dateB;
        });

        displayEntries();
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterAndSort);
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', filterAndSort);
    }

    // ===== Load Entries =====
    async function loadEntries() {
        if (!entriesContainer) return; // Only load if on journal entries page
        if (!CURRENT_STUDENT_ID) {
            console.error('Student ID not defined');
            return;
        }
        if (!supabase) {
            console.error('Supabase not initialized');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('journals')
                .select('*')
                .eq('student_id', CURRENT_STUDENT_ID)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading entries:', error);
                return;
            }

            journalEntries = data || [];
            filteredEntries = [...journalEntries];
            filterAndSort();
        } catch (err) {
            console.error('Error in loadEntries:', err);
        }
    }

    // ===== Helper function to get CSRF token =====
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

    // ===== Save Journal Entry =====
    if (saveJournalBtn && journalTextarea) {
        console.log('Save journal button found, attaching event listener');
        saveJournalBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Save button clicked');
            
            const content = journalTextarea.value.trim();
            console.log('Content:', content);
            
            if (!content) {
                showFloatingNotification('Cannot save empty journal entry', 'error');
                return;
            }

            // Disable button and show loading state
            saveJournalBtn.disabled = true;
            const originalText = saveJournalBtn.innerHTML;
            saveJournalBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                </svg>
                Saving...
            `;
            saveJournalBtn.style.opacity = '0.7';
            saveJournalBtn.style.cursor = 'not-allowed';

            try {
                const csrfToken = getCookie('csrftoken');
                console.log('CSRF Token:', csrfToken ? 'Found' : 'Not found');
                
                const requestBody = {
                    content: content,
                    title: 'Journal Reflection'
                };
                console.log('Request body:', requestBody);
                
                const response = await fetch('/students/api/journals/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify(requestBody)
                });

                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);

                if (data.success) {
                    // Clear textarea
                    journalTextarea.value = '';
                    
                    // Show success notification
                    showFloatingNotification('Journal entry saved successfully!', 'success');
                    
                    // Reset button
                    saveJournalBtn.disabled = false;
                    saveJournalBtn.innerHTML = originalText;
                    saveJournalBtn.style.opacity = '1';
                    saveJournalBtn.style.cursor = 'pointer';
                } else {
                    // Show error notification
                    const errorMsg = data.error || 'Unknown error';
                    console.error('Save failed:', errorMsg);
                    showFloatingNotification('Failed to save: ' + errorMsg, 'error');
                    
                    // Reset button
                    saveJournalBtn.disabled = false;
                    saveJournalBtn.innerHTML = originalText;
                    saveJournalBtn.style.opacity = '1';
                    saveJournalBtn.style.cursor = 'pointer';
                }
            } catch (error) {
                console.error('Error saving journal:', error);
                showFloatingNotification('Failed to save entry: ' + error.message, 'error');
                
                // Reset button
                saveJournalBtn.disabled = false;
                saveJournalBtn.innerHTML = originalText;
                saveJournalBtn.style.opacity = '1';
                saveJournalBtn.style.cursor = 'pointer';
            }
        });
    } else {
        console.error('Save journal button or textarea not found!', {
            saveJournalBtn: !!saveJournalBtn,
            journalTextarea: !!journalTextarea
        });
    }

    // ===== Edit Journal Entry =====
    function openEditModal(id) {
        if (!editModal || !editTitleInput || !editContentTextarea) return;
        currentEditId = id;
        const entry = journalEntries.find(e => e.id == id);
        if (!entry) return;

        editTitleInput.value = entry.title || '';
        editContentTextarea.value = entry.content || '';
        editModal.style.display = 'block';
    }

    function closeEditModalFunc() {
        if (!editModal) return;
        editModal.style.display = 'none';
        currentEditId = null;
    }

    // Only attach modal event listeners if elements exist (journal entries page)
    if (closeEditModal) {
        closeEditModal.addEventListener('click', closeEditModalFunc);
    }
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditModalFunc);
    }

    if (editForm && editTitleInput && editContentTextarea) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentEditId || !supabase) return;

            const updatedTitle = editTitleInput.value.trim() || 'New Entry';
            const updatedContent = editContentTextarea.value.trim();
            if (!updatedContent) return alert('Text cannot be empty');

            try {
                const { data, error } = await supabase
                    .from('journals')
                    .update({ title: updatedTitle, content: updatedContent })
                    .eq('id', currentEditId)
                    .select()
                    .single();

                if (error) return alert('Failed to update entry: ' + error.message);

                const index = journalEntries.findIndex(e => e.id == currentEditId);
                if (index > -1) journalEntries[index] = data;

                filterAndSort();
                closeEditModalFunc();
            } catch (err) {
                console.error('Error updating entry:', err);
                alert('Failed to update entry');
            }
        });
    }

    // ===== Delete Journal Entry =====
    function openDeleteModal(id) {
        if (!deleteModal) return;
        currentDeleteId = id;
        deleteModal.style.display = 'block';
    }

    function closeDeleteModalFunc() {
        if (!deleteModal) return;
        deleteModal.style.display = 'none';
        currentDeleteId = null;
    }

    if (closeDeleteModal) {
        closeDeleteModal.addEventListener('click', closeDeleteModalFunc);
    }
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModalFunc);
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!currentDeleteId || !supabase) return;

            try {
                const { error } = await supabase
                    .from('journals')
                    .delete()
                    .eq('id', currentDeleteId);

                if (error) return alert('Failed to delete entry: ' + error.message);

                journalEntries = journalEntries.filter(e => e.id != currentDeleteId);
                filterAndSort();
                closeDeleteModalFunc();
            } catch (err) {
                console.error('Error deleting entry:', err);
                alert('Failed to delete entry');
            }
        });
    }

    // ===== Initialize =====
    // Only initialize journal entries functionality if on journal entries page
    if (entriesContainer) {
        loadEntries();
    }
    
    // Only attach journal entry buttons if elements exist
    if (document.querySelectorAll('.edit-btn').length > 0) {
        document.querySelectorAll('.edit-btn').forEach(btn =>
            btn.addEventListener('click', () => openEditModal(btn.dataset.id))
        );
        document.querySelectorAll('.delete-btn').forEach(btn =>
            btn.addEventListener('click', () => openDeleteModal(btn.dataset.id))
        );
    }
    } // End of init function
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM is already ready
        init();
    }
})();

// ===== Standalone Save Journal Entry Handler (works independently) =====
(function() {
    'use strict';
    
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
    
    function showFloatingNotification(message, type = 'success') {
        const existing = document.querySelector('.floating-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'floating-notification';
        notification.setAttribute('data-type', type);
        
        const icon = type === 'success' ? '✓' : '✕';
        const bgColor = type === 'success' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-weight: 600;
            font-size: 0.95rem;
            min-width: 250px;
            animation: slideInNotification 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutNotification 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 300);
        }, 4000);
    }
    
    function initSaveButton() {
        const saveBtn = document.getElementById('saveJournalBtn');
        const textarea = document.getElementById('journalTextarea');
        
        if (!saveBtn) {
            console.error('Save button not found!');
            return;
        }
        
        if (!textarea) {
            console.error('Journal textarea not found!');
            return;
        }
        
        console.log('Save button and textarea found, attaching listener');
        
        saveBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Save button clicked!');
            
            const content = textarea.value.trim();
            
            if (!content) {
                showFloatingNotification('Cannot save empty journal entry', 'error');
                return;
            }
            
            // Disable button
            saveBtn.disabled = true;
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                </svg>
                Saving...
            `;
            saveBtn.style.opacity = '0.7';
            saveBtn.style.cursor = 'not-allowed';
            
            try {
                const csrfToken = getCookie('csrftoken');
                console.log('CSRF Token:', csrfToken ? 'Found' : 'Missing');
                
                const response = await fetch('/students/api/journals/create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken || ''
                    },
                    body: JSON.stringify({
                        content: content,
                        title: 'Journal Reflection'
                    })
                });
                
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Response data:', data);
                
                if (data.success) {
                    textarea.value = '';
                    showFloatingNotification('Journal entry saved successfully!', 'success');
                } else {
                    showFloatingNotification('Failed to save: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Error saving journal:', error);
                showFloatingNotification('Failed to save entry: ' + error.message, 'error');
            } finally {
                // Reset button
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                saveBtn.style.opacity = '1';
                saveBtn.style.cursor = 'pointer';
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSaveButton);
    } else {
        initSaveButton();
    }
    
    // Also try after a short delay in case elements load later
    setTimeout(initSaveButton, 500);
})();
