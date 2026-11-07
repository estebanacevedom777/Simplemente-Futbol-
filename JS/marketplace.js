(() => {
	const grid = document.querySelector('#listing-grid');
	if (!grid) return;

	const photos = {
		localShirt: {
			url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/National_Football_Museum_displays_23.jpg/960px-National_Football_Museum_displays_23.jpg',
			credit: 'Hmickey · CC BY-SA 4.0',
			source: 'https://commons.wikimedia.org/wiki/File:National_Football_Museum_displays_23.jpg'
		},
		retroShirt: {
			url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Maglia_di_paolo_maldini_indossata_in_italia_90%2C_01.JPG/960px-Maglia_di_paolo_maldini_indossata_in_italia_90%2C_01.JPG',
			credit: 'Sailko · CC BY 3.0',
			source: 'https://commons.wikimedia.org/wiki/File:Maglia_di_paolo_maldini_indossata_in_italia_90,_01.JPG'
		},
		awayShirt: {
			url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/National_Football_Museum_displays_49.jpg/960px-National_Football_Museum_displays_49.jpg',
			credit: 'Hmickey · CC BY-SA 4.0',
			source: 'https://commons.wikimedia.org/wiki/File:National_Football_Museum_displays_49.jpg'
		},
		championTrophy: {
			url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/FA_Cup_Trophy_at_Manchester_National_Football_Museum_%28Ank_Kumar%29_01.jpg/960px-FA_Cup_Trophy_at_Manchester_National_Football_Museum_%28Ank_Kumar%29_01.jpg',
			credit: 'Ank Kumar · CC BY-SA 4.0',
			source: 'https://commons.wikimedia.org/wiki/File:FA_Cup_Trophy_at_Manchester_National_Football_Museum_(Ank_Kumar)_01.jpg'
		},
		miniTrophy: {
			url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/FIFA_World_Cup_Trophy_%28Jules_Rimet_Trophy%29_at_National_Football_Museum%2C_Manchester_01.jpg/960px-FIFA_World_Cup_Trophy_%28Jules_Rimet_Trophy%29_at_National_Football_Museum%2C_Manchester_01.jpg',
			credit: 'Ank Kumar · CC BY-SA 4.0',
			source: 'https://commons.wikimedia.org/wiki/File:FIFA_World_Cup_Trophy_(Jules_Rimet_Trophy)_at_National_Football_Museum,_Manchester_01.jpg'
		},
		vintageTrophy: {
			url: 'https://upload.wikimedia.org/wikipedia/commons/1/12/1927_Joseph_H._Jolley_Trophy_for_the_Eastern_Football_Championship.jpg',
			credit: 'Dominio público',
			source: 'https://commons.wikimedia.org/wiki/File:1927_Joseph_H._Jolley_Trophy_for_the_Eastern_Football_Championship.jpg'
		}
	};
	const categoryPhotos = {
		Camisas: photos.localShirt,
		Trofeos: photos.championTrophy
	};
	const listings = [
		{ id: 'shirt-local', title: 'Camisa local temporada 2026', category: 'Camisas', condition: 'Como nuevo', price: 189000, city: 'Bogotá, Chapinero', seller: 'Mateo Rojas', description: 'Camisa original, talla L. Usada pocas veces y en excelente estado.', photo: photos.localShirt, createdAt: Date.now() - 1000 * 60 * 40 },
		{ id: 'shirt-retro', title: 'Camisa retro selección 1990', category: 'Camisas', condition: 'Buen estado', price: 175000, city: 'Bogotá, La Candelaria', seller: 'Valentina Cruz', description: 'Diseño clásico, talla M. Tiene un pequeño detalle en la manga.', photo: photos.retroShirt, createdAt: Date.now() - 1000 * 60 * 60 * 3 },
		{ id: 'shirt-away', title: 'Camisa visitante edición especial', category: 'Camisas', condition: 'Nuevo', price: 210000, city: 'Bogotá, Teusaquillo', seller: 'Andrés Peña', description: 'Edición especial, talla S. Conserva etiquetas y empaque.', photo: photos.awayShirt, createdAt: Date.now() - 1000 * 60 * 60 * 5 },
		{ id: 'trophy-champion', title: 'Trofeo de campeón, 30 cm', category: 'Trofeos', condition: 'Nuevo', price: 98000, city: 'Bogotá, Usaquén', seller: 'Laura Gómez', description: 'Trofeo metálico para torneo amateur. Placa personalizable.', photo: photos.championTrophy, createdAt: Date.now() - 1000 * 60 * 60 * 7 },
		{ id: 'trophy-mini', title: 'Réplica mini copa continental', category: 'Trofeos', condition: 'Como nuevo', price: 145000, city: 'Bogotá, Suba', seller: 'Santiago Ruiz', description: 'Pieza de colección con base de madera e incluye estuche.', photo: photos.miniTrophy, createdAt: Date.now() - 1000 * 60 * 60 * 9 },
		{ id: 'trophy-vintage', title: 'Copa vintage para colección', category: 'Trofeos', condition: 'Buen estado', price: 76000, city: 'Bogotá, Fontibón', seller: 'Nicolás Díaz', description: 'Copa decorativa de colección, conservada en muy buen estado.', photo: photos.vintageTrophy, createdAt: Date.now() - 1000 * 60 * 60 * 13 }
	];

	let userListings = [];
	const favorites = new Set();

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

	function element(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined) node.textContent = text;
		return node;
	}

	function listingPhoto(item) {
		return item.photo || (item.image ? { url: item.image } : categoryPhotos[item.category] || categoryPhotos.Camisas);
	}

	function addPhotoCredit(photo, className) {
		if (!photo.credit || !photo.source) return null;
		const link = element('a', className, photo.credit);
		link.href = photo.source;
		link.target = '_blank';
		link.rel = 'license noopener noreferrer';
		link.setAttribute('aria-label', `Crédito de la foto: ${photo.credit} (se abre en otra pestaña)`);
		return link;
	}

	function createCard(item) {
		const card = element('article', 'listing-card');
		const photoWrap = element('div', 'listing-photo-wrap');
		const photo = listingPhoto(item);
		const image = element('img', 'listing-photo');
		image.src = photo.url;
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
		const credit = addPhotoCredit(photo, 'image-credit listing-image-credit');
		if (credit) photoWrap.append(credit);

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
		const photo = listingPhoto(item);
		const image = document.querySelector('#detail-image');
		image.src = photo.url;
		image.alt = item.title;
		const credit = document.querySelector('#detail-image-credit');
		credit.hidden = !photo.credit || !photo.source;
		credit.href = photo.source || '';
		credit.textContent = photo.credit ? `Foto: ${photo.credit}` : '';
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

	grid.addEventListener('click', async (event) => {
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
		const isFavorite = favorites.has(item.id);
		try {
			await window.SF_API.post('/api/favorites', {
				listingId: item.id,
				favorite: !isFavorite
			});
			if (isFavorite) favorites.delete(item.id);
			else favorites.add(item.id);
			render();
		} catch (error) {
			notify(error.message);
		}
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

	listingForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		const data = new FormData(listingForm);
		const item = {
			title: String(data.get('title')).trim(),
			category: String(data.get('category')),
			condition: String(data.get('condition')),
			price: Number(data.get('price')),
			city: String(data.get('city')).trim(),
			description: String(data.get('description')).trim(),
			image: String(data.get('image')).trim()
		};
		const publishButton = listingForm.querySelector('[type="submit"]');
		publishButton.disabled = true;
		try {
			const { listing } = await window.SF_API.post('/api/listings', item);
			userListings.unshift(listing);
			listingForm.reset();
			document.querySelector('#listing-city').value = 'Bogotá';
			listingDialog.close();
			clearFilters();
			notify('Anuncio publicado en la comunidad.');
		} catch (error) {
			notify(error.message);
		} finally {
			publishButton.disabled = false;
		}
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
	window.SF_API.request('/api/listings').then(({ listings: savedListings, favorites: savedFavorites }) => {
		userListings = savedListings;
		favorites.clear();
		savedFavorites.forEach((id) => favorites.add(id));
		render();
	}).catch((error) => notify(error.message));
})();
