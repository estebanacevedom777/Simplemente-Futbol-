(() => {
	const grid = document.querySelector('#listing-grid');
	if (!grid) return;

	const photos = {
		Camisas: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85',
		Trofeos: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=900&q=85'
	};
	const listings = [
		{ id: 'shirt-local', title: 'Camisa local temporada 2026', category: 'Camisas', condition: 'Como nuevo', price: 189000, city: 'Bogotá, Chapinero', seller: 'Mateo Rojas', description: 'Camisa original, talla L. Usada pocas veces y en excelente estado.', image: photos.Camisas, createdAt: Date.now() - 1000 * 60 * 40 },
		{ id: 'shirt-retro', title: 'Camisa retro selección 1990', category: 'Camisas', condition: 'Buen estado', price: 175000, city: 'Bogotá, La Candelaria', seller: 'Valentina Cruz', description: 'Diseño clásico, talla M. Tiene un pequeño detalle en la manga.', image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=900&q=85', createdAt: Date.now() - 1000 * 60 * 60 * 3 },
		{ id: 'shirt-away', title: 'Camisa visitante edición especial', category: 'Camisas', condition: 'Nuevo', price: 210000, city: 'Bogotá, Teusaquillo', seller: 'Andrés Peña', description: 'Edición especial, talla S. Conserva etiquetas y empaque.', image: 'https://images.unsplash.com/photo-1564859228273-274232fdb516?auto=format&fit=crop&w=900&q=85', createdAt: Date.now() - 1000 * 60 * 60 * 5 },
		{ id: 'trophy-champion', title: 'Trofeo de campeón, 30 cm', category: 'Trofeos', condition: 'Nuevo', price: 98000, city: 'Bogotá, Usaquén', seller: 'Laura Gómez', description: 'Trofeo metálico para torneo amateur. Placa personalizable.', image: photos.Trofeos, createdAt: Date.now() - 1000 * 60 * 60 * 7 },
		{ id: 'trophy-mini', title: 'Réplica mini copa continental', category: 'Trofeos', condition: 'Como nuevo', price: 145000, city: 'Bogotá, Suba', seller: 'Santiago Ruiz', description: 'Pieza de colección con base de madera e incluye estuche.', image: photos.Trofeos, createdAt: Date.now() - 1000 * 60 * 60 * 9 },
		{ id: 'trophy-vintage', title: 'Copa vintage para colección', category: 'Trofeos', condition: 'Buen estado', price: 76000, city: 'Bogotá, Fontibón', seller: 'Nicolás Díaz', description: 'Copa decorativa de colección, conservada en muy buen estado.', image: photos.Trofeos, createdAt: Date.now() - 1000 * 60 * 60 * 13 }
	];

	const storageKey = 'sf-market-listings';
	const favoritesKey = 'sf-market-favorites';
	const readStorage = (key, fallback) => {
		try {
			return JSON.parse(localStorage.getItem(key)) ?? fallback;
		} catch {
			return fallback;
		}
	};
	const storedListings = readStorage(storageKey, []);
	const storedFavorites = readStorage(favoritesKey, []);
	const userListings = Array.isArray(storedListings)
		? storedListings.filter((item) => item && typeof item.id === 'string'
			&& ['Camisas', 'Trofeos'].includes(item.category) && Number.isFinite(Number(item.price)))
		: [];
	const favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites : []);

	const searchInput = document.querySelector('#listing-search');
	const locationInput = document.querySelector('#listing-location');
	const sortSelect = document.querySelector('#sort-listings');
	const resultsCount = document.querySelector('#results-count');
	const locationLabel = document.querySelector('#results-location');
	const favoritesButton = document.querySelector('#show-favorites');
	const listingDialog = document.querySelector('#listing-dialog');
	const listingForm = document.querySelector('#listing-form');
	const detailDialog = document.querySelector('#detail-dialog');
	const messageDialog = document.querySelector('#message-dialog');
	const messageForm = document.querySelector('#message-form');
	const toast = document.querySelector('#market-toast');
	let activeCategory = 'all';
	let onlyFavorites = false;
	let currentListing = null;
	let toastTimer;

	const formatPrice = (price) => new Intl.NumberFormat('es-CO', {
		style: 'currency', currency: 'COP', maximumFractionDigits: 0
	}).format(price);

	function notify(message) {
		toast.textContent = message;
		toast.classList.add('visible');
		window.clearTimeout(toastTimer);
		toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3200);
	}

	function save(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			notify('No se pudo guardar el cambio en este navegador.');
		}
	}

	function element(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined) node.textContent = text;
		return node;
	}

	function createCard(item) {
		const card = element('article', 'listing-card');
		const photoWrap = element('div', 'listing-photo-wrap');
		const image = element('img', 'listing-photo');
		image.src = item.image || photos[item.category] || photos.Camisas;
		image.alt = item.title;
		image.loading = 'lazy';

		const tag = element('span', 'listing-category-tag', item.category);
		const favorite = element('button', 'favorite-button', favorites.has(item.id) ? '♥' : '♡');
		favorite.type = 'button';
		favorite.dataset.action = 'favorite';
		favorite.dataset.id = item.id;
		favorite.setAttribute('aria-pressed', String(favorites.has(item.id)));
		favorite.setAttribute('aria-label', `Guardar ${item.title} en favoritos`);
		photoWrap.append(image, tag, favorite);

		const info = element('div', 'listing-info');
		info.append(element('p', 'listing-price', formatPrice(Number(item.price))));
		info.append(element('h3', 'listing-title', item.title));
		const meta = element('div', 'listing-meta');
		meta.append(element('span', '', item.condition || 'Buen estado'));
		meta.append(element('span', '', item.city || 'Bogotá'));
		info.append(meta);
		const seller = element('div', 'seller-row');
		seller.append(element('span', 'seller-avatar', (item.seller || 'V').charAt(0).toUpperCase()));
		seller.append(element('span', '', item.seller || 'Vendedor de la comunidad'));
		info.append(seller);
		const view = element('button', 'view-listing', 'Ver anuncio');
		view.type = 'button';
		view.dataset.action = 'view';
		view.dataset.id = item.id;
		info.append(view);
		card.append(photoWrap, info);
		return card;
	}

	function filteredListings() {
		const query = searchInput.value.trim().toLocaleLowerCase('es');
		const location = locationInput.value.trim().toLocaleLowerCase('es');
		const allListings = [...userListings, ...listings];
		const visible = allListings.filter((item) => {
			const text = `${item.title} ${item.category} ${item.description} ${item.seller} ${item.city}`.toLocaleLowerCase('es');
			return (!query || text.includes(query))
				&& (!location || String(item.city).toLocaleLowerCase('es').includes(location))
				&& (activeCategory === 'all' || item.category === activeCategory)
				&& (!onlyFavorites || favorites.has(item.id));
		});

		if (sortSelect.value === 'newest') visible.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
		if (sortSelect.value === 'price-asc') visible.sort((a, b) => a.price - b.price);
		if (sortSelect.value === 'price-desc') visible.sort((a, b) => b.price - a.price);
		return visible;
	}

	function render() {
		const visible = filteredListings();
		grid.replaceChildren();
		resultsCount.textContent = `${visible.length} ${visible.length === 1 ? 'anuncio' : 'anuncios'}`;
		locationLabel.textContent = locationInput.value.trim()
			? `${locationInput.value.trim()} y alrededores`
			: 'Todas las ubicaciones';

		if (!visible.length) {
			const empty = element('div', 'empty-results');
			empty.append(element('strong', '', 'No encontramos anuncios'));
			empty.append(element('p', '', 'Prueba otra búsqueda o limpia los filtros.'));
			const clear = element('button', '', 'Limpiar búsqueda');
			clear.type = 'button';
			clear.dataset.action = 'clear';
			empty.append(clear);
			grid.append(empty);
			return;
		}
		visible.forEach((item) => grid.append(createCard(item)));
	}

	function clearFilters() {
		searchInput.value = '';
		locationInput.value = '';
		sortSelect.value = 'recommended';
		activeCategory = 'all';
		onlyFavorites = false;
		favoritesButton.setAttribute('aria-pressed', 'false');
		favoritesButton.textContent = '♡ Guardados';
		document.querySelectorAll('.category-chip').forEach((chip) => {
			const active = chip.dataset.category === 'all';
			chip.classList.toggle('active', active);
			chip.setAttribute('aria-pressed', String(active));
		});
		render();
	}

	function openDetails(item) {
		currentListing = item;
		const image = document.querySelector('#detail-image');
		image.src = item.image || photos[item.category] || photos.Camisas;
		image.alt = item.title;
		document.querySelector('#detail-category').textContent = item.category;
		document.querySelector('#detail-title').textContent = item.title;
		document.querySelector('#detail-price').textContent = formatPrice(Number(item.price));
		document.querySelector('#detail-description').textContent = item.description || 'Sin descripción.';
		document.querySelector('#detail-condition').textContent = item.condition || 'Buen estado';
		document.querySelector('#detail-location').textContent = item.city || 'Bogotá';
		document.querySelector('#detail-seller').textContent = item.seller || 'Vendedor de la comunidad';
		document.querySelector('#detail-avatar').textContent = (item.seller || 'V').charAt(0).toUpperCase();
		detailDialog.showModal();
	}

	document.querySelector('#search-form').addEventListener('submit', (event) => {
		event.preventDefault();
		render();
	});
	[searchInput, locationInput].forEach((input) => input.addEventListener('input', render));
	sortSelect.addEventListener('change', render);

	document.querySelectorAll('.category-chip').forEach((chip) => {
		chip.addEventListener('click', () => {
			activeCategory = chip.dataset.category;
			document.querySelectorAll('.category-chip').forEach((button) => {
				const active = button === chip;
				button.classList.toggle('active', active);
				button.setAttribute('aria-pressed', String(active));
			});
			render();
		});
	});

	favoritesButton.addEventListener('click', () => {
		onlyFavorites = !onlyFavorites;
		favoritesButton.setAttribute('aria-pressed', String(onlyFavorites));
		favoritesButton.textContent = onlyFavorites ? '♥ Guardados' : '♡ Guardados';
		render();
	});

	grid.addEventListener('click', (event) => {
		const button = event.target.closest('button[data-action]');
		if (!button) return;
		if (button.dataset.action === 'clear') {
			clearFilters();
			return;
		}
		const item = [...userListings, ...listings].find((listing) => listing.id === button.dataset.id);
		if (!item) return;
		if (button.dataset.action === 'view') {
			openDetails(item);
			return;
		}
		if (favorites.has(item.id)) {
			favorites.delete(item.id);
		} else {
			favorites.add(item.id);
		}
		save(favoritesKey, [...favorites]);
		render();
	});

	document.querySelector('#clear-filters').addEventListener('click', clearFilters);
	document.querySelectorAll('#open-listing-dialog, #mobile-publish').forEach((button) => {
		button.addEventListener('click', () => listingDialog.showModal());
	});
	document.querySelectorAll('[data-close-dialog]').forEach((button) => {
		button.addEventListener('click', () => button.closest('dialog').close());
	});
	[listingDialog, detailDialog, messageDialog].forEach((dialog) => {
		dialog.addEventListener('click', (event) => {
			if (event.target === dialog) dialog.close();
		});
	});

	listingForm.addEventListener('submit', (event) => {
		event.preventDefault();
		const data = new FormData(listingForm);
		const item = {
			id: `user-${Date.now()}`,
			title: String(data.get('title')).trim(),
			category: String(data.get('category')),
			condition: String(data.get('condition')),
			price: Number(data.get('price')),
			city: String(data.get('city')).trim(),
			seller: 'Tú',
			description: String(data.get('description')).trim(),
			image: String(data.get('image')).trim() || photos[String(data.get('category'))],
			createdAt: Date.now()
		};
		userListings.unshift(item);
		save(storageKey, userListings);
		listingForm.reset();
		document.querySelector('#listing-city').value = 'Bogotá';
		listingDialog.close();
		clearFilters();
		notify('Anuncio publicado en este navegador.');
	});

	document.querySelector('#contact-seller').addEventListener('click', () => {
		if (!currentListing) return;
		document.querySelector('#message-recipient').textContent = `Para ${currentListing.seller}: ${currentListing.title}`;
		detailDialog.close();
		messageDialog.showModal();
	});

	messageForm.addEventListener('submit', (event) => {
		event.preventDefault();
		if (!currentListing) return;
		messageDialog.close();
		messageForm.reset();
		notify(`Mensaje de demostración preparado para ${currentListing.seller}.`);
	});

	render();
})();
