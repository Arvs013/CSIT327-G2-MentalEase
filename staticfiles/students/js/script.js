document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function() {
            alert('Form submitted successfully!');
        });
    }
});
