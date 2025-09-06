<script lang="ts">
	import { onMount } from 'svelte';
	import FloatingDevCards from './FloatingDevCards.svelte';

	let mounted = $state(false);
	let container: HTMLDivElement;

	onMount(() => {
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

		if (isDev) {
			// Check if component is already mounted elsewhere
			const existingConsole = document.querySelector('.floating-dev-container');
			if (!existingConsole) {
				mounted = true;
			}
		}
	});
</script>

{#if mounted}
	<div bind:this={container}>
		<FloatingDevCards />
	</div>
{/if}