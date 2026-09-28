document.querySelectorAll('[data-auth-form]').forEach((form) => {
    const status = form.querySelector('[data-auth-status]');
    const mode = form.dataset.authForm;

    if (mode === 'login' && new URLSearchParams(window.location.search).has('registered')) {
        status.textContent = 'Registro completado. Ya puedes iniciar sesión.';
    }

    if (mode === 'signup') {
        const password = form.elements.password;
        const confirmation = form.elements['confirm-password'];
        const validateConfirmation = () => {
            confirmation.setCustomValidity(
                confirmation.value === password.value ? '' : 'Las contraseñas no coinciden.'
            );
        };

        password.addEventListener('input', validateConfirmation);
        confirmation.addEventListener('input', validateConfirmation);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if (mode === 'signup') {
            form.elements['confirm-password'].reportValidity();
            window.location.assign('/html/login.html?registered=1');
            return;
        }

        window.location.assign('/html/index.html');
    });
});
