<script>
	// Auto-initialize the floating dev cards
	import '../lib/auto.ts';
	import { onMount } from 'svelte';


	// Test both usage methods
	let useManual = true;

	onMount(() => {
		// Test console logs
		console.log('Welcome to the console log demo!');
		console.info('This is an info message with some data:', { user: 'demo', timestamp: new Date() });
		console.warn('This is a warning message');
		console.error('This is an error message');
		
		// Add some periodic logs for testing (to test 6-second cleanup)
		let counter = 0;
		const interval = setInterval(() => {
			console.log(`Auto log #${++counter} - will disappear after 6 seconds`);
			if (counter >= 10) {
				clearInterval(interval);
			}
		}, 1500); // Every 1.5 seconds
	});

	function testConsole() {
		console.log('Button clicked!', new Date().toISOString());
		console.info('User interaction detected');
		console.warn('This is a test warning');
		console.error('This is a test error');
	}

	function testManyLogs() {
		for (let i = 1; i <= 25; i++) {
			setTimeout(() => {
				console.log(`Batch log ${i}/25 - testing log management (last 20 kept, older deleted after 6s)`);
			}, i * 200);
		}
	}

	function testLogTypes() {
		setTimeout(() => console.log('🟢 This is a regular log message'), 100);
		setTimeout(() => console.info('🔵 Info with JSON:', { 
			user: 'demo', 
			settings: { theme: 'dark', notifications: true }, 
			count: 42, 
			active: false,
			metadata: null
		}), 200);
		setTimeout(() => console.warn('🟡 Warning with array:', ['item1', 'item2', { nested: true }]), 300);
		setTimeout(() => console.error('🔴 Error with complex object:', {
			error: 'Authentication failed',
			code: 401,
			details: {
				message: 'Invalid token',
				timestamp: '2025-01-01T12:00:00Z',
				retry: true,
				attempts: 3
			}
		}), 400);
	}

	function testJSONExamples() {
		console.log('Simple object:', { name: 'John', age: 30 });
		console.log('Nested structure:', {
			api: {
				endpoint: '/users',
				method: 'GET',
				params: { limit: 10, offset: 0 }
			},
			response: {
				status: 200,
				data: [
					{ id: 1, name: 'Alice', active: true },
					{ id: 2, name: 'Bob', active: false }
				],
				meta: {
					total: 2,
					hasMore: false,
					nextPage: null
				}
			}
		});
	}
</script>

<main >
	<h1>Floating Console Demo</h1>
	<p>This demo shows the floating console with JSON highlighting. The console appears automatically in development mode.</p>
	
	<div class="usage-info">
		<h2>Usage Options:</h2>
		<div class="usage-option">
			<h3>Option 1: Manual Component (Current)</h3>
			<pre><code>&lt;script&gt;

&lt;/script&gt;

&lt;FloatingDevCards /&gt;</code></pre>
		</div>
		<div class="usage-option">
			<h3>Option 2: Auto-Initialization</h3>
			<pre><code>// Just import once in your main app file
import 'svelte-dev-floating/auto';</code></pre>
			<p><small>The console will automatically appear in development mode!</small></p>
		</div>
	</div>
	
	<div class="button-group">
		<button on:click={testLogTypes}>Test Log Types</button>
		<button on:click={testJSONExamples}>Test JSON Highlighting</button>
		<button on:click={testManyLogs}>Test Many Logs</button>
		<button on:click={testConsole}>Mixed Test</button>
	</div>
	<p><small>
		• <strong>Log Types</strong>: Shows different log levels with JSON objects<br>
		• <strong>JSON Highlighting</strong>: Complex JSON structures with syntax highlighting<br>
		• <strong>Many Logs</strong>: Generates 25 logs to test management (last 20 kept always)<br>
		• <strong>Mixed Test</strong>: Various log types for testing<br>
		• <strong>Auto Logs</strong>: Appear every 1.5s, older logs (beyond last 20) deleted after 6s<br>
		• Check the floating console in the bottom right corner for beautiful JSON highlighting!
	</small></p>
</main>

<!-- FloatingDevCards will be auto-initialized -->

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 100%;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	.button-group {
		display: flex;
		gap: 10px;
		justify-content: center;
		flex-wrap: wrap;
		margin: 20px 0;
	}

	button {
		padding: 8px 16px;
		background: #ff3e00;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background 0.2s ease;
	}

	button:hover {
		background: #cc3200;
	}

	.usage-info {
		background: #f8f9fa;
		padding: 20px;
		border-radius: 8px;
		margin: 20px 0;
		border: 1px solid #e9ecef;
	}

	.usage-info h2 {
		margin-top: 0;
		color: #333;
		font-size: 1.5em;
	}

	.usage-option {
		margin: 16px 0;
		padding: 16px;
		background: white;
		border-radius: 6px;
		border: 1px solid #e9ecef;
	}

	.usage-option h3 {
		margin-top: 0;
		color: #495057;
		font-size: 1.1em;
	}

	.usage-option pre {
		background: #f8f9fa;
		padding: 12px;
		border-radius: 4px;
		font-size: 13px;
		overflow-x: auto;
		border: 1px solid #e9ecef;
	}

	.usage-option code {
		color: #e83e8c;
	}

	.usage-option p {
		margin: 8px 0 0;
	}
</style>