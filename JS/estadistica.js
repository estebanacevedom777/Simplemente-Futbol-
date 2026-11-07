(() => {
    const leagueFilter = document.querySelector('#league-filter');
    const metricFilter = document.querySelector('#chart-metric');
    const teamGrid = document.querySelector('#team-chart-grid');
    const tableBody = document.querySelector('#team-table-body');
    const teamName = document.querySelector('#active-team-name');
    const teamRating = document.querySelector('#team-rating');
    const ratingGauge = document.querySelector('#team-rating-gauge');
    const teamSummary = document.querySelector('#team-summary');
    const metricChart = document.querySelector('#metric-chart');
    const exportButton = document.querySelector('#export-stats');
    const themeButton = document.querySelector('#toggle-theme');

    if (!leagueFilter || !metricFilter || !teamGrid || !tableBody || !teamName
        || !teamRating || !ratingGauge || !teamSummary || !metricChart
        || !exportButton || !themeButton) {
        return;
    }

    const teamsByLeague = {
        'Premier League': [
            { name: 'Arsenal', logo: 42, goals: 34, xg: 2.42, xgTotal: 29.1, ppda: 8.8, points: 81, possession: 61, pressure: 82, rating: 84, trend: 15, pace: 'Alto' },
            { name: 'Liverpool', logo: 40, goals: 32, xg: 2.37, xgTotal: 28.4, ppda: 9.2, points: 78, possession: 59, pressure: 77, rating: 81, trend: 11, pace: 'Alto' },
            { name: 'Manchester City', logo: 50, goals: 30, xg: 2.29, xgTotal: 27.5, ppda: 10.4, points: 76, possession: 66, pressure: 72, rating: 83, trend: 10, pace: 'Alto' },
            { name: 'Aston Villa', logo: 66, goals: 26, xg: 1.90, xgTotal: 22.8, ppda: 11.7, points: 67, possession: 53, pressure: 65, rating: 73, trend: 6, pace: 'Medio' }
        ],
        LaLiga: [
            { name: 'Real Madrid', logo: 541, goals: 31, xg: 2.41, xgTotal: 27.8, ppda: 9.4, points: 79, possession: 62, pressure: 78, rating: 78, trend: 12, pace: 'Alto' },
            { name: 'Barcelona', logo: 529, goals: 28, xg: 2.18, xgTotal: 25.9, ppda: 10.1, points: 74, possession: 58, pressure: 73, rating: 74, trend: 8, pace: 'Alto' },
            { name: 'Girona', logo: 547, goals: 29, xg: 2.06, xgTotal: 24.7, ppda: 11.3, points: 71, possession: 57, pressure: 68, rating: 75, trend: 13, pace: 'Alto' },
            { name: 'Atlético de Madrid', logo: 530, goals: 25, xg: 1.93, xgTotal: 23.2, ppda: 12.1, points: 65, possession: 51, pressure: 63, rating: 70, trend: 5, pace: 'Medio' }
        ],
        'Serie A': [
            { name: 'Inter', logo: 505, goals: 33, xg: 2.41, xgTotal: 28.9, ppda: 8.9, points: 82, possession: 60, pressure: 81, rating: 86, trend: 16, pace: 'Alto' },
            { name: 'Juventus', logo: 496, goals: 24, xg: 1.78, xgTotal: 21.3, ppda: 12.6, points: 69, possession: 49, pressure: 62, rating: 72, trend: 4, pace: 'Medio' },
            { name: 'Milan', logo: 489, goals: 27, xg: 2.07, xgTotal: 24.8, ppda: 10.8, points: 70, possession: 55, pressure: 70, rating: 76, trend: 9, pace: 'Alto' },
            { name: 'Atalanta', logo: 499, goals: 26, xg: 1.98, xgTotal: 23.7, ppda: 9.8, points: 66, possession: 52, pressure: 75, rating: 74, trend: 7, pace: 'Alto' }
        ],
        'Liga MX': [
            { name: 'América', logo: 2282, goals: 30, xg: 2.20, xgTotal: 26.4, ppda: 9.1, points: 75, possession: 59, pressure: 79, rating: 82, trend: 14, pace: 'Alto' },
            { name: 'Monterrey', logo: 2283, goals: 27, xg: 1.98, xgTotal: 23.8, ppda: 10.2, points: 69, possession: 56, pressure: 74, rating: 78, trend: 10, pace: 'Alto' },
            { name: 'Tigres', logo: 2284, goals: 25, xg: 1.88, xgTotal: 22.6, ppda: 11.4, points: 64, possession: 54, pressure: 68, rating: 73, trend: 6, pace: 'Medio' },
            { name: 'Pachuca', logo: 2285, goals: 28, xg: 2.01, xgTotal: 24.1, ppda: 8.7, points: 68, possession: 57, pressure: 83, rating: 80, trend: 12, pace: 'Alto' }
        ]
    };

    let activeTeamName = '';
    let visibleTeams = [];

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function createTeamCrest(team, size = 'normal') {
        const crest = element('span', `team-crest team-crest-${size}`);
        const image = element('img');
        const initials = element('span', 'team-crest-fallback', team.name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toLocaleUpperCase('es'));
        image.src = `https://media.api-sports.io/football/teams/${team.logo}.png`;
        image.alt = `Escudo de ${team.name}`;
        image.loading = 'lazy';
        image.addEventListener('error', () => {
            image.hidden = true;
            initials.hidden = false;
        }, { once: true });
        initials.hidden = true;
        crest.append(image, initials);
        return crest;
    }

    function getMetricValue(team, metric) {
        if (metric === 'xg') return team.xg;
        if (metric === 'possession') return team.possession;
        return team.pressure;
    }

    function metricLabel(metric) {
        if (metric === 'xg') return 'xG';
        if (metric === 'possession') return 'Posesión';
        return 'Presión';
    }

    function renderTeams() {
        visibleTeams = teamsByLeague[leagueFilter.value] || [];
        if (!visibleTeams.some((team) => team.name === activeTeamName)) {
            activeTeamName = visibleTeams[0]?.name || '';
        }

        teamGrid.replaceChildren(...visibleTeams.map((team) => {
            const card = element('article', 'team-chart-card');
            const header = element('div', 'team-card-head');
            const identity = element('div', 'team-identity');
            const name = element('span', 'team-name', team.name);
            const trend = element('span', 'metric-badge positive', `+${team.trend}%`);
            const sparkline = element('div', team.trend < 6 ? 'sparkline sparkline-flat' : 'sparkline sparkline-up');
            sparkline.setAttribute('role', 'img');
            sparkline.setAttribute('aria-label', `Tendencia de demostración de ${team.name}`);
            const metrics = element('ul', 'mini-metrics');
            const select = element('button', 'team-select', team.name === activeTeamName ? 'Equipo activo' : 'Analizar equipo');
            identity.append(createTeamCrest(team), name);
            header.append(identity, trend);
            [
                ['PPDA', team.ppda.toFixed(1)],
                ['xG prom.', team.xg.toFixed(2)],
                ['Pose.', `${team.possession}%`]
            ].forEach(([label, value]) => {
                const item = element('li');
                item.append(element('span', '', label), element('strong', '', value));
                metrics.append(item);
            });
            select.type = 'button';
            select.dataset.teamName = team.name;
            select.setAttribute('aria-pressed', String(team.name === activeTeamName));
            card.append(header, sparkline, metrics, select);
            return card;
        }));

        tableBody.replaceChildren(...visibleTeams.map((team) => {
            const row = element('tr');
            const teamCell = element('td');
            const identity = element('span', 'team-identity');
            identity.append(createTeamCrest(team, 'small'), element('span', '', team.name));
            teamCell.append(identity);
            row.append(teamCell);
            [String(team.goals), team.xgTotal.toFixed(1), team.ppda.toFixed(1), String(team.points)]
                .forEach((value) => row.append(element('td', '', value)));
            return row;
        }));

        renderActiveTeam();
        renderMetricChart();
    }

    function renderActiveTeam() {
        const team = visibleTeams.find((item) => item.name === activeTeamName);
        if (!team) return;
        teamName.replaceChildren(createTeamCrest(team, 'large'), element('span', '', team.name));
        teamRating.textContent = `${team.rating}%`;
        ratingGauge.style.background = `conic-gradient(#00f4c3 0 ${team.rating}%, rgba(255,255,255,0.08) ${team.rating}% 100%)`;
        teamSummary.replaceChildren();
        [
            ['Presión alta', `${team.pressure}%`],
            ['xG promedio', team.xg.toFixed(2)],
            ['Ritmo', team.pace]
        ].forEach(([label, value]) => {
            const item = element('li');
            item.append(element('span', '', label), element('strong', '', value));
            teamSummary.append(item);
        });
        teamGrid.querySelectorAll('.team-select').forEach((button) => {
            const isActive = button.dataset.teamName === activeTeamName;
            button.textContent = isActive ? 'Equipo activo' : 'Analizar equipo';
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    function renderMetricChart() {
        const metric = metricFilter.value;
        const maxValue = Math.max(...visibleTeams.map((team) => getMetricValue(team, metric)), 1);
        metricChart.setAttribute('aria-label', `Comparación de ${metricLabel(metric)}`);
        metricChart.replaceChildren(...visibleTeams.map((team) => {
            const value = getMetricValue(team, metric);
            const group = element('div', 'bar-group');
            const valueLabel = element('span', 'bar-value', metric === 'xg' ? value.toFixed(1) : `${value}%`);
            const bar = element('div', 'bar');
            const fill = element('i');
            const crest = createTeamCrest(team, 'chart');
            const label = element('span', 'bar-label', team.name);
            fill.style.height = `${Math.max(8, (value / maxValue) * 100)}%`;
            bar.append(fill);
            group.append(valueLabel, bar, crest, label);
            return group;
        }));
    }

    function exportCsv() {
        const header = ['Equipo', 'Goles a favor', 'xG promedio', 'xG total', 'PPDA', 'Puntos', 'Posesión', 'Presión', 'Valoración'];
        const rows = visibleTeams.map((team) => [
            team.name, team.goals, team.xg.toFixed(2), team.xgTotal.toFixed(1), team.ppda.toFixed(1),
            team.points, `${team.possession}%`, `${team.pressure}%`, `${team.rating}%`
        ]);
        const csv = [header, ...rows]
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
        const link = element('a');
        link.href = url;
        link.download = `simplemente-futbol-${leagueFilter.value.toLowerCase().replace(/\s+/g, '-')}.csv`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    leagueFilter.addEventListener('change', renderTeams);
    metricFilter.addEventListener('change', renderMetricChart);
    teamGrid.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-team-name]');
        if (!button) return;
        activeTeamName = button.dataset.teamName;
        renderActiveTeam();
    });
    exportButton.addEventListener('click', exportCsv);
    themeButton.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('stats-light');
        themeButton.setAttribute('aria-pressed', String(isLight));
        themeButton.textContent = isLight ? 'Modo oscuro' : 'Modo claro';
    });

    renderTeams();
})();
