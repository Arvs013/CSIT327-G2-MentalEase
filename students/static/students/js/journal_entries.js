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
        editModal.style.display = 'block';
    }
}

function closeEditModalFunc() {
    if (editModal) editModal.style.display = 'none';
    currentEditId = null;
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
            } else {
                alert('Failed to update entry: ' + (data.error || 'Unknown error'));
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
    if (deleteModal) deleteModal.style.display = 'block';
}

function closeDeleteModalFunc() {
    if (deleteModal) deleteModal.style.display = 'none';
    currentDeleteId = null;
}

if (closeDeleteModal) closeDeleteModal.addEventListener('click', closeDeleteModalFunc);
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModalFunc);

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
            } else {
                alert('Failed to delete entry: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Failed to delete entry: ' + error.message);
            console.error('Error deleting journal:', error);
        }
    });
}

// ===== Initialize =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEntries);
} else {
    loadEntries();
}
