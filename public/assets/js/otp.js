const otpVerify = document.getElementById('otp-verify');
const otpSuccess = document.getElementById('otp-success');
const newPass = document.getElementById('newpass');

const otpVerifyBtn = document.getElementById('otp-btn');
const otpSuccessBtn = document.getElementById('otp-verify-btn');
const newPassBtn = document.getElementById('new-password-btn');
const otpInputs = document.querySelectorAll('.mpin-input');
const resendBtn = document.getElementById('resend-btn');
const timerDisplay = document.getElementById('resend-timer');

let otpVerified = false; // track verification

// otp.js - Complete OTP verification and password reset functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const otpVerifyDiv = document.getElementById('otp-verify');
    const otpSuccessDiv = document.getElementById('otp-success');
    const newPassDiv = document.getElementById('newpass');
    
    const otpInputs = document.querySelectorAll('.mpin-input');
    const verifyBtn = document.getElementById('otp-btn');
    const resendBtn = document.getElementById('resend-btn');
    const timerSpan = document.getElementById('resend-timer');
    
    const continueBtn = document.getElementById('otp-verify-btn');
    const newPasswordForm = document.querySelector('#newpass form');
    
    // Get email from session storage
    const resetEmail = sessionStorage.getItem('resetEmail');
    if (!resetEmail) {
        alert('No email found. Please start from forgot password.');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('Resetting password for:', resetEmail);
    
    // Timer variables
    let timeLeft = 300; // 5 minutes in seconds
    let timerInterval;
    let canResend = false;
    
    // Start timer
    startTimer();
    
    // OTP Input Handling - Auto focus next input
    otpInputs.forEach((input, index) => {
        input.addEventListener('keyup', function(e) {
            // Allow only numbers
            this.value = this.value.replace(/[^0-9]/g, '');
            
            if (this.value.length === 1) {
                // Move to next input
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
            
            // Handle backspace
            if (e.key === 'Backspace' && index > 0 && this.value.length === 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        // Handle paste
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
            
            if (pasteData.length === 6) {
                otpInputs.forEach((inp, idx) => {
                    inp.value = pasteData[idx] || '';
                });
                otpInputs[5].focus();
            }
        });
    });
    
    // Start timer function
    function startTimer() {
        timerInterval = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                canResend = true;
                if (timerSpan) timerSpan.innerHTML = '';
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.style.opacity = '1';
                }
                return;
            }
            
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            if (timerSpan) {
                timerSpan.innerHTML = `Resend available in ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    // Verify OTP
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Get OTP from inputs
            const otp = Array.from(otpInputs).map(input => input.value).join('');
            
            if (otp.length !== 6) {
                alert('Please enter complete 6-digit OTP');
                return;
            }
            
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying...';
            
            try {
                const response = await fetch('http://localhost:3001/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: resetEmail, 
                        otp: otp 
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Show success message
                    otpVerifyDiv.style.display = 'none';
                    otpSuccessDiv.style.display = 'block';
                    
                    // Clear timer
                    clearInterval(timerInterval);
                } else {
                    alert(result.message || 'Invalid OTP');
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'Verify';
                }
            } catch (error) {
                console.error('OTP verification error:', error);
                alert('Connection error. Please try again.');
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify';
            }
        });
    }
    
    // Continue to new password page
    if (continueBtn) {
        continueBtn.addEventListener('click', function(e) {
            e.preventDefault();
            otpSuccessDiv.style.display = 'none';
            newPassDiv.style.display = 'block';
        });
    }
    
    // Resend OTP
    if (resendBtn) {
        resendBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (!canResend) {
                alert('Please wait for the timer to expire');
                return;
            }
            
            resendBtn.disabled = true;
            resendBtn.textContent = 'Sending...';
            
            try {
                const response = await fetch('http://localhost:3001/send-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetEmail })
                });
                
                if (response.ok) {
                    alert('New OTP sent successfully!');
                    // Reset timer
                    timeLeft = 300;
                    canResend = false;
                    startTimer();
                    
                    // Clear OTP inputs
                    otpInputs.forEach(input => input.value = '');
                    otpInputs[0].focus();
                } else {
                    alert('Failed to resend OTP');
                }
            } catch (error) {
                console.error('Resend error:', error);
                alert('Connection error');
            } finally {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend OTP';
            }
        });
    }
    
    // New Password Form Submission
    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = this.querySelector('input[name="password"]').value;
            const confirmPassword = this.querySelector('input[name="confirm-password"]').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            // Validation
            if (!password || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            
            if (password.length < 8) {
                alert('Password must be at least 8 characters');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Resetting...';
            
            try {
                const response = await fetch('http://localhost:3001/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: resetEmail, 
                        newPassword: password 
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('Password reset successfully! Please login with your new password.');
                    
                    // Clear session storage
                    sessionStorage.removeItem('resetEmail');
                    
                    // Redirect to login page
                    window.location.href = 'index.html';
                } else {
                    alert(result.message || 'Failed to reset password');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Reset Password';
                }
            } catch (error) {
                console.error('Password reset error:', error);
                alert('Connection error. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
            }
        });
    }
});