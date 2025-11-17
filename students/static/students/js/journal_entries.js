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
const editTextarea = document.getElementById('editTextarea');

const saveJournalBtn = document.getElementById('saveJournalBtn');
const journalTextarea = document.getElementById('journalTextarea');
const journalMessage = document.getElementById('journalMessage');

let currentEditId = null;
let currentDeleteId = null;
let journalEntries = [];
let filteredEntries = [];

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
        card.innerHTML = `
            <h3>${entry.title || 'New Entry'}</h3>
            <p>${entry.text}</p>
            <small>${entry.date.split('T')[0]} ${entry.date.split('T')[1].split('.')[0]}</small>
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
        e.text.toLowerCase().includes(searchTerm)
    );

    filteredEntries.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortSelect.value === 'newest' ? dateB - dateA : dateA - dateB;
    });

    displayEntries();
}

searchInput.addEventListener('input', filterAndSort);
sortSelect.addEventListener('change', filterAndSort);

// ===== Load Entries from Supabase =====
async function loadEntries() {
    const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('student_id', CURRENT_STUDENT_ID)
        .order('date', { ascending: false });

    if (error) return console.error(error);

    journalEntries = data;
    filteredEntries = [...journalEntries];
    filterAndSort();
}

// ===== Save New Journal Entry =====
saveJournalBtn.addEventListener('click', async () => {
    const text = journalTextarea.value.trim();
    if (!text) return alert('Cannot save empty journal entry');

    const { data, error } = await supabase
        .from('journals')
        .insert([{
            student_id: CURRENT_STUDENT_ID,
            title: "Journal Entry",       // required by DB
            content: text,                // your text
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) {
        journalMessage.textContent = 'Failed to save entry: ' + error.message;
        return;
    }

    journalEntries.unshift(data);
    filterAndSort();
    journalTextarea.value = '';
    journalMessage.textContent = 'Entry saved!';
});

// ===== Edit Journal Entry =====
function openEditModal(id) {
    currentEditId = id;
    const entry = journalEntries.find(e => e.id == id);
    if (!entry) return;
    editTextarea.value = entry.text;
    editModal.style.display = 'block';
}

function closeEditModalFunc() {
    editModal.style.display = 'none';
    currentEditId = null;
}

closeEditModal.addEventListener('click', closeEditModalFunc);
cancelEditBtn.addEventListener('click', closeEditModalFunc);

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditId) return;

    const newText = editTextarea.value.trim();
    if (!newText) return alert('Text cannot be empty');

    const { data, error } = await supabase
        .from('journals')
        .update({ text: newText })
        .eq('id', currentEditId)
        .select()
        .single();

    if (error) return alert('Failed to update entry: ' + error.message);

    const index = journalEntries.findIndex(e => e.id == currentEditId);
    if (index > -1) journalEntries[index] = data;

    filterAndSort();
    closeEditModalFunc();
});

// ===== Delete Journal Entry =====
function openDeleteModal(id) {
    currentDeleteId = id;
    deleteModal.style.display = 'block';
}

function closeDeleteModalFunc() {
    deleteModal.style.display = 'none';
    currentDeleteId = null;
}

closeDeleteModal.addEventListener('click', closeDeleteModalFunc);
cancelDeleteBtn.addEventListener('click', closeDeleteModalFunc);

confirmDeleteBtn.addEventListener('click', async () => {
    if (!currentDeleteId) return;

    const { error } = await supabase
        .from('journals')
        .delete()
        .eq('id', currentDeleteId);

    if (error) return alert('Failed to delete entry: ' + error.message);

    journalEntries = journalEntries.filter(e => e.id != currentDeleteId);
    filterAndSort();
    closeDeleteModalFunc();
});

// ===== Initialize =====
window.addEventListener('load', loadEntries);
