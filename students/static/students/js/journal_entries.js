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

// ===== Convert to Philippine Time (PHT/UTC+8) =====
function formatPhilippineTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        // Parse the date string
        let date;
        
        // If the string doesn't have timezone info (no Z, +, or -), 
        // we need to determine if it's UTC or local time
        // Since Django USE_TZ=False with TIME_ZONE='Asia/Manila',
        // datetime.now() returns Manila time without timezone info
        // So we'll treat it as Manila time already
        if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
            // No timezone info - assume it's already in Manila time (from Django)
            // But we need to parse it correctly
            // Try parsing as-is first
            date = new Date(dateString);
            
            // If that doesn't work or seems wrong, try adding timezone
            if (isNaN(date.getTime())) {
                // Try adding Z to treat as UTC
                date = new Date(dateString + 'Z');
            }
        } else {
            // Has timezone info, parse directly
            date = new Date(dateString);
        }
        
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
const editTextarea = document.getElementById('editTextarea');

let currentEditId = null;
let currentDeleteId = null;
let journalEntries = [];
let filteredEntries = [];

// ===== Display Entries =====
function displayEntries() {
    if (!entriesContainer) return;
    
    entriesContainer.innerHTML = '';
    if (filteredEntries.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (totalEntriesSpan) totalEntriesSpan.textContent = '0';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (totalEntriesSpan) totalEntriesSpan.textContent = filteredEntries.length;

    filteredEntries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'journal-entry-card';
        card.dataset.id = entry.id;
        
        const createdDate = formatPhilippineTime(entry.created_at);
        const wordCount = (entry.content || '').trim().split(/\s+/).filter(w => w.length > 0).length;
        const charCount = (entry.content || '').length;
        
        card.innerHTML = `
            <div class="journal-entry-header">
                <div class="journal-entry-title-row">
                    <h3 class="journal-entry-title">${escapeHtml(entry.title || 'Untitled Entry')}</h3>
                    <div class="journal-entry-badges">
                        <span class="journal-badge">${wordCount} words</span>
                        <span class="journal-badge">${charCount} chars</span>
                    </div>
                </div>
                <div class="journal-entry-meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span class="journal-entry-date">${createdDate}</span>
                </div>
            </div>
            <div class="journal-entry-content">
                <p>${escapeHtml(entry.content || '')}</p>
            </div>
            <div class="journal-entry-actions">
                <button class="journal-edit-btn" data-id="${entry.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
                <button class="journal-delete-btn" data-id="${entry.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
            </div>
        `;
        entriesContainer.appendChild(card);
    });

    attachEntryButtons();
}

// ===== Escape HTML =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Attach Edit/Delete Buttons =====
function attachEntryButtons() {
    document.querySelectorAll('.journal-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.journal-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

// ===== Search & Sort =====
function filterAndSort() {
    if (!searchInput || !sortSelect) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    filteredEntries = journalEntries.filter(e =>
        (e.title || '').toLowerCase().includes(searchTerm) ||
        (e.content || '').toLowerCase().includes(searchTerm)
    );

    filteredEntries.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return sortSelect.value === 'newest' ? dateB - dateA : dateA - dateB;
    });

    displayEntries();
}

if (searchInput) searchInput.addEventListener('input', filterAndSort);
if (sortSelect) sortSelect.addEventListener('change', filterAndSort);

// ===== Load Entries from Django API =====
async function loadEntries() {
    try {
        const response = await fetch('/api/journals/');
        const data = await response.json();
        
        if (data.success) {
            journalEntries = data.journals || [];
            filteredEntries = [...journalEntries];
            filterAndSort();
        } else {
            console.error('Failed to load journals:', data.error);
            if (entriesContainer) {
                entriesContainer.innerHTML = '<div class="error-message">Failed to load journal entries. Please try again.</div>';
            }
        }
    } catch (error) {
        console.error('Error loading journals:', error);
        if (entriesContainer) {
            entriesContainer.innerHTML = '<div class="error-message">Error loading journal entries. Please refresh the page.</div>';
        }
    }
}

// ===== Edit Journal Entry =====
function openEditModal(id) {
    currentEditId = id;
    const entry = journalEntries.find(e => e.id == id);
    if (!entry) return;
    
    if (editTextarea) {
        editTextarea.value = entry.content || '';
    }
    if (editModal) {
        editModal.style.display = 'flex';
        editModal.classList.add('show');
        // Focus textarea after modal opens
        setTimeout(() => {
            if (editTextarea) editTextarea.focus();
        }, 100);
    }
}

function closeEditModalFunc() {
    if (editModal) {
        editModal.style.display = 'none';
        editModal.classList.remove('show');
    }
    currentEditId = null;
    if (editTextarea) editTextarea.value = '';
}

if (closeEditModal) closeEditModal.addEventListener('click', closeEditModalFunc);
if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModalFunc);

if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditId) return;

        const newContent = editTextarea ? editTextarea.value.trim() : '';
        if (!newContent) {
            alert('Content cannot be empty');
            return;
        }

        try {
            const response = await fetch(`/api/journals/${currentEditId}/update/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    content: newContent
                })
            });

            const data = await response.json();

            if (data.success) {
                const index = journalEntries.findIndex(e => e.id == currentEditId);
                if (index > -1) {
                    journalEntries[index] = data.journal;
                }
                filterAndSort();
                closeEditModalFunc();
                // Show success message
                showNotification('Journal entry updated successfully!', 'success');
            } else {
                showNotification('Failed to update entry: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            alert('Failed to update entry: ' + error.message);
            console.error('Error updating journal:', error);
        }
    });
}

// ===== Delete Journal Entry =====
function openDeleteModal(id) {
    currentDeleteId = id;
    if (deleteModal) {
        deleteModal.style.display = 'flex';
        deleteModal.classList.add('show');
    }
}

function closeDeleteModalFunc() {
    if (deleteModal) {
        deleteModal.style.display = 'none';
        deleteModal.classList.remove('show');
    }
    currentDeleteId = null;
}

if (closeDeleteModal) closeDeleteModal.addEventListener('click', closeDeleteModalFunc);
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModalFunc);

// Close modals when clicking outside
if (editModal) {
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModalFunc();
        }
    });
}

if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeDeleteModalFunc();
        }
    });
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (editModal && editModal.style.display === 'flex') {
            closeEditModalFunc();
        }
        if (deleteModal && deleteModal.style.display === 'flex') {
            closeDeleteModalFunc();
        }
    }
});

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!currentDeleteId) return;

        try {
            const response = await fetch(`/api/journals/${currentDeleteId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            const data = await response.json();

            if (data.success) {
                journalEntries = journalEntries.filter(e => e.id != currentDeleteId);
                filterAndSort();
                closeDeleteModalFunc();
                // Show success message
                showNotification('Journal entry deleted successfully!', 'success');
            } else {
                showNotification('Failed to delete entry: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            alert('Failed to delete entry: ' + error.message);
            console.error('Error deleting journal:', error);
        }
    });
}

// ===== Notification Function =====
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existing = document.querySelector('.journal-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'journal-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease-out;
        ${type === 'success' 
            ? 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);' 
            : 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);'}
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Initialize =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEntries);
} else {
    loadEntries();
}
