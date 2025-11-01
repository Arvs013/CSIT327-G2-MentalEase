const form = document.getElementById("signupForm");
const passwordInput = document.getElementById("password");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");
const passwordStrength = document.getElementById("passwordStrength");

passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;
    passwordStrength.style.display = val ? "block" : "none";

    let strength = 0;
    if (val.length >= 8) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    let color, text, width;
    switch (strength) {
        case 1: color = "#ef4444"; text = "Weak"; width = "25%"; break;
        case 2: color = "#f59e0b"; text = "Fair"; width = "50%"; break;
        case 3: color = "#3b82f6"; text = "Good"; width = "75%"; break;
        case 4: color = "#22c55e"; text = "Strong"; width = "100%"; break;
        default: color = "#e5e7eb"; text = ""; width = "0%";
    }
    strengthBar.style.setProperty("--strength-color", color);
    strengthBar.style.setProperty("--strength-width", width);
    strengthText.textContent = text;
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();

    if (username && fullName && email && passwordInput.value) {
        document.getElementById("successMessage").style.display = "flex";
        document.getElementById("successText").textContent = `Welcome, ${fullName}! Your account was created successfully.`;
        form.reset();
        passwordStrength.style.display = "none";
    }
});
