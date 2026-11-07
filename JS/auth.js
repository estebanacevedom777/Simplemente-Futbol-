(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const namePattern = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

    function setStatus(element, message, type) {
        element.textContent = message;
        element.dataset.state = type;
    }

    function showSuccess(title, message) {
        const overlay = document.querySelector('[data-success-overlay]');
        if (!overlay) return;
        overlay.querySelector('[data-success-title]').textContent = title;
        overlay.querySelector('[data-success-message]').textContent = message;
        overlay.hidden = false;
        document.body.classList.add('auth-success-visible');
    }

    const authForm = document.querySelector('[data-auth-form]');
    if (authForm) {
        const status = authForm.querySelector('[data-auth-status]');
        const mode = authForm.dataset.authForm;
        const submitButton = authForm.querySelector('[type="submit"]');

        if (mode === 'login' && new URLSearchParams(window.location.search).has('registered')) {
            setStatus(status, 'Cuenta creada. Inicia sesión con el correo y la contraseña que registraste.', 'success');
        }

        if (mode === 'signup') {
            const nameInput = authForm.elements.name;
            const emailInput = authForm.elements.email;
            const passwordInput = authForm.elements.password;
            const confirmation = authForm.elements['confirm-password'];
            const rulesList = document.querySelector('#password-rules');

            function validateName() {
                const name = nameInput.value.trim();
                const valid = name.length >= 2 && name.length <= 60 && namePattern.test(name);
                nameInput.setCustomValidity(valid || name.length === 0
                    ? ''
                    : 'Escribe un nombre válido con letras, espacios, guiones o apóstrofos.');
            }

            function validateEmail() {
                const email = emailInput.value.trim();
                emailInput.setCustomValidity(email.length <= 254 && (!email || emailPattern.test(email))
                    ? ''
                    : 'Escribe un correo electrónico válido.');
            }

            function validateConfirmation() {
                const matches = confirmation.value === passwordInput.value;
                confirmation.setCustomValidity(matches || confirmation.value.length === 0
                    ? ''
                    : 'Las contraseñas no coinciden.');
            }

            function validatePassword() {
                const rules = {
                    length: passwordInput.value.length >= 10,
                    upper: /\p{Lu}/u.test(passwordInput.value),
                    lower: /\p{Ll}/u.test(passwordInput.value),
                    number: /\d/.test(passwordInput.value),
                    symbol: /[^\p{L}\p{M}\d\s]/u.test(passwordInput.value)
                };
                Object.entries(rules).forEach(([rule, valid]) => {
                    const item = rulesList.querySelector(`[data-rule="${rule}"]`);
                    item.classList.toggle('met', valid);
                    item.setAttribute('aria-label', `${item.textContent}: ${valid ? 'cumplido' : 'pendiente'}`);
                });
                const valid = Object.values(rules).every(Boolean);
                passwordInput.setCustomValidity(valid || passwordInput.value.length === 0
                    ? ''
                    : 'Completa todos los requisitos de la contraseña.');
                validateConfirmation();
            }

            nameInput.addEventListener('input', validateName);
            emailInput.addEventListener('input', validateEmail);
            passwordInput.addEventListener('input', validatePassword);
            confirmation.addEventListener('input', validateConfirmation);

            authForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                validateName();
                validateEmail();
                validatePassword();
                validateConfirmation();
                if (!authForm.reportValidity()) return;

                submitButton.disabled = true;
                setStatus(status, 'Registrando tu cuenta...', 'pending');
                try {
                    await window.SF_API.post('/api/signup', {
                        name: nameInput.value.trim(),
                        email: emailInput.value.trim(),
                        password: passwordInput.value
                    });
                    authForm.reset();
                    validatePassword();
                    setStatus(status, 'Cuenta creada correctamente.', 'success');
                    showSuccess('¡Registro correcto!', 'Tu cuenta se creó correctamente.');
                    window.setTimeout(() => {
                        window.location.assign(new URL('html/login.html?registered=1', document.baseURI));
                    }, 1800);
                } catch (error) {
                    setStatus(status, error.message, 'error');
                } finally {
                    submitButton.disabled = false;
                }
            });
        } else if (mode === 'login') {
            const emailInput = authForm.elements.email;
            emailInput.addEventListener('input', () => {
                const email = emailInput.value.trim();
                emailInput.setCustomValidity(email.length <= 254 && (!email || emailPattern.test(email))
                    ? ''
                    : 'Escribe un correo electrónico válido.');
            });

            authForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                emailInput.value = emailInput.value.trim();
                if (!authForm.reportValidity()) return;

                submitButton.disabled = true;
                setStatus(status, 'Comprobando tus datos...', 'pending');
                try {
                    const { user } = await window.SF_API.post('/api/login', {
                        email: emailInput.value,
                        password: authForm.elements.password.value
                    });
                    setStatus(status, `¡Bienvenido, ${user.name}!`, 'success');
                    showSuccess('¡Inicio de sesión correcto!', `Bienvenido, ${user.name}.`);
                    window.setTimeout(() => {
                        window.location.assign(new URL('html/index.html', document.baseURI));
                    }, 1800);
                } catch (error) {
                    setStatus(status, error.message, 'error');
                } finally {
                    submitButton.disabled = false;
                }
            });
        }
    }

    const logoutButton = document.querySelector('#confirm-logout');
    if (logoutButton) {
        const status = document.querySelector('#logout-status');
        const description = document.querySelector('#logout-description');
        const actions = document.querySelector('#logout-actions');
        const homeLink = document.querySelector('#logout-home-link');
        actions.hidden = true;

        window.SF_API.request('/api/session').then(({ user }) => {
            if (!user) {
                description.textContent = 'No hay una sesión activa.';
                setStatus(status, 'Inicia sesión antes de intentar cerrar sesión.', 'pending');
                homeLink.hidden = false;
                return;
            }
            description.textContent = `Sesión activa para ${user.name}. Confirma si quieres salir de tu cuenta.`;
            actions.hidden = false;
        }).catch((error) => {
            description.textContent = 'No se pudo comprobar la sesión con el servidor.';
            setStatus(status, error.message, 'error');
            homeLink.hidden = false;
        });

        logoutButton.addEventListener('click', async () => {
            logoutButton.disabled = true;
            try {
                await window.SF_API.post('/api/logout', {});
                description.textContent = 'Tu sesión se cerró correctamente.';
                setStatus(status, 'Sesión cerrada correctamente.', 'success');
                actions.hidden = true;
                homeLink.hidden = false;
            } catch (error) {
                setStatus(status, error.message, 'error');
            } finally {
                logoutButton.disabled = false;
            }
        });
    }
})();
