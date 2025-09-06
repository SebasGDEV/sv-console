<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Terminal, Minus, X } from '@lucide/svelte';

	interface LogEntry {
		id: string;
		timestamp: Date;
		level: 'log' | 'info' | 'warn' | 'error';
		args: Array<{
			type: 'json' | 'text';
			content: string;
			raw?: any;
			expanded: boolean;
		}>;
		message: string;
	}

	let isDev = $state(false);
	let isVisible = $state(false);
	let isBrowser = $state(false);
	let logs = $state<LogEntry[]>([]);
	let activeTab = $state<'console'>('console');
	let logFilter = $state<'all' | 'log' | 'info' | 'warn' | 'error'>('all');
	let cleanupInterval: number;
	let isIntercepting = false; // Flag to prevent infinite loops
	let lastLogContent: string = ''; // Store last log content to avoid duplicates
	
	const originalConsole = {
		log: console.log,
		info: console.info,
		warn: console.warn,
		error: console.error
	};

	onMount(() => {
		isBrowser = typeof window !== 'undefined';
		
		if (isBrowser) {
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
			isDev = !isProduction && (
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
			
			if (isDev) {
				isVisible = true;
				interceptConsole();
				
				// Start periodic cleanup of old logs
				cleanupInterval = setInterval(cleanupOldLogs, 1000); // Check every second
			}
		}
	});

	onDestroy(() => {
		if (cleanupInterval) {
			clearInterval(cleanupInterval);
		}
	});


	function toggleVisibility() {
		isVisible = !isVisible;
	}

	function interceptConsole() {
		console.log = (...args: any[]) => {
			const currentLogContent = args.map(arg => String(arg)).join(' ');
			if (currentLogContent !== lastLogContent || isIntercepting) {
				originalConsole.log(...args);
				if (!isIntercepting) {
					lastLogContent = currentLogContent;
					addLogEntry('log', args);
				}
			}
		};
		
		console.info = (...args: any[]) => {
			const currentLogContent = args.map(arg => String(arg)).join(' ');
			if (currentLogContent !== lastLogContent || isIntercepting) {
				originalConsole.info(...args);
				if (!isIntercepting) {
					lastLogContent = currentLogContent;
					addLogEntry('info', args);
				}
			}
		};
		
		console.warn = (...args: any[]) => {
			const currentLogContent = args.map(arg => String(arg)).join(' ');
			if (currentLogContent !== lastLogContent || isIntercepting) {
				originalConsole.warn(...args);
				if (!isIntercepting) {
					lastLogContent = currentLogContent;
					addLogEntry('warn', args);
				}
			}
		};
		
		console.error = (...args: any[]) => {
			const currentLogContent = args.map(arg => String(arg)).join(' ');
			if (currentLogContent !== lastLogContent || isIntercepting) {
				originalConsole.error(...args);
				if (!isIntercepting) {
					lastLogContent = currentLogContent;
					addLogEntry('error', args);
				}
			}
		};
	}

	function addLogEntry(level: LogEntry['level'], args: any[]) {
		// Prevent infinite loops - check if this is our own log
		const message = args.map(arg => String(arg)).join(' ');
		
		// Skip logs from the floating console itself or Svelte internals
		if (message.includes('FloatingDevCards') || 
			message.includes('svelte-dev-floating') ||
			message.includes('floating-console') ||
			isIntercepting) {
			return;
		}
		
		// Check for duplicate logs (exact same message as the last log)
		const now = new Date();
		const lastLog = logs[logs.length - 1];
		if (lastLog && lastLog.message === message && lastLog.level === level) {
			return; // Skip exact duplicate of last log
		}
		
		// Prevent infinite loops by setting the flag
		isIntercepting = true;
		
		try {
			const processedArgs = args.map(arg => {
				// Check if it's an object (including arrays) but not null
				if (typeof arg === 'object' && arg !== null) {
					try {
						const jsonContent = JSON.stringify(arg, null, 2);
						// Only treat as JSON if it's a complex object/array (more than just a simple value)
						if (jsonContent.length > 10 && (jsonContent.includes('{') || jsonContent.includes('['))) {
							// Count lines to determine if should be collapsed by default
							const lineCount = jsonContent.split('\n').length;
							return {
								type: 'json',
								content: jsonContent,
								raw: arg,
								expanded: lineCount <= 6 // Auto-expand if 6 lines or fewer
							};
						}
					} catch {
						// If JSON.stringify fails, treat as text
					}
				}
				
				// For all other cases (primitives, null, failed JSON), treat as text
				return {
					type: 'text',
					content: String(arg),
					expanded: false
				};
			});

			const entry: LogEntry = {
				id: crypto.randomUUID(),
				timestamp: now,
				level,
				args: processedArgs,
				message
			};

			logs = [...logs, entry];
			
			// Clean up logs older than 6 seconds (but keep the last 20 always)
			cleanupOldLogs();
			
			// Auto-scroll to bottom after adding new log
			requestAnimationFrame(() => {
				scrollToBottom();
			});
		} catch (error) {
			// Silently fail - don't log the error
		} finally {
			// Always reset the flag after a short delay
			setTimeout(() => {
				isIntercepting = false;
			}, 10);
		}
	}

	function cleanupOldLogs() {
		const now = new Date().getTime();
		const sixSecondsAgo = now - 6000; // 6 seconds in milliseconds
		
		// Keep the last 20 logs always, only delete older logs from position 21 onwards
		if (logs.length > 20) {
			const last20 = logs.slice(-20);
			const older = logs.slice(0, -20);
			const validOlder = older.filter(log => log.timestamp.getTime() > sixSecondsAgo);
			logs = [...validOlder, ...last20];
		}
	}

	function scrollToBottom() {
		if (isBrowser) {
			const consoleContainer = document.querySelector('.console-logs');
			if (consoleContainer) {
				consoleContainer.scrollTop = consoleContainer.scrollHeight;
			}
		}
	}

	function clearLogs() {
		logs = [];
	}

	function getFilteredLogs() {
		if (logFilter === 'all') return logs;
		return logs.filter(log => log.level === logFilter);
	}

	function formatTime(date: Date) {
		return date.toLocaleTimeString('en-US', { 
			hour12: false, 
			hour: '2-digit', 
			minute: '2-digit', 
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	function getLogLevelColor(level: LogEntry['level']) {
		switch (level) {
			case 'error': return '#ff4444';
			case 'warn': return '#ffaa00';
			case 'info': return '#4488ff';
			default: return 'inherit';
		}
	}

	function toggleExpansion(logId: string, argIndex: number) {
		logs = logs.map(log => {
			if (log.id === logId) {
				return {
					...log,
					args: log.args.map((arg, index) => {
						if (index === argIndex) {
							return { ...arg, expanded: !arg.expanded };
						}
						return arg;
					})
				};
			}
			return log;
		});
	}

	function getCollapsedPreview(content: string, maxLength = 80): string {
		// Parse JSON to get type info for better preview
		try {
			const parsed = JSON.parse(content);
			if (Array.isArray(parsed)) {
				return `Array(${parsed.length}) [${parsed.slice(0, 2).map(v => typeof v === 'object' ? '{...}' : JSON.stringify(v)).join(', ')}${parsed.length > 2 ? ', ...' : ''}]`;
			} else if (typeof parsed === 'object' && parsed !== null) {
				const keys = Object.keys(parsed);
				const preview = keys.slice(0, 3).map(key => {
					const value = parsed[key];
					const valueStr = typeof value === 'object' ? (Array.isArray(value) ? `[${value.length}]` : '{...}') : JSON.stringify(value);
					return `${key}: ${valueStr}`;
				}).join(', ');
				return `{${preview}${keys.length > 3 ? ', ...' : ''}}`;
			}
		} catch {
			// Fallback to string truncation
		}
		
		// Remove extra whitespace and newlines for a compact preview
		const compactContent = content.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
		
		if (compactContent.length <= maxLength) return compactContent;
		
		// Try to create a meaningful preview by showing the start
		const truncated = compactContent.substring(0, maxLength);
		
		// Try to end at a reasonable boundary
		const lastComma = truncated.lastIndexOf(',');
		const lastColon = truncated.lastIndexOf(':');
		
		if (lastColon > lastComma && lastColon > maxLength - 20) {
			return truncated.substring(0, lastColon + 1) + ' ...';
		} else if (lastComma > maxLength - 20) {
			return truncated.substring(0, lastComma) + ', ...';
		}
		
		return truncated + '...';
	}

	function highlightJSON(jsonString: string): string {
		let highlighted = jsonString;
		
		// Property keys (must be done first)
		highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*")(\s*):/g, '<span class="json-key">$1</span>$2<span class="json-colon">:</span>');
		
		// String values (but not keys)
		highlighted = highlighted.replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-string">$1</span>');
		highlighted = highlighted.replace(/\[\s*("(?:[^"\\]|\\.)*")/g, '[<span class="json-string">$1</span>');
		highlighted = highlighted.replace(/,\s*("(?:[^"\\]|\\.)*")/g, ', <span class="json-string">$1</span>');
		
		// Numbers
		highlighted = highlighted.replace(/:\s*(-?\d+\.?\d*)\b/g, ': <span class="json-number">$1</span>');
		highlighted = highlighted.replace(/\[\s*(-?\d+\.?\d*)\b/g, '[<span class="json-number">$1</span>');
		highlighted = highlighted.replace(/,\s*(-?\d+\.?\d*)\b/g, ', <span class="json-number">$1</span>');
		
		// Booleans
		highlighted = highlighted.replace(/:\s*(true|false)\b/g, ': <span class="json-boolean">$1</span>');
		highlighted = highlighted.replace(/\[\s*(true|false)\b/g, '[<span class="json-boolean">$1</span>');
		highlighted = highlighted.replace(/,\s*(true|false)\b/g, ', <span class="json-boolean">$1</span>');
		
		// Null
		highlighted = highlighted.replace(/:\s*(null)\b/g, ': <span class="json-null">$1</span>');
		highlighted = highlighted.replace(/\[\s*(null)\b/g, '[<span class="json-null">$1</span>');
		highlighted = highlighted.replace(/,\s*(null)\b/g, ', <span class="json-null">$1</span>');
		
		// Brackets and braces
		highlighted = highlighted.replace(/([{}[\]])/g, '<span class="json-bracket">$1</span>');
		
		// Commas (but not those inside strings)
		highlighted = highlighted.replace(/,(?![^"]*"[^"]*:)/g, '<span class="json-comma">,</span>');
		
		return highlighted;
	}
</script>

{#if isDev}
	<div class="floating-dev-container">
		{#if isVisible}
			<div class="floating-dev-cards">
				<div class="dev-header">
					<div class="header-content">
						<div class="header-icon">
							<Terminal size={16} />
						</div>
						<span class="dev-title">Console</span>
						<div class="log-count">
							<span class="count-badge">{logs.length}</span>
						</div>
					</div>
					<button 
						class="minimize-btn" 
						onclick={toggleVisibility}
						aria-label="Minimize console"
					>
						<Minus size={16} color="white" stroke-width={2} />
					</button>
				</div>
				
				<div class="dev-content">
					<div class="console-section">
						<div class="console-controls">
							<div class="filter-group">
								<select bind:value={logFilter} class="log-filter">
									<option value="all">All ({logs.length})</option>
									<option value="log">Log ({logs.filter(l => l.level === 'log').length})</option>
									<option value="info">Info ({logs.filter(l => l.level === 'info').length})</option>
									<option value="warn">Warn ({logs.filter(l => l.level === 'warn').length})</option>
									<option value="error">Error ({logs.filter(l => l.level === 'error').length})</option>
								</select>
							</div>
							<button class="clear-btn" onclick={clearLogs}>
								<X size={14} color="white" stroke-width={2} />
								Clear
							</button>
						</div>
						
						<div class="console-logs">
							{#each getFilteredLogs() as log (log.id)}
								<div class="log-entry" class:error={log.level === 'error'} class:warn={log.level === 'warn'} class:info={log.level === 'info'}>
									<div class="log-header">
										<span class="log-time">{formatTime(log.timestamp)}</span>
										<span class="log-level" data-level={log.level}>{log.level.toUpperCase()}</span>
									</div>
									<div class="log-content">
										{#each log.args as arg, index}
											{#if index > 0}<span class="log-separator"> </span>{/if}
											{#if arg.type === 'json'}
												<div class="log-json-container">
													{#if arg.expanded}
														<div class="log-json expanded" onclick={() => toggleExpansion(log.id, index)}>
															<div class="expand-header">
																<span class="expand-indicator">▼</span>
																<span class="expand-text">{arg.content.split('\n').length > 6 ? 'Large JSON Object (click to compact)' : 'JSON Object (click to collapse)'}</span>
															</div>
															<div class="json-content">
																{@html highlightJSON(arg.content)}
															</div>
														</div>
													{:else}
														<div class="log-json collapsed" onclick={() => toggleExpansion(log.id, index)}>
															<div class="expand-header">
																<span class="expand-indicator">▶</span>
																<span class="expand-text">{arg.content.split('\n').length > 6 ? 'Large JSON Object (click to expand)' : 'JSON Object (click to expand)'}</span>
															</div>
															<div class="json-preview">
																{@html highlightJSON(getCollapsedPreview(arg.content))}
															</div>
														</div>
													{/if}
												</div>
											{:else}
												<span class="log-text">{arg.content}</span>
											{/if}
										{/each}
									</div>
								</div>
							{:else}
								<div class="no-logs">
									<div class="no-logs-icon">
										<Terminal size={24} />
									</div>
									<p>No logs to display</p>
									<small>Console logs will appear here</small>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<button 
				class="floating-toggle" 
				onclick={toggleVisibility}
				aria-label="Show console"
			>
				<Terminal size={20} color="white" stroke-width={2} />
			</button>
		{/if}
	</div>
{/if}

<style>
	/* Modern dark theme inspired by shadcn */
	.floating-dev-container {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 10000;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
	}

	.floating-dev-cards {
		background: hsl(224, 71%, 4%);
		border: 1px solid hsl(215, 27.9%, 16.9%);
		border-radius: 12px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(16px);
		min-width: 380px;
		max-width: 480px;
		animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		max-height: 650px;
		display: flex;
		flex-direction: column;
		color: hsl(210, 40%, 98%);
	}

	.dev-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid hsl(215, 27.9%, 16.9%);
		background: hsl(224, 71%, 4%);
		border-radius: 12px 12px 0 0;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.header-icon {
		color: hsl(210, 40%, 60%);
		display: flex;
		align-items: center;
	}

	.dev-title {
		font-weight: 600;
		font-size: 14px;
		color: hsl(210, 40%, 98%);
		letter-spacing: -0.025em;
	}

	.log-count {
		margin-left: auto;
		margin-right: 8px;
	}

	.count-badge {
		background: hsl(215, 27.9%, 16.9%);
		color: hsl(210, 40%, 80%);
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 500;
		border: 1px solid hsl(215, 27.9%, 20%);
	}

	.minimize-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		color: white !important;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.minimize-btn:hover {
		background: hsl(215, 27.9%, 16.9%);
		color: white !important;
	}

	.minimize-btn :global(svg) {
		color: white !important;
		stroke: white !important;
	}

	.dev-content {
		padding: 0;
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.console-section {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 350px;
	}

	.console-controls {
		display: flex;
		gap: 12px;
		padding: 16px 20px 0;
		margin-bottom: 16px;
		align-items: center;
	}

	.filter-group {
		flex: 1;
	}

	.log-filter {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid hsl(215, 27.9%, 16.9%);
		border-radius: 6px;
		background: hsl(220, 13%, 9%);
		font-size: 13px;
		color: hsl(210, 40%, 98%);
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.log-filter:focus {
		outline: none;
		border-color: hsl(217, 91%, 60%);
		ring: 2px solid hsl(217, 91%, 60%, 0.3);
	}

	.log-filter:hover {
		border-color: hsl(215, 27.9%, 25%);
	}

	.clear-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: hsl(0, 84%, 60%);
		color: white !important;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.clear-btn:hover {
		background: hsl(0, 84%, 55%);
		transform: translateY(-1px);
		color: white !important;
	}

	.clear-btn :global(svg) {
		color: white !important;
		stroke: white !important;
	}

	.console-logs {
		flex: 1;
		overflow-y: auto;
		background: hsl(220, 13%, 9%);
		border: 1px solid hsl(215, 27.9%, 16.9%);
		border-radius: 8px;
		margin: 0 16px 16px;
		padding: 8px;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 12px;
		line-height: 1.4;
		scroll-behavior: smooth;
		max-height: 450px;
	}

	.log-entry {
		margin: 2px 0;
		padding: 12px;
		border-radius: 6px;
		background: hsl(224, 71%, 4%);
		border: 1px solid hsl(215, 27.9%, 16.9%);
		transition: all 0.15s ease;
		position: relative;
		overflow: hidden;
	}

	.log-entry:hover {
		background: hsl(215, 27.9%, 8%);
		border-color: hsl(215, 27.9%, 20%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.log-entry.error {
		border-left: 3px solid hsl(0, 84%, 60%);
		background: hsl(0, 84%, 60%, 0.08);
	}

	.log-entry.warn {
		border-left: 3px solid hsl(38, 92%, 50%);
		background: hsl(38, 92%, 50%, 0.08);
	}

	.log-entry.info {
		border-left: 3px solid hsl(217, 91%, 60%);
		background: hsl(217, 91%, 60%, 0.08);
	}

	.log-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
		opacity: 0.8;
	}

	.log-time {
		font-size: 11px;
		color: hsl(210, 40%, 60%);
		font-weight: 500;
		font-family: inherit;
	}

	.log-level {
		font-size: 10px;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border: 1px solid;
	}

	.log-level[data-level="error"] {
		background: hsl(0, 84%, 60%, 0.1);
		color: hsl(0, 84%, 60%);
		border-color: hsl(0, 84%, 60%, 0.3);
	}

	.log-level[data-level="warn"] {
		background: hsl(38, 92%, 50%, 0.1);
		color: hsl(38, 92%, 50%);
		border-color: hsl(38, 92%, 50%, 0.3);
	}

	.log-level[data-level="info"] {
		background: hsl(217, 91%, 60%, 0.1);
		color: hsl(217, 91%, 60%);
		border-color: hsl(217, 91%, 60%, 0.3);
	}

	.log-level[data-level="log"] {
		background: hsl(210, 40%, 60%, 0.1);
		color: hsl(210, 40%, 60%);
		border-color: hsl(210, 40%, 60%, 0.3);
	}

	.log-content {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.log-text {
		white-space: pre-wrap;
		word-break: break-word;
		color: hsl(210, 40%, 95%);
		font-size: 12px;
		line-height: 1.5;
		font-family: inherit;
	}

	.log-json-container {
		margin: 4px 0;
		display: inline-block;
		width: 100%;
	}

	.log-json {
		background: hsl(220, 13%, 9%);
		border: 1px solid hsl(215, 27.9%, 16.9%);
		border-radius: 6px;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 11px;
		line-height: 1.4;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
		overflow: hidden;
	}

	.log-json:hover {
		border-color: hsl(215, 27.9%, 20%);
		background: hsl(220, 13%, 7%);
	}

	.log-json.collapsed {
		padding: 8px 12px;
	}

	.log-json.expanded {
		padding: 8px 12px 12px;
	}

	.expand-header {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 6px;
		font-size: 10px;
		color: hsl(210, 40%, 60%);
		font-weight: 600;
	}

	.expand-indicator {
		color: hsl(210, 40%, 70%);
		font-family: monospace;
		font-size: 9px;
		width: 8px;
		text-align: center;
	}

	.expand-text {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		opacity: 0.8;
	}

	.json-content {
		white-space: pre;
		overflow-x: auto;
		max-height: 300px;
		overflow-y: auto;
		padding-top: 4px;
		border-top: 1px solid hsl(215, 27.9%, 16.9%);
	}

	.json-preview {
		opacity: 0.85;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 10px;
		line-height: 1.3;
	}

	/* JSON Syntax Highlighting - Dark Theme */
	:global(.json-key) {
		color: hsl(217, 91%, 75%);
		font-weight: 600;
	}

	:global(.json-string) {
		color: hsl(142, 76%, 73%);
	}

	:global(.json-number) {
		color: hsl(268, 84%, 78%);
	}

	:global(.json-boolean) {
		color: hsl(38, 92%, 70%);
		font-weight: 600;
	}

	:global(.json-null) {
		color: hsl(0, 84%, 70%);
		font-weight: 600;
		font-style: italic;
	}

	:global(.json-bracket) {
		color: hsl(210, 40%, 70%);
		font-weight: bold;
	}

	:global(.json-comma) {
		color: hsl(210, 40%, 70%);
	}

	:global(.json-colon) {
		color: hsl(210, 40%, 70%);
		font-weight: bold;
	}

	.log-separator {
		margin: 0 6px;
		color: hsl(210, 40%, 60%);
	}

	.no-logs {
		text-align: center;
		color: hsl(210, 40%, 60%);
		margin: 60px 20px;
		padding: 32px 20px;
		background: hsl(215, 27.9%, 6%);
		border: 1px dashed hsl(215, 27.9%, 16.9%);
		border-radius: 8px;
		font-size: 13px;
	}

	.no-logs-icon {
		margin: 0 auto 12px;
		width: 24px;
		height: 24px;
		color: hsl(210, 40%, 40%);
	}

	.no-logs p {
		margin: 0 0 4px;
		font-weight: 500;
		color: hsl(210, 40%, 80%);
	}

	.no-logs small {
		color: hsl(210, 40%, 60%);
	}

	.floating-toggle {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		background: hsl(224, 71%, 4%);
		border: 1px solid hsl(215, 27.9%, 16.9%);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(16px);
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		color: white !important;
	}

	.floating-toggle:hover {
		transform: translateY(-2px);
		box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.8);
		background: hsl(215, 27.9%, 8%);
		color: white !important;
		border-color: hsl(215, 27.9%, 20%);
	}

	.floating-toggle :global(svg) {
		color: white !important;
		stroke: white !important;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@media (max-width: 480px) {
		.floating-dev-container {
			bottom: 16px;
			right: 16px;
		}
		
		.floating-dev-cards {
			min-width: 320px;
			max-width: calc(100vw - 32px);
		}

		.console-controls {
			flex-direction: column;
			gap: 8px;
		}

		.filter-group {
			width: 100%;
		}
	}
</style>