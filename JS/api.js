(() => {
	const appBase = new URL('../', document.currentScript.src);

	function endpoint(path) {
		const matchRoute = path.match(/^\/api\/matches\/([0-9a-f-]{36})$/);
		if (matchRoute) {
			return new URL(`api.php?action=matches&id=${encodeURIComponent(matchRoute[1])}`, appBase);
		}
		const route = path.match(/^\/api\/([a-z]+)$/);
		return route ? new URL(`api.php?action=${encodeURIComponent(route[1])}`, appBase) : path;
	}

	async function request(path, options = {}) {
		let response;
		try {
			response = await fetch(endpoint(path), {
				...options,
				credentials: 'same-origin',
				headers: {
					...(options.body ? { 'Content-Type': 'application/json' } : {}),
					...options.headers
				}
			});
		} catch {
			throw new Error('No se pudo conectar con Apache. Inicia Apache y MySQL en XAMPP y abre el proyecto desde http://localhost/.');
		}

		let payload;
		try {
			payload = await response.json();
		} catch {
			if (response.status === 405) {
				throw new Error(`El servidor de esta página (${window.location.host}) no está ejecutando la API PHP. Copia la carpeta del proyecto a C:\\xampp\\htdocs\\Simplemente-Futbol e inicia Apache desde XAMPP.`);
			}
			throw new Error(`La API ${path} devolvió una respuesta que no es JSON (HTTP ${response.status}). Comprueba que estás usando XAMPP y que MySQL está iniciado.`);
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
