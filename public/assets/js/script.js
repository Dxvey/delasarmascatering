// --- 1. Element Selections ---
const signupContainer = document.getElementById('signup');
const loginContainer = document.getElementById('login');
const forgotContainer = document.getElementById('forgotpassword');

const signUpButtonForgot = document.getElementById('signUpButtonForgot');
const logInButton = document.getElementById('logInButton');
const forgotButton = document.getElementById('forgotButton');

const termsOverlay = document.getElementById('termsOverlay');
const termsCheckbox = document.getElementById('termsCheckbox');
const closeTermsBtn = document.getElementById('closeTermsBtn');

let currentEmail = "";

// --- 2. View Switching Logic ---
// Controls which form (Login/Signup/Forgot) is visible
if (signUpButtonForgot) {
    signUpButtonForgot.addEventListener('click', () => {
        if(signupContainer) signupContainer.style.display = "block";
        if(loginContainer) loginContainer.style.display = 'none';
        if(forgotContainer) forgotContainer.style.display = "none";
    });
}

if (logInButton) {
    logInButton.addEventListener('click', () => {
        if(signupContainer) signupContainer.style.display = "none";
        if(loginContainer) loginContainer.style.display = 'block';
        if(forgotContainer) forgotContainer.style.display = "none";
    });
}

if (forgotButton) {
    forgotButton.addEventListener('click', () => {
        if(signupContainer) signupContainer.style.display = "none";
        if(loginContainer) loginContainer.style.display = "none";
        if(forgotContainer) forgotContainer.style.display = "block";
    });
}

// --- 3. Terms & Conditions Popup Logic ---
if (termsCheckbox && closeTermsBtn) {
    // Enable "Accept" button only when box is checked
    termsCheckbox.addEventListener('change', () => {
        closeTermsBtn.disabled = !termsCheckbox.checked;
    });

    // When "Accept" is clicked, hide popup and trigger form submission
    closeTermsBtn.addEventListener('click', () => {
        termsOverlay.style.display = "none";
        const signupForm = document.querySelector('#signup form');
        if (signupForm) signupForm.requestSubmit(); 
    });
}

// --- 4. Form Submission Logic ---

// SIGNUP SUBMISSION
const signupForm = document.querySelector('#signup form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // STOP data from appearing in URL

        // Validate Terms
        if (!termsCheckbox.checked) {
            termsOverlay.style.display = "flex";
            return;
        }

        const fName = signupForm.querySelector('input[name="fName"]').value;
        const email = signupForm.querySelector('input[name="email"]').value;
        const password = signupForm.querySelector('input[name="password"]').value;

        if (password.length < 8) {
            alert("Password must be at least 8 characters");
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fName, email, password })
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                window.location.href = "index.html"; 
            } else {
                alert("Sign up failed: " + result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Could not connect to server.");
        }
    });
}

// LOGIN SUBMISSION
const loginForm = document.getElementById('loginForm') || document.querySelector('#login form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('http://localhost:3001/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(result.user));
                localStorage.setItem('currentUserId', result.user.id);
                window.location.href = "home.html";
            } else {
                alert(result.message || "Login failed");
            }
        } catch (error) {
            console.error("Connection Error:", error);
            alert("Server is offline.");
        }
    });
}

// FORGOT PASSWORD SUBMISSION
const forgotForm = document.querySelector('#forgotpassword form');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = forgotForm.querySelector('input[name="email"]').value;

        try {
            const response = await fetch('http://localhost:3001/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (response.ok) {
                alert("Code sent! Redirecting...");
                sessionStorage.setItem("resetEmail", email);
                window.location.href = "/otp.html";
            }
        } catch (error) {
            alert("Could not connect to server.");
        }
    });

    async function loadGallery() {
        const response = await fetch('http://localhost:3001/api/gallery');
        const images = await response.json();

        const galleryContainer = document.getElementById("galleryContainer");

        galleryContainer.innerHTML = images.map(img => `
            <img src="http://localhost:3001${img.image_path}" 
                class="gallery-img"
                data-path="${img.image_path}">
        `).join('');
    }

    loadGallery();

    document.addEventListener('click', async function(e) {

        if (e.target.classList.contains('gallery-img')) {

            const userData = JSON.parse(localStorage.getItem('user'));
            const imagePath = e.target.dataset.path;

            const response = await fetch('http://localhost:3001/api/user/set-profile-from-gallery', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userData.id,
                    imagePath: imagePath
                })
            });

            if (response.ok) {

                const fullUrl = `http://localhost:3001${imagePath}`;

                document.querySelectorAll('.profile-pic, .user-info img')
                    .forEach(img => img.src = fullUrl);

                userData.profilePic = fullUrl;
                localStorage.setItem('user', JSON.stringify(userData));

                alert("Profile picture updated!");
            }
        }

    });


// Add event listener for email input
document.addEventListener('DOMContentLoaded', function() {
    const emailInputs = document.querySelectorAll('input[name="email"]');
    
    emailInputs.forEach(input => {
        let timeout;
        
        input.addEventListener('input', function() {
            clearTimeout(timeout);
            const email = this.value;
            
            // Only validate if email has @ and .
            if (email.includes('@') && email.includes('.')) {
                timeout = setTimeout(() => {
                    validateEmailRealTime(email);
                }, 500); // Wait 500ms after user stops typing
            }
        });
        
        // Validate on blur (when leaving the input)
        input.addEventListener('blur', function() {
            const email = this.value;
            if (email) {
                validateEmailRealTime(email);
            }
        });
    });
});

// Update signup form submission
const signupForm = document.querySelector('#signup form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate Terms
        if (!termsCheckbox.checked) {
            termsOverlay.style.display = "flex";
            return;
        }

        const fName = signupForm.querySelector('input[name="fName"]').value;
        const email = signupForm.querySelector('input[name="email"]').value;
        const password = signupForm.querySelector('input[name="password"]').value;

        if (password.length < 8) {
            alert("Password must be at least 8 characters");
            return;
        }

        // Validate email before submitting
        const isValidEmail = await validateEmailRealTime(email);
        if (!isValidEmail) {
            alert("Please enter a valid email address");
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fName, email, password })
            });
            
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                window.location.href = "index.html"; 
            } else {
                alert("Sign up failed: " + result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Could not connect to server.");
        }
    });
}
}