const modal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        function toggleAuth(type) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
            if (type === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        }

        function closeModal() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        // Close modal if user clicks outside of the content box
        window.onclick = function(event) {
            if (event.target == modal) {
                closeModal();
            }
        }