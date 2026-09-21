 const selectionArea = document.querySelector('.slip-selections');
        const stakeInput = document.querySelector('#stake');
        const totalOdds = document.querySelector('.slip-total strong');
        const potentialWinnings = document.querySelector('.slip-total.potential strong');
        const oddsInputs = document.querySelectorAll('.market-grid input');

        function updateBetSlip() {
            const selectedInputs = [...oddsInputs].filter((input) => input.checked);
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
                removeButton.setAttribute('aria-label', 'Quitar selección');
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

        oddsInputs.forEach((input) => input.addEventListener('change', updateBetSlip));
        stakeInput.addEventListener('input', updateBetSlip);