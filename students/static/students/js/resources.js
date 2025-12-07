// static/students/js/resources.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('resourceSearch');
    const filterSelect = document.getElementById('resourceFilter');
    const resourceItems = document.querySelectorAll('.resource-item');

    // Function to filter resources
    function filterResources() {
        const searchText = searchInput.value.toLowerCase();
        const filterValue = filterSelect.value.toLowerCase();

        resourceItems.forEach(item => {
            const title = item.querySelector('.resource-title').textContent.toLowerCase();
            const category = item.dataset.category.toLowerCase();

            const matchesSearch = title.includes(searchText);
            const matchesFilter = filterValue === 'all' || category === filterValue;

            if (matchesSearch && matchesFilter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Event listeners
    searchInput.addEventListener('input', filterResources);
    filterSelect.addEventListener('change', filterResources);
});
