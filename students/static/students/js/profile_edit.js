// Profile Edit JavaScript

// Profile Picture Preview
const profilePictureInput = document.getElementById('id_profile_picture');
const profilePreview = document.getElementById('profilePreview');

if (profilePictureInput && profilePreview) {
    profilePictureInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                if (profilePreview.tagName === 'IMG') {
                    profilePreview.src = e.target.result;
                } else {
                    // Replace placeholder with image
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = 'Profile Picture';
                    img.className = 'avatar-image';
                    profilePreview.replaceWith(img);
                    profilePreview = img;
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// Form Submission
const profileForm = document.getElementById('profileForm');
const saveBtn = document.getElementById('saveBtn');
const profileMessage = document.getElementById('profileMessage');

if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(profileForm);
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        profileMessage.style.display = 'none';
        
        try {
            const response = await fetch('/api/update-profile/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                profileMessage.className = 'message success';
                profileMessage.textContent = data.message || 'Profile updated successfully!';
                profileMessage.style.display = 'block';
                
                // Update profile pic in navbar if changed (works for both admin and user navbars)
                if (data.student) {
                    const navbarProfilePic = document.getElementById('navbarProfilePic');
                    if (navbarProfilePic) {
                        if (data.student.profile_picture_url) {
                            // Update or replace with image
                            if (navbarProfilePic.tagName === 'IMG') {
                                navbarProfilePic.src = data.student.profile_picture_url;
                            } else {
                                // Replace placeholder with image
                                const img = document.createElement('img');
                                img.id = 'navbarProfilePic';
                                img.src = data.student.profile_picture_url;
                                img.alt = 'Profile';
                                // Check if it's admin or user navbar
                                if (navbarProfilePic.classList.contains('profile-avatar')) {
                                    img.className = 'profile-picture';
                                } else {
                                    img.className = navbarProfilePic.className.includes('admin') ? 'profile-picture' : 'profile-picture';
                                }
                                navbarProfilePic.replaceWith(img);
                            }
                        } else if (data.student.username) {
                            // Replace image with placeholder if no picture
                            if (navbarProfilePic.tagName !== 'DIV') {
                                const div = document.createElement('div');
                                div.id = 'navbarProfilePic';
                                div.className = navbarProfilePic.className.includes('admin') ? 'profile-avatar' : 'profile-avatar';
                                div.textContent = data.student.username.charAt(0).toUpperCase();
                                navbarProfilePic.replaceWith(div);
                            } else {
                                // Update existing placeholder
                                navbarProfilePic.textContent = data.student.username.charAt(0).toUpperCase();
                            }
                        }
                    }
                }
                
                // Redirect after 2 seconds
                setTimeout(() => {
                    window.location.href = '/profile/';
                }, 2000);
            } else {
                profileMessage.className = 'message error';
                profileMessage.textContent = data.error || 'Failed to update profile';
                profileMessage.style.display = 'block';
                
                // Display field errors
                if (data.errors) {
                    Object.keys(data.errors).forEach(field => {
                        const input = document.getElementById(`id_${field}`);
                        if (input) {
                            input.classList.add('error');
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'error-message';
                            errorDiv.textContent = data.errors[field];
                            input.parentElement.appendChild(errorDiv);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            profileMessage.className = 'message error';
            profileMessage.textContent = 'An error occurred. Please try again.';
            profileMessage.style.display = 'block';
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    });
}

// Profile Dropdown
const profilePic = document.getElementById('profilePic');
const profileDropdown = document.getElementById('profileDropdown');

if (profilePic && profileDropdown) {
    profilePic.addEventListener('click', () => {
        profileDropdown.classList.toggle('show');
    });
    
    window.addEventListener('click', (e) => {
        if (!profilePic.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });
}

// CSRF Token Helper
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

