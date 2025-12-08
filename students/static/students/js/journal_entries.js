document.addEventListener('DOMContentLoaded', function () {
    // ===== DOM Elements =====
    const entriesContainer = document.getElementById('entriesContainer');
    const entriesTbody = document.getElementById('entriesTbody'); // NEW
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
    const editTitle = document.getElementById('editTitle');

    let currentEditId = null;
    let currentDeleteId = null;

    // ===== Initialize Entries from window.journalsData (passed from template) =====
    let journalEntries = window.journalsData || [];
    let filteredEntries = [...journalEntries];

    console.log('Loaded journalEntries:', journalEntries);
    console.log('Total entries:', journalEntries.length);

    // ===== Display Entries (table) =====
    function displayEntries() {
        console.log('displayEntries() called with', filteredEntries.length, 'entries');
        // clear tbody
        if (entriesTbody) entriesTbody.innerHTML = '';
        
        if (filteredEntries.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (totalEntriesSpan) totalEntriesSpan.textContent = '0';
            // hide table wrapper
            const wrapper = document.querySelector('.table-wrapper');
            if (wrapper) wrapper.style.display = 'none';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        if (totalEntriesSpan) totalEntriesSpan.textContent = filteredEntries.length;
        const wrapper = document.querySelector('.table-wrapper');
        if (wrapper) wrapper.style.display = 'block';

        filteredEntries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.dataset.id = entry.id;

            const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleString() : 'Unknown date';
            const title = entry.title || 'Journal Entry';
            const content = entry.content || '';

            tr.innerHTML = `
                <td style="padding:8px; border-bottom:1px solid #eee; vertical-align:top; max-width:300px; white-space:pre-wrap;">${escapeHtml(title)}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; vertical-align:top; white-space:pre-wrap; max-width:500px;">${escapeHtml(content)}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; vertical-align:top;">${escapeHtml(dateStr)}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">
                    <button class="edit-btn" data-id="${entry.id}">✏️</button>
                    <button class="delete-btn" data-id="${entry.id}">🗑️</button>
                </td>
            `;
            entriesTbody.appendChild(tr);
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
        const searchTerm = (searchInput.value || '').toLowerCase();
        filteredEntries = journalEntries.filter(e =>
            (e.title || '').toLowerCase().includes(searchTerm) ||
            (e.content || '').toLowerCase().includes(searchTerm)
        );

        const sortVal = sortSelect.value || 'newest';
        filteredEntries.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return sortVal === 'newest' ? dateB - dateA : dateA - dateB;
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
        editTitle.value = entry.title || '';
        editTextarea.value = entry.content || '';
        // show modal as flex so CSS centering works
        if (editModal) {
            editModal.style.display = 'flex';
            // ensure textarea gets focus
            setTimeout(() => editTextarea.focus(), 50);
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

            const newTitle = (editTitle.value || '').trim();
            const newText = (editTextarea.value || '').trim();
            if (!newText) {
                alert('Content cannot be empty');
                return;
            }

            const index = journalEntries.findIndex(e => e.id == currentEditId);
            if (index > -1) journalEntries[index].content = newText;
            if (index > -1) journalEntries[index].title = newTitle;

            try {
                const res = await fetch(`/students/journal/${currentEditId}/edit/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value || ''
                    },
                    body: JSON.stringify({ title: newTitle, content: newText })
                });
                const data = await res.json();
                console.log('Edit response:', data);
            } catch (err) {
                console.error('Edit error:', err);
            }

            filterAndSort();
            closeEditModalFunc();
        });
    }

    // ===== Delete Journal Entry =====
    function openDeleteModal(id) {
        currentDeleteId = id;
        if (deleteModal) deleteModal.style.display = 'flex';
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

            journalEntries = journalEntries.filter(e => e.id != currentDeleteId);

            try {
                const res = await fetch(`/students/journal/${currentDeleteId}/delete/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value || ''
                    }
                });
                const data = await res.json();
                console.log('Delete response:', data);
            } catch (err) {
                console.error('Delete error:', err);
            }

            filterAndSort();
            closeDeleteModalFunc();
        });
    }

    // ===== small helper to avoid injecting raw HTML
    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ===== Initialize =====
    console.log('Initializing displayEntries');
    displayEntries();
});
