(() => {
	async function request(path, options = {}) {
		const response = await fetch(path, {
			...options,
			credentials: 'same-origin',
			headers: {
				...(options.body ? { 'Content-Type': 'application/json' } : {}),
				...options.headers
			}
		});
		let payload;
		try {
			payload = await response.json();
		} catch {
			throw new Error('El servidor devolvió una respuesta no válida.');
		}
		if (!response.ok) throw new Error(payload.error || 'No se pudo completar la solicitud.');
		return payload;
	}

	window.SF_API = {
		request,
		post(path, data) {
			return request(path, { method: 'POST', body: JSON.stringify(data) });
		},
		remove(path) {
			return request(path, { method: 'DELETE' });
		}
	};
})();
