(() => {
    const selectionArea = document.querySelector('.slip-selections');
    const stakeInput = document.querySelector('#stake');
    const totalOdds = document.querySelector('.slip-total strong');
    const potentialWinnings = document.querySelector('.slip-total.potential strong');
    const matchesPanel = document.querySelector('.matches-panel');
    const customMatches = document.querySelector('#custom-matches');
    const matchForm = document.querySelector('#add-match-form');
    const toggleFormButton = document.querySelector('#toggle-match-form');
    const closeFormButton = document.querySelector('#close-match-form');
    const feedback = document.querySelector('#match-feedback');
    const placeBetButton = document.querySelector('#place-bet');
    const loginRequiredMessage = document.querySelector('#bet-login-required');
    const betFeedback = document.querySelector('#bet-feedback');

    if (!selectionArea || !stakeInput || !totalOdds || !potentialWinnings || !matchesPanel
        || !customMatches || !matchForm || !toggleFormButton || !closeFormButton || !feedback
        || !placeBetButton || !loginRequiredMessage || !betFeedback) {
        return;
    }

    let storedMatches = [];
    let currentUserId = null;
    let isAdmin = false;

    function showFeedback(message, type = 'success') {
        feedback.textContent = message;
        feedback.dataset.state = type;
    }

    function showBetFeedback(message, type = 'success') {
        betFeedback.textContent = message;
        betFeedback.dataset.state = type;
    }

    function formatKickoff(value) {
        if (!value) return 'Fecha por definir';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Fecha por definir';
        return new Intl.DateTimeFormat('es-CO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function createCustomMatch(match) {
        const card = document.createElement('article');
        const meta = document.createElement('div');
        const competition = document.createElement('span');
        const kickoff = document.createElement('span');
        const teams = document.createElement('div');
        const home = document.createElement('strong');
        const versus = document.createElement('span');
        const away = document.createElement('strong');
        const marketGrid = document.createElement('div');
        const options = [
            { key: 'home', label: '1', odd: match.homeOdds },
            { key: 'draw', label: 'X', odd: match.drawOdds },
            { key: 'away', label: '2', odd: match.awayOdds }
        ];

        card.className = 'match-card custom-match-card';
        card.dataset.customMatchId = match.id;
        meta.className = 'match-meta';
        competition.textContent = match.competition;
        kickoff.textContent = formatKickoff(match.kickoff);
        meta.append(competition, kickoff);
        teams.className = 'teams';
        home.textContent = match.homeTeam;
        versus.textContent = 'VS';
        away.textContent = match.awayTeam;
        teams.append(home, versus, away);
        marketGrid.className = 'market-grid';

        options.forEach(({ key, label, odd }) => {
            const input = document.createElement('input');
            const inputId = `${match.id}-${key}`;
            const optionLabel = document.createElement('label');
            const selection = document.createElement('span');
            const price = document.createElement('strong');
            input.id = inputId;
            input.name = match.id;
            input.type = 'radio';
            input.dataset.customMatchId = match.id;
            input.dataset.customChoice = key;
            optionLabel.className = 'odd-button';
            optionLabel.htmlFor = inputId;
            selection.textContent = label;
            price.textContent = Number(odd).toFixed(2);
            optionLabel.append(selection, price);
            marketGrid.append(input, optionLabel);
        });

        card.append(meta, teams, marketGrid);
        if (match.ownerId === currentUserId) {
            const removeButton = document.createElement('button');
            removeButton.className = 'delete-custom-match';
            removeButton.type = 'button';
            removeButton.dataset.removeMatch = match.id;
            removeButton.textContent = 'Eliminar partido personalizado';
            card.append(removeButton);
        }
        return card;
    }

    function renderCustomMatches() {
        customMatches.replaceChildren(...storedMatches.map(createCustomMatch));
    }

    function updateBetSlip() {
        const selectedInputs = [...matchesPanel.querySelectorAll('.market-grid input:checked')];
        selectionArea.replaceChildren();

        if (selectedInputs.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-slip';
            emptyMessage.textContent = 'Selecciona una cuota en los partidos para añadirla a tu pronóstico.';
            selectionArea.append(emptyMessage);
            totalOdds.textContent = 'Se calcula al confirmar';
            potentialWinnings.textContent = 'Según selección';
            return;
        }

        let combinedOdds = 1;
        selectedInputs.forEach((input) => {
            const matchCard = input.closest('.match-card');
            const teams = matchCard.querySelectorAll('.teams strong');
            const competition = matchCard.querySelector('.match-meta span').textContent;
            const selection = input.nextElementSibling.querySelector('span').textContent;
            const odd = Number(input.nextElementSibling.querySelector('strong').textContent);
            const selectionItem = document.createElement('div');
            const selectionInfo = document.createElement('span');
            const matchName = document.createElement('span');
            const matchDetails = document.createElement('small');
            const oddValue = document.createElement('strong');
            const removeButton = document.createElement('button');

            selectionItem.className = 'slip-selection';
            selectionInfo.className = 'selection-info';
            matchName.textContent = `${teams[0].textContent} - ${teams[1].textContent}`;
            matchDetails.textContent = `${competition} / Selección: ${selection}`;
            oddValue.className = 'selection-odd';
            oddValue.textContent = odd.toFixed(2);
            removeButton.className = 'remove-selection';
            removeButton.type = 'button';
            removeButton.setAttribute('aria-label', `Quitar selección de ${matchName.textContent}`);
            removeButton.textContent = '×';
            removeButton.addEventListener('click', () => {
                input.checked = false;
                updateBetSlip();
            });

            selectionInfo.append(matchName, matchDetails);
            selectionItem.append(selectionInfo, oddValue, removeButton);
            selectionArea.append(selectionItem);
            combinedOdds *= odd;
        });

        const stake = Number(stakeInput.value) || 0;
        totalOdds.textContent = combinedOdds.toFixed(2);
        potentialWinnings.textContent = `COP $${(stake * combinedOdds).toFixed(2)}`;
    }

    toggleFormButton.addEventListener('click', () => {
        const shouldOpen = matchForm.hidden;
        matchForm.hidden = !shouldOpen;
        toggleFormButton.setAttribute('aria-expanded', String(shouldOpen));
        if (shouldOpen) matchForm.elements.competition.focus();
    });

    closeFormButton.addEventListener('click', () => {
        matchForm.hidden = true;
        toggleFormButton.setAttribute('aria-expanded', 'false');
        toggleFormButton.focus();
    });

    matchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAdmin) {
            showFeedback('Solo el administrador puede agregar partidos.', 'error');
            return;
        }
        const data = new FormData(matchForm);
        const match = {
            competition: String(data.get('competition')).trim(),
            kickoff: String(data.get('kickoff')),
            homeTeam: String(data.get('homeTeam')).trim(),
            awayTeam: String(data.get('awayTeam')).trim(),
            homeOdds: Number(data.get('homeOdds')),
            drawOdds: Number(data.get('drawOdds')),
            awayOdds: Number(data.get('awayOdds'))
        };
        if (match.homeTeam.toLocaleLowerCase('es') === match.awayTeam.toLocaleLowerCase('es')) {
            matchForm.elements.awayTeam.setCustomValidity('Los equipos deben tener nombres distintos.');
            matchForm.elements.awayTeam.reportValidity();
            matchForm.elements.awayTeam.addEventListener('input', () => {
                matchForm.elements.awayTeam.setCustomValidity('');
            }, { once: true });
            return;
        }
        matchForm.elements.awayTeam.setCustomValidity('');
        const submitButton = matchForm.querySelector('[type="submit"]');
        submitButton.disabled = true;
        try {
            const { match: savedMatch } = await window.SF_API.post('/api/matches', match);
            storedMatches.unshift(savedMatch);
            renderCustomMatches();
            matchForm.reset();
            matchForm.hidden = true;
            toggleFormButton.setAttribute('aria-expanded', 'false');
            showFeedback('Partido guardado en la base de datos. Ya puedes seleccionarlo en tu pronóstico.');
        } catch (error) {
            showFeedback(error.message, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    placeBetButton.addEventListener('click', async () => {
        if (!currentUserId) {
            showBetFeedback('Inicia sesión para guardar tu apuesta simulada.', 'error');
            return;
        }

        const selectedInputs = [...matchesPanel.querySelectorAll('.market-grid input:checked')];
        if (selectedInputs.length === 0) {
            showBetFeedback('Selecciona al menos un resultado antes de guardar tu apuesta.', 'error');
            return;
        }
        if (selectedInputs.length > 10) {
            showBetFeedback('Una apuesta puede incluir como máximo 10 selecciones.', 'error');
            return;
        }
        if (!stakeInput.reportValidity()) {
            showBetFeedback('Ingresa un importe válido de al menos COP $1.', 'error');
            stakeInput.focus();
            return;
        }

        const selections = selectedInputs.map((input) => {
            const matchCard = input.closest('.match-card');
            const teams = [...matchCard.querySelectorAll('.teams strong')];
            const choiceLabel = input.nextElementSibling.querySelector('span').textContent;
            return {
                match: `${teams[0].textContent} - ${teams[1].textContent}`,
                competition: matchCard.querySelector('.match-meta span').textContent,
                choice: choiceLabel,
                odds: Number(input.nextElementSibling.querySelector('strong').textContent)
            };
        });
        const submitButton = placeBetButton;
        submitButton.disabled = true;
        showBetFeedback('Guardando tu apuesta simulada...', 'pending');
        try {
            const { bet } = await window.SF_API.post('/api/bets', {
                stake: Number(stakeInput.value),
                selections
            });
            showBetFeedback(`Tu apuesta simulada se guardó correctamente en la base de datos (referencia: ${bet.id}).`);
        } catch (error) {
            showBetFeedback(error.message, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    customMatches.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-remove-match]');
        if (!button) return;
        button.disabled = true;
        try {
            await window.SF_API.remove(`/api/matches/${encodeURIComponent(button.dataset.removeMatch)}`);
            storedMatches = storedMatches.filter((match) => match.id !== button.dataset.removeMatch);
            renderCustomMatches();
            updateBetSlip();
            showFeedback('Partido personalizado eliminado.');
        } catch (error) {
            showFeedback(error.message, 'error');
            button.disabled = false;
        }
    });

    Promise.all([
        window.SF_API.request('/api/matches'),
        window.SF_API.request('/api/session')
    ]).then(([{ matches }, { user }]) => {
        currentUserId = user ? user.id : null;
        isAdmin = user ? user.role === 'admin' : false;
        toggleFormButton.hidden = !isAdmin;
        placeBetButton.hidden = !user;
        loginRequiredMessage.hidden = Boolean(user);
        storedMatches = matches;
        renderCustomMatches();
        updateBetSlip();
    }).catch((error) => {
        showFeedback(error.message, 'error');
        showBetFeedback('No se pudo comprobar la sesión ni guardar tu apuesta.', 'error');
    });

    matchesPanel.addEventListener('change', (event) => {
        if (event.target.matches('.market-grid input')) updateBetSlip();
    });
    stakeInput.addEventListener('input', updateBetSlip);

    updateBetSlip();
})();
