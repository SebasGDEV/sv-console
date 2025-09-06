// Simple auto-initialization without component mounting
// This creates the floating console directly via DOM manipulation

export function initFloatingConsole() {
	// Wait for DOM to be ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', createFloatingConsole);
	} else {
		createFloatingConsole();
	}
}

function createFloatingConsole() {
	// Check if we're in development mode
	const isDev = (
		// Process env fallback
		(typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
		// Location-based detection (primary method for libraries)
		window.location.hostname === 'localhost' ||
		window.location.hostname === '127.0.0.1' ||
		window.location.hostname.includes('localhost') ||
		// Port-based detection for common dev servers
		window.location.port === '5173' || // Vite default
		window.location.port === '5174' || // Vite alternate
		window.location.port === '3000' || // Common dev port
		window.location.port === '8080' || // Common dev port
		// URL-based detection
		window.location.search.includes('dev') ||
		window.location.search.includes('debug')
	);

	if (!isDev) return;

	// Check if console is already mounted
	const existingConsole = document.querySelector('.floating-dev-container');
	if (existingConsole) return;

	// Import and mount the FloatingDevCards component dynamically
	import('./FloatingDevCards.svelte').then(({ default: FloatingDevCards }) => {
		// Create a container
		const container = document.createElement('div');
		container.id = 'svelte-floating-console-auto';
		document.body.appendChild(container);

		// Use the new Svelte 5 mount API
		import('svelte').then(({ mount }) => {
			mount(FloatingDevCards, {
				target: container
			});
		}).catch(() => {
			// Fallback: Try to use the component directly if mount is not available
			try {
				new FloatingDevCards({
					target: container
				});
			} catch (error) {
				console.warn('svelte-dev-floating: Could not mount console. This might be due to Svelte version compatibility.', error);
				container.remove();
			}
		});
	}).catch(error => {
		console.warn('svelte-dev-floating: Could not load FloatingDevCards component', error);
	});
}

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
	initFloatingConsole();
}

export default initFloatingConsole;