// Import dynamically to avoid issues with different Svelte versions

// Auto-initialization function
export function initFloatingConsole() {
	// Wait for DOM to be ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mountConsole);
	} else {
		mountConsole();
	}
}

function mountConsole() {
	// Strict production check - if any production indicators, don't show
	const isProduction = (
		// Explicit production checks
		(typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
		(typeof process !== 'undefined' && process.env?.NODE_ENV === 'prod') ||
		// Production-like hostnames
		(window.location.hostname !== 'localhost' && 
		 window.location.hostname !== '127.0.0.1' && 
		 !window.location.hostname.includes('localhost') &&
		 window.location.protocol === 'https:') ||
		// Production ports (80, 443, or no specific dev ports)
		(!window.location.port || 
		 window.location.port === '80' || 
		 window.location.port === '443')
	);

	// Only show in development - strict checks
	const isDev = !isProduction && (
		// Process env development
		(typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
		// Development hostnames
		window.location.hostname === 'localhost' ||
		window.location.hostname === '127.0.0.1' ||
		window.location.hostname.includes('localhost') ||
		window.location.hostname.startsWith('192.168.') ||
		// Development ports
		['5173', '5174', '3000', '8080', '4000', '8000', '9000'].includes(window.location.port) ||
		// URL-based detection
		window.location.search.includes('dev') ||
		window.location.search.includes('debug') ||
		window.location.search.includes('local')
	);

	if (!isDev) return;

	// Check if console is already mounted
	const existingConsole = document.querySelector('.floating-dev-container');
	if (existingConsole) return;

	// Create a container for the console
	const container = document.createElement('div');
	container.id = 'svelte-floating-console-auto';
	document.body.appendChild(container);

	// Try to dynamically import and mount the component
	Promise.all([
		import('./FloatingDevCards.svelte'),
		import('svelte').then(svelte => svelte.mount || null).catch(() => null)
	]).then(([{ default: FloatingDevCards }, mount]) => {
		try {
			if (mount) {
				// Use Svelte 5 mount API
				mount(FloatingDevCards, { target: container });
			} else {
				// Fallback to Svelte 4 API
				new (FloatingDevCards as any)({ target: container });
			}
		} catch (error) {
			console.warn('svelte-dev-floating: Could not mount console', error);
			container.remove();
		}
	}).catch(error => {
		console.warn('svelte-dev-floating: Could not load floating console', error);
		container.remove();
	});
}

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
	initFloatingConsole();
}

export default initFloatingConsole;