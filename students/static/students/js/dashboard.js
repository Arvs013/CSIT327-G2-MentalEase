document.addEventListener('DOMContentLoaded', () => {
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

    // ===== Journal Save =====
    const saveJournalBtn = document.getElementById('saveJournalBtn');
    const journalTitle = document.getElementById('journalTitle');
    const journalTextarea = document.getElementById('journalTextarea');
    const journalMessage = document.getElementById('journalMessage');
    const viewEntriesLink = document.getElementById('viewEntriesLink');

    if (saveJournalBtn) {
        saveJournalBtn.addEventListener('click', async () => {
            const title = journalTitle.value.trim();
            const content = journalTextarea.value.trim();

            if (!content) {
                journalMessage.textContent = "Cannot save empty journal entry.";
                journalMessage.style.color = "red";
                journalMessage.style.display = "block";
                setTimeout(() => journalMessage.style.display = "none", 2500);
                return;
            }

            try {
                const res = await fetch('/students/dashboard/save_journal/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({
                        title: title || 'Reflective Journal',
                        content: content
                    })
                });

                const data = await res.json();

                if (data.success) {
                    journalMessage.textContent = "✅ Entry saved successfully!";
                    journalMessage.style.color = "green";
                    journalMessage.style.display = "block";
                    journalTitle.value = '';
                    journalTextarea.value = '';
                    
                    // Navigate using the link's href (Django already rendered the URL)
                    setTimeout(() => {
                        window.location.href = viewEntriesLink.href;
                    }, 1500);
                } else {
                    journalMessage.textContent = "❌ Failed: " + (data.error || "Unknown error");
                    journalMessage.style.color = "red";
                    journalMessage.style.display = "block";
                    setTimeout(() => journalMessage.style.display = "none", 2500);
                }
            } catch (err) {
                console.error(err);
                journalMessage.textContent = "❌ An error occurred.";
                journalMessage.style.color = "red";
                journalMessage.style.display = "block";
                setTimeout(() => journalMessage.style.display = "none", 2500);
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
    const editTextarea = document.getElementById('editTextarea');

    let currentEditId = null;
    let currentDeleteId = null;

    // ===== Initialize Entries from window.journalsData =====
    let journalEntries = window.journalsData || [];
    let filteredEntries = [...journalEntries];

    console.log('Loaded journals:', journalEntries);

    // ===== Display Entries =====
    function displayEntries() {
        entriesContainer.innerHTML = '';
        if (filteredEntries.length === 0) {
            emptyState.style.display = 'block';
            totalEntriesSpan.textContent = '0';
            return;
        }
        emptyState.style.display = 'none';
        totalEntriesSpan.textContent = filteredEntries.length;

        filteredEntries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'journal-entry';
            card.dataset.id = entry.id;
            const date = new Date(entry.created_at).toLocaleString();
            card.innerHTML = `
                <div class="entry-header">
                    <h3>${entry.title || 'Journal Entry'}</h3>
                    <small>${date}</small>
                </div>
                <p class="entry-content">${entry.content}</p>
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
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
        });
    }

    // ===== Search & Sort =====
    function filterAndSort() {
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

    // ===== Edit Journal Entry =====
    function openEditModal(id) {
        currentEditId = id;
        const entry = journalEntries.find(e => e.id == id);
        if (!entry) return;
        editTextarea.value = entry.content;
        editModal.style.display = 'block';
    }

    function closeEditModalFunc() {
        editModal.style.display = 'none';
        currentEditId = null;
    }

    if (closeEditModal) closeEditModal.addEventListener('click', closeEditModalFunc);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModalFunc);

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentEditId) return;

            const newContent = editTextarea.value.trim();
            if (!newContent) {
                alert('Content cannot be empty');
                return;
            }

            try {
                const res = await fetch(`/students/journal/${currentEditId}/edit/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value || ''
                    },
                    body: JSON.stringify({ content: newContent })
                });

                const data = await res.json();
                if (data.success) {
                    const index = journalEntries.findIndex(e => e.id == currentEditId);
                    if (index > -1) {
                        journalEntries[index].content = newContent;
                    }
                    filterAndSort();
                    closeEditModalFunc();
                } else {
                    alert('Failed to update: ' + (data.error || 'Unknown error'));
                }
            } catch (err) {
                console.error('Edit error:', err);
                alert('Error updating entry');
            }
        });
    }

    // ===== Delete Journal Entry =====
    function openDeleteModal(id) {
        currentDeleteId = id;
        deleteModal.style.display = 'block';
    }

    function closeDeleteModalFunc() {
        deleteModal.style.display = 'none';
        currentDeleteId = null;
    }

    if (closeDeleteModal) closeDeleteModal.addEventListener('click', closeDeleteModalFunc);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModalFunc);

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!currentDeleteId) return;

            try {
                const res = await fetch(`/students/journal/${currentDeleteId}/delete/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value || ''
                    }
                });

                const data = await res.json();
                if (data.success) {
                    journalEntries = journalEntries.filter(e => e.id != currentDeleteId);
                    filterAndSort();
                    closeDeleteModalFunc();
                } else {
                    alert('Failed to delete: ' + (data.error || 'Unknown error'));
                }
            } catch (err) {
                console.error('Delete error:', err);
                alert('Error deleting entry');
            }
        });
    }

    // ===== Initialize =====
    document.addEventListener('DOMContentLoaded', displayEntries);
});
