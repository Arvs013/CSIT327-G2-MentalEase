// --- Initial Load Animations ---
window.addEventListener('load', () => {
    // Apply staggered animation to form fields
    const formFields = document.querySelectorAll('.form-field');
    formFields.forEach((field, index) => {
        field.style.opacity = '0';
        field.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            field.style.transition = 'all 0.6s ease-out';
            field.style.opacity = '1';
            field.style.transform = 'translateX(0)';
        }, index * 150); // stagger animation timing
    });

    // Fade in the login container smoothly
    const container = document.querySelector('.login-container');
    if (container) {
        container.style.opacity = '0';
        setTimeout(() => {
            container.style.transition = 'opacity 1s ease-in';
            container.style.opacity = '1';
        }, 300);
    }
});

// --- Password Visibility Toggle ---
const passwordToggle = document.querySelector('.toggle-password');
if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
        const passwordInput = document.querySelector('#password');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.classList.add('visible');
        } else {
            passwordInput.type = 'password';
            passwordToggle.classList.remove('visible');
        }
    });
}

// --- Simple Form Validation ---
const loginForm = document.querySelector('#loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        const email = document.querySelector('#email');
        const password = document.querySelector('#password');

        if (!email.value.trim() || !password.value.trim()) {
            event.preventDefault();
            showError('Please fill in both email and password.');
        }
    });
}

// --- Display Temporary Error Message ---
function showError(message) {
    let errorBox = document.querySelector('.error-box');

    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.className = 'error-box';
        document.body.appendChild(errorBox);
    }

    errorBox.textContent = message;
    errorBox.style.opacity = '1';

    setTimeout(() => {
        errorBox.style.transition = 'opacity 0.5s ease';
        errorBox.style.opacity = '0';
    }, 2500);
}

// --- Input Field Focus Animation ---
const inputs = document.querySelectorAll('.form-field input');
inputs.forEach((input) => {
    input.addEventListener('focus', () => {
        input.parentElement.classList.add('focused');
    });
    input.addEventListener('blur', () => {
        if (!input.value.trim()) {
            input.parentElement.classList.remove('focused');
        }
    });
});

// --- Prevent Multiple Submissions ---
if (loginForm) {
    loginForm.addEventListener('submit', () => {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
        }
    });
}
