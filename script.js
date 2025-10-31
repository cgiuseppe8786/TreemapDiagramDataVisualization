// ============================================================
// TREEMAP – multi dataset – D3.js
// ============================================================

const DATASETS = {
    games: {
        url: 'https://cdn.freecodecamp.org/testable-projects-fcc/data/tree_map/video-game-sales-data.json',
        title: 'Video Game Sales Treemap',
        description: 'Vendite globali (in milioni) per piattaforma / publisher.'
    },
    movies: {
        url: 'https://cdn.freecodecamp.org/testable-projects-fcc/data/tree_map/movie-data.json',
        title: 'Movies Data Set Treemap',
        description: 'Incassi (in milioni) dei film per categoria/ studio.'
    },
    kickstarter: {
        url: 'https://cdn.freecodecamp.org/testable-projects-fcc/data/tree_map/kickstarter-funding-data.json',
        title: 'Kickstarter Data Set Treemap',
        description: 'Finanziamenti raccolti dai progetti Kickstarter, per categoria.'
    }
};

// dimensioni logiche
const WIDTH = 1100;
const HEIGHT = 520;

// scala colori condivisa
const COLOR_SCALE = d3.scaleOrdinal(d3.schemeTableau10);

// riferimenti DOM
const chartContainer = d3.select('#chart');
const tooltip = d3.select('#tooltip');
const legend = d3.select('#legend');
const titleEl = document.getElementById('title');
const descEl = document.getElementById('description');
const containerEl = document.getElementById('container');
document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // INIZIALIZZAZIONE TEMA + CARICAMENTO PRIMO DATASET
    // ============================================================
    const themeToggle = document.getElementById("theme-toggle");
    const body = document.body;

    // Se l’utente ha già scelto un tema in passato, rispettiamolo
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
        body.dataset.theme = savedTheme;
        themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
    } else {
        // Altrimenti partiamo dalla preferenza di sistema
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        body.dataset.theme = prefersDark ? "dark" : "light";
        themeToggle.textContent = prefersDark ? "☀️" : "🌙";
    }

    function toggleTheme() {
        const isDark = body.dataset.theme === "dark";
        body.dataset.theme = isDark ? "light" : "dark";
        localStorage.setItem("theme", body.dataset.theme);
        themeToggle.textContent = isDark ? "🌙" : "☀️";
    }

    // Click con mouse
    themeToggle.addEventListener("click", toggleTheme);
    // Accessibilità: Invio o barra spaziatrice su elemento focusable
    themeToggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") toggleTheme();
    });

    // init dataset di default
    loadTreemap('games');

    // binding pulsanti dataset
    const dsButtons = document.querySelectorAll('#dataset-switch .ds-btn');
    dsButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.dataset;
            // attiva btn
            dsButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            // carica dataset
            loadTreemap(key);
        });
    });
});


// ============================================================
// FUNZIONE PRINCIPALE DI CARICAMENTO
// ============================================================
async function loadTreemap(datasetKey) {
    const cfg = DATASETS[datasetKey];
    if (!cfg) return;

    try {
        const data = await d3.json(cfg.url);

        // aggiorna titolo e descrizione
        titleEl.textContent = cfg.title;
        descEl.textContent = cfg.description;

        // pulisci chart e legend prima di ricreare
        chartContainer.selectAll('*').remove();
        legend.selectAll('*').remove();

        // gerarchia
        const root = d3
            .hierarchy(data)
            .eachBefore((d) => {
                d.data.id = (d.parent ? d.parent.data.id + '.' : '') + d.data.name;
            })
            .sum((d) => d.value || 0)
            .sort((a, b) => b.value - a.value);

        // layout
        d3.treemap().size([WIDTH, HEIGHT]).paddingInner(1.1)(root);

        const svg = chartContainer
            .append('svg')
            .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const leaves = root.leaves();

        // categorie uniche per la legenda
        const categories = [...new Set(leaves.map((d) => d.data.category))];
        COLOR_SCALE.domain(categories);

        // gruppo tile
        const tileGroup = svg
            .selectAll('g')
            .data(leaves)
            .enter()
            .append('g')
            .attr('transform', (d) => `translate(${d.x0}, ${d.y0})`);

        // rettangolo richiesto dai test
        tileGroup
            .append('rect')
            .attr('class', 'tile')
            .attr('data-name', (d) => d.data.name)
            .attr('data-category', (d) => d.data.category)
            .attr('data-value', (d) => d.data.value)
            .attr('width', (d) => d.x1 - d.x0)
            .attr('height', (d) => d.y1 - d.y0)
            .attr('fill', (d) => COLOR_SCALE(d.data.category))
            .on('mousemove', (event, d) => {
                // testo tooltip
                tooltip
                    .attr('data-value', d.data.value)
                    .html(
                        `<strong>${d.data.name}</strong><br/>
             Categoria: ${d.data.category}<br/>
             Valore: ${d.data.value}`
                    )
                    .classed('hidden', false);

                // bounding box del container
                const rect = containerEl.getBoundingClientRect();

                // coordinate del mouse rispetto al container
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;

                // offset mini per non coprire il puntatore
                const offset = 8;

                // posiziona
                tooltip
                    .style('left', mouseX + offset + 'px')
                    .style('top', mouseY + offset + 'px');
            })
            .on('mouseout', () => {
                tooltip.classed('hidden', true);
            });

        // etichette tile
        tileGroup
            .append('text')
            .attr('class', 'tile-label')
            .attr('x', 4)
            .attr('y', 12)
            .each(function (d) {
                const node = d3.select(this);
                const name = d.data.name;
                const width = d.x1 - d.x0;
                const maxChars = Math.floor(width / 6.5);

                if (name.length <= maxChars) {
                    node.text(name);
                    return;
                }

                const first = name.slice(0, maxChars);
                const second = name.slice(maxChars, maxChars * 2);

                node.append('tspan').text(first).attr('x', 4).attr('dy', 0);
                node
                    .append('tspan')
                    .text(second + (name.length > maxChars * 2 ? '…' : ''))
                    .attr('x', 4)
                    .attr('dy', 11);
            });

        // legenda
        buildLegend(categories);
    } catch (err) {
        console.error('Errore nel caricamento del dataset', datasetKey, err);
    }
}


// ============================================================
// LEGENDA
// ============================================================
function buildLegend(categories) {
    legend.selectAll('*').remove();

    // contenitore flessibile (il tuo div #legend già esiste)
    const entry = legend
        .selectAll('.legend-entry')
        .data(categories)
        .enter()
        .append('div')
        .attr('class', 'legend-entry');
    const svg = entry
        .append('svg')
        .attr('width', 18)
        .attr('height', 18);

    svg.append('rect')
        .attr('class', 'legend-item')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => COLOR_SCALE(d));

    // testo accanto
    entry
        .append('span')
        .text(d => d);
}

