(() => {
    const stories = [
        {
            id: 'presion-alta',
            category: 'Táctica',
            title: 'La presión alta: defender atacando',
            summary: 'Por qué algunos equipos buscan recuperar el balón cerca del área rival y qué riesgos asumen al hacerlo.',
            detail: 'La presión funciona como una acción colectiva: el primer jugador orienta la salida, sus compañeros cierran líneas de pase y la defensa adelanta metros para reducir espacios. Si el rival supera esa primera línea, el equipo que presiona debe reaccionar rápido y proteger la espalda.'
        },
        {
            id: 'espacios',
            category: 'Táctica',
            title: 'El valor de los espacios sin balón',
            summary: 'Los movimientos que no terminan en una recepción también pueden abrir el camino hacia el arco.',
            detail: 'Un desmarque puede arrastrar a un defensor, liberar un pasillo o dar tiempo al compañero que lleva la pelota. Mirar el juego sin seguir únicamente el balón ayuda a descubrir cómo se construyen muchas ocasiones.'
        },
        {
            id: 'cantera',
            category: 'Historias',
            title: 'De la cantera al primer equipo',
            summary: 'El recorrido de un juvenil exige paciencia, adaptación y oportunidades para crecer dentro del club.',
            detail: 'El talento es solo una parte del proceso. La formación combina aprendizaje táctico, preparación física y acompañamiento personal; el salto al fútbol profesional suele llegar paso a paso, con minutos y responsabilidades cada vez mayores.'
        },
        {
            id: 'clasicos',
            category: 'Historias',
            title: 'Por qué un clásico nunca es un partido más',
            summary: 'Rivalidad, memoria y pertenencia convierten noventa minutos en una historia compartida.',
            detail: 'Los clásicos se alimentan de generaciones de recuerdos, pero cada encuentro escribe un capítulo nuevo. El contexto de la ciudad y la afición puede cambiar la atmósfera, mientras que en la cancha los detalles deciden el resultado.'
        },
        {
            id: 'aficion',
            category: 'Cultura',
            title: 'La tribuna también juega',
            summary: 'Cantos, colores y rituales hacen de cada estadio un escenario con identidad propia.',
            detail: 'La afición crea comunidad antes, durante y después del partido. Sus tradiciones expresan la historia de un club y acompañan a quienes encuentran en el fútbol un punto de encuentro, en casa o lejos de ella.'
        },
        {
            id: 'futbol-femenino',
            category: 'Cultura',
            title: 'El crecimiento del fútbol femenino',
            summary: 'Más visibilidad y mejores estructuras abren nuevas oportunidades para jugadoras y aficiones.',
            detail: 'La expansión del fútbol femenino se construye con inversión sostenida, formación, espacios de difusión y acceso para nuevas generaciones. Cada paso fortalece la competencia y acerca más historias del juego a quienes las quieren seguir.'
        }
    ];

    const grid = document.querySelector('#story-grid');
    const searchInput = document.querySelector('#story-search');
    const resultLabel = document.querySelector('#story-results');
    const emptyMessage = document.querySelector('#story-empty');
    const savedCount = document.querySelector('#saved-count');
    const filterButtons = [...document.querySelectorAll('.filter-chip')];

    if (!grid || !searchInput || !resultLabel || !emptyMessage || !savedCount) {
        return;
    }

    let activeCategory = 'Todas';
    const savedStories = new Set();
    const expandedStories = new Set();

    function normalize(value) {
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
    }

    function createAction(label, action, storyId, pressed) {
        const button = document.createElement('button');
        button.className = `story-action${action === 'save' ? ' save-action' : ''}`;
        button.type = 'button';
        button.dataset.action = action;
        button.dataset.storyId = storyId;
        if (typeof pressed === 'boolean') {
            button.setAttribute('aria-pressed', String(pressed));
        }
        button.textContent = label;
        return button;
    }

    function createCard(story) {
        const card = document.createElement('article');
        const category = document.createElement('span');
        const title = document.createElement('h3');
        const summary = document.createElement('p');
        const actions = document.createElement('div');
        const isExpanded = expandedStories.has(story.id);
        const isSaved = savedStories.has(story.id);

        card.className = 'story-card';
        category.className = 'story-category';
        category.textContent = story.category;
        title.textContent = story.title;
        summary.textContent = story.summary;
        actions.className = 'story-actions';
        actions.append(
            createAction(isExpanded ? 'Cerrar análisis' : 'Leer análisis', 'expand', story.id)
        );
        actions.append(
            createAction(isSaved ? 'Guardada ✓' : 'Guardar', 'save', story.id, isSaved)
        );
        card.append(category, title, summary);

        if (isExpanded) {
            const detail = document.createElement('p');
            detail.className = 'story-detail';
            detail.textContent = story.detail;
            card.append(detail);
        }

        card.append(actions);
        return card;
    }

    function renderStories() {
        const query = normalize(searchInput.value.trim());
        const visibleStories = stories.filter((story) => {
            const matchesCategory = activeCategory === 'Todas'
                || (activeCategory === 'Guardadas'
                    ? savedStories.has(story.id)
                    : story.category === activeCategory);
            const searchableText = normalize(`${story.category} ${story.title} ${story.summary} ${story.detail}`);
            return matchesCategory && searchableText.includes(query);
        });

        grid.replaceChildren(...visibleStories.map(createCard));
        emptyMessage.hidden = visibleStories.length > 0;
        resultLabel.textContent = `${visibleStories.length} ${visibleStories.length === 1 ? 'historia' : 'historias'}`;
        savedCount.textContent = String(savedStories.size);
    }

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            activeCategory = button.dataset.category;
            filterButtons.forEach((filter) => {
                const isActive = filter === button;
                filter.classList.toggle('active', isActive);
                filter.setAttribute('aria-pressed', String(isActive));
            });
            renderStories();
        });
    });

    searchInput.addEventListener('input', renderStories);

    grid.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }

        const { action, storyId } = button.dataset;
        if (action === 'save') {
            if (savedStories.has(storyId)) {
                savedStories.delete(storyId);
            } else {
                savedStories.add(storyId);
            }
        } else if (action === 'expand') {
            if (expandedStories.has(storyId)) {
                expandedStories.delete(storyId);
            } else {
                expandedStories.add(storyId);
            }
        } else {
            return;
        }

        renderStories();
    });

    renderStories();
})();
