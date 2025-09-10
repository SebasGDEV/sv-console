<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Terminal, Minus, X, Move } from "@lucide/svelte";

    interface Props {
        startMinimized?: boolean;
    }

    let { startMinimized = false }: Props = $props();

    interface LogEntry {
        id: string;
        timestamp: Date;
        level: "log" | "info" | "warn" | "error";
        args: Array<{
            type: "json" | "text";
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
    let activeTab = $state<"console">("console");
    let logFilter = $state<"all" | "log" | "info" | "warn" | "error">("all");
    let cleanupInterval: ReturnType<typeof setInterval>;
    let isIntercepting = false; // Flag to prevent infinite loops
    let lastLogContent = $state({
        // Store last log content to avoid duplicates
        log: "",
        info: "",
        warn: "",
        error: ""
    });
    let position = $state<
        | "top-left"
        | "top-right"
        | "bottom-left"
        | "bottom-right"
        | "bottom-center"
    >("bottom-center");
    let showPositionMenu = $state(false);
    let justOpenedMenu = false;

    const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
    };

    onMount(() => {
        isBrowser = typeof window !== "undefined";

        if (isBrowser) {
            // Load position from localStorage
            const savedPosition = localStorage.getItem(
                "floating-dev-cards-position",
            );
            if (
                savedPosition &&
                [
                    "top-left",
                    "top-right",
                    "bottom-left",
                    "bottom-right",
                    "bottom-center",
                ].includes(savedPosition)
            ) {
                position = savedPosition as typeof position;
            }

            // Strict production check - if any production indicators, don't show
            const isProduction =
                // Explicit production checks
                (typeof process !== "undefined" &&
                    process.env?.NODE_ENV === "production") ||
                (typeof process !== "undefined" &&
                    process.env?.NODE_ENV === "prod") ||
                // Production-like hostnames
                (window.location.hostname !== "localhost" &&
                    window.location.hostname !== "127.0.0.1" &&
                    !window.location.hostname.includes("localhost") &&
                    window.location.protocol === "https:") ||
                // Production ports (80, 443, or no specific dev ports)
                !window.location.port ||
                window.location.port === "80" ||
                window.location.port === "443";

            // Only show in development - strict checks
            isDev =
                !isProduction &&
                // Process env development
                ((typeof process !== "undefined" &&
                    process.env?.NODE_ENV === "development") ||
                    // Development hostnames
                    window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1" ||
                    window.location.hostname.includes("localhost") ||
                    window.location.hostname.startsWith("192.168.") ||
                    // Development ports
                    [
                        "5173",
                        "5174",
                        "3000",
                        "8080",
                        "4000",
                        "8000",
                        "9000",
                    ].includes(window.location.port) ||
                    // URL-based detection
                    window.location.search.includes("dev") ||
                    window.location.search.includes("debug") ||
                    window.location.search.includes("local"));

            if (isDev) {
                // Start minimized if explicitly requested or if auto-initialized
                isVisible = startMinimized ? false : true;
                interceptConsole();

                // Start periodic cleanup of old logs
                cleanupInterval = setInterval(cleanupOldLogs, 10000); // Check every second

                // Add click outside listener
                document.addEventListener("click", handleClickOutside);
            }
        }
    });

    onDestroy(() => {
        if (cleanupInterval) {
            clearInterval(cleanupInterval);
        }
        if (isBrowser) {
            document.removeEventListener("click", handleClickOutside);
        }
    });

    function toggleVisibility() {
        isVisible = !isVisible;
    }

    function togglePositionMenu(event?: Event) {
        // Debug: Toggling position menu
        if (event) {
            event.stopPropagation();
        }
        showPositionMenu = !showPositionMenu;

        if (showPositionMenu) {
            // Set flag to prevent immediate closing
            justOpenedMenu = true;
            // Clear the flag after a short delay
            setTimeout(() => {
                justOpenedMenu = false;
            }, 100);
        }

        // Debug: Position menu toggled
    }

    function selectPosition(newPosition: typeof position) {
        // Debug: Selecting position
        position = newPosition;
        showPositionMenu = false;

        // Save to localStorage
        if (isBrowser) {
            localStorage.setItem("floating-dev-cards-position", position);
        }
        // Debug: Position updated and saved
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as Element;
        // Debug: Click outside detected

        // Don't close if we just opened the menu
        if (justOpenedMenu) {
            // Debug: Menu just opened, ignoring click outside
            return;
        }

        if (showPositionMenu && !target.closest(".position-menu-container")) {
            // Debug: Closing menu due to outside click
            showPositionMenu = false;
        }
    }

    function interceptConsole() {
      
        console.log = (...args: any[]) => {
            const currentLogContent = args.map((arg) => String(arg)).join(" ");
            if (currentLogContent !== lastLogContent.log) {
                originalConsole.log(...args);
                if (!isIntercepting) {
                    lastLogContent.log = currentLogContent;
                    addLogEntry("log", args);
                }
            }
        };

        console.info = (...args: any[]) => {
            const currentLogContent = args.map((arg) => String(arg)).join(" ");
            if (currentLogContent !== lastLogContent.info) {
                originalConsole.info(...args);
                if (!isIntercepting) {
                    lastLogContent.info = currentLogContent;
                    addLogEntry("info", args);
                }
            }
        };

        console.warn = (...args: any[]) => {
            const currentLogContent = args.map((arg) => String(arg)).join(" ");
            if (currentLogContent !== lastLogContent.warn) {
                originalConsole.warn(...args);
                if (!isIntercepting) {
                    lastLogContent.warn = currentLogContent;
                    addLogEntry("warn", args);
                }
            }
        };

        console.error = (...args: any[]) => {
            const currentLogContent = args.map((arg) => String(arg)).join(" ");
            if (currentLogContent !== lastLogContent.error) {
                originalConsole.error(...args);
                if (!isIntercepting) {
                    lastLogContent.error = currentLogContent;
                    addLogEntry("error", args);
                }
            }
        };

    }

    function addLogEntry(level: LogEntry["level"], args: any[]) {
        // Prevent infinite loops during processing
        // console.info("entry:", level.toString());
        if (isIntercepting) {
            return;
        }

        // Prevent infinite loops - check if this is our own log
        const message = args.map((arg) => String(arg)).join(" ");

        // Skip logs from the floating console itself or Svelte internals (but be more specific)
        if (
            message.includes("FloatingDevCards:") ||
            message.includes("svelte-dev-floating") ||
            message.includes("floating-console")
        ) {
            return;
        }

        // Check for duplicate logs (exact same message as the last log)
        const now = new Date();
        const lastLog = logs[logs.length - 1];
        if (lastLog && lastLog.message === message && lastLog.level === level) {
            // console.info("duplicate");
            return; // Skip exact duplicate of last log
        }

        // Prevent infinite loops by setting the flag
        isIntercepting = true;

        try {
            const processedArgs = args.map((arg) => {
                // Check if it's an object (including arrays) but not null
                if (typeof arg === "object" && arg !== null) {
                    try {
                        const jsonContent = JSON.stringify(arg, null, 2);
                        // Only treat as JSON if it's a complex object/array (more than just a simple value)
                        if (
                            jsonContent.length > 10 &&
                            (jsonContent.includes("{") ||
                                jsonContent.includes("["))
                        ) {
                            // Count lines to determine if should be collapsed by default
                            const lineCount = jsonContent.split("\n").length;
                            return {
                                type: "json" as const,
                                content: jsonContent,
                                raw: arg,
                                expanded: lineCount <= 6, // Auto-expand if 6 lines or fewer
                            };
                        }
                    } catch {
                        // If JSON.stringify fails, treat as text
                    }
                }

                // For all other cases (primitives, null, failed JSON), treat as text
                return {
                    type: "text" as const,
                    content: String(arg),
                    expanded: false,
                };
            });

            const entry: LogEntry = {
                id: crypto.randomUUID(),
                timestamp: now,
                level,
                args: processedArgs,
                message,
            };

            logs = [...logs, entry];

            // Clean up logs older than 6 seconds (but keep the last 20 always)
            cleanupOldLogs();

            // Auto-scroll to bottom after adding new log
            requestAnimationFrame(() => {
                scrollToBottom();
            });
        } catch (error) {
            console.info("error", error);
            // Silently fail - don't log the error
        } finally {
            // Always reset the flag after a short delay
            // setTimeout(() => {
            isIntercepting = false;
            // }, 1);
        }
    }

    function cleanupOldLogs() {
        const now = new Date().getTime();
        const sixSecondsAgo = now - 6000; // 6 seconds in milliseconds

        // Keep the last 20 logs always, only delete older logs from position 21 onwards
        if (logs.length > 20) {
            const last20 = logs.slice(-20);
            const older = logs.slice(0, -20);
            const validOlder = older.filter(
                (log) => log.timestamp.getTime() > sixSecondsAgo,
            );
            logs = [...validOlder, ...last20];
        }
    }

    function scrollToBottom() {
        if (isBrowser) {
            const consoleContainer = document.querySelector(".console-logs");
            if (consoleContainer) {
                consoleContainer.scrollTop = consoleContainer.scrollHeight;
            }
        }
    }

    function clearLogs() {
        logs = [];
    }

    let filteredLogs = $derived(
        logFilter === "all"
            ? logs
            : logs.filter((log) => log.level === logFilter),
    );

    function formatTime(date: Date) {
        return date.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
        });
    }

    function getLogLevelColor(level: LogEntry["level"]) {
        switch (level) {
            case "error":
                return "#ff4444";
            case "warn":
                return "#ffaa00";
            case "info":
                return "#4488ff";
            default:
                return "inherit";
        }
    }

    function toggleExpansion(logId: string, argIndex: number) {
        logs = logs.map((log) => {
            if (log.id === logId) {
                return {
                    ...log,
                    args: log.args.map((arg, index) => {
                        if (index === argIndex) {
                            return { ...arg, expanded: !arg.expanded };
                        }
                        return arg;
                    }),
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
                return `Array(${parsed.length}) [${parsed
                    .slice(0, 2)
                    .map((v) =>
                        typeof v === "object" ? "{...}" : JSON.stringify(v),
                    )
                    .join(", ")}${parsed.length > 2 ? ", ..." : ""}]`;
            } else if (typeof parsed === "object" && parsed !== null) {
                const keys = Object.keys(parsed);
                const preview = keys
                    .slice(0, 3)
                    .map((key) => {
                        const value = parsed[key];
                        const valueStr =
                            typeof value === "object"
                                ? Array.isArray(value)
                                    ? `[${value.length}]`
                                    : "{...}"
                                : JSON.stringify(value);
                        return `${key}: ${valueStr}`;
                    })
                    .join(", ");
                return `{${preview}${keys.length > 3 ? ", ..." : ""}}`;
            }
        } catch {
            // Fallback to string truncation
        }

        // Remove extra whitespace and newlines for a compact preview
        const compactContent = content
            .replace(/\s+/g, " ")
            .replace(/\n/g, " ")
            .trim();

        if (compactContent.length <= maxLength) return compactContent;

        // Try to create a meaningful preview by showing the start
        const truncated = compactContent.substring(0, maxLength);

        // Try to end at a reasonable boundary
        const lastComma = truncated.lastIndexOf(",");
        const lastColon = truncated.lastIndexOf(":");

        if (lastColon > lastComma && lastColon > maxLength - 20) {
            return truncated.substring(0, lastColon + 1) + " ...";
        } else if (lastComma > maxLength - 20) {
            return truncated.substring(0, lastComma) + ", ...";
        }

        return truncated + "...";
    }

    function highlightJSON(jsonString: string): string {
        let highlighted = jsonString;

        // Property keys (must be done first)
        highlighted = highlighted.replace(
            /("(?:[^"\\]|\\.)*")(\s*):/g,
            '<span class="json-key">$1</span>$2<span class="json-colon">:</span>',
        );

        // String values (but not keys)
        highlighted = highlighted.replace(
            /:\s*("(?:[^"\\]|\\.)*")/g,
            ': <span class="json-string">$1</span>',
        );
        highlighted = highlighted.replace(
            /\[\s*("(?:[^"\\]|\\.)*")/g,
            '[<span class="json-string">$1</span>',
        );
        highlighted = highlighted.replace(
            /,\s*("(?:[^"\\]|\\.)*")/g,
            ', <span class="json-string">$1</span>',
        );

        // Numbers
        highlighted = highlighted.replace(
            /:\s*(-?\d+\.?\d*)\b/g,
            ': <span class="json-number">$1</span>',
        );
        highlighted = highlighted.replace(
            /\[\s*(-?\d+\.?\d*)\b/g,
            '[<span class="json-number">$1</span>',
        );
        highlighted = highlighted.replace(
            /,\s*(-?\d+\.?\d*)\b/g,
            ', <span class="json-number">$1</span>',
        );

        // Booleans
        highlighted = highlighted.replace(
            /:\s*(true|false)\b/g,
            ': <span class="json-boolean">$1</span>',
        );
        highlighted = highlighted.replace(
            /\[\s*(true|false)\b/g,
            '[<span class="json-boolean">$1</span>',
        );
        highlighted = highlighted.replace(
            /,\s*(true|false)\b/g,
            ', <span class="json-boolean">$1</span>',
        );

        // Null
        highlighted = highlighted.replace(
            /:\s*(null)\b/g,
            ': <span class="json-null">$1</span>',
        );
        highlighted = highlighted.replace(
            /\[\s*(null)\b/g,
            '[<span class="json-null">$1</span>',
        );
        highlighted = highlighted.replace(
            /,\s*(null)\b/g,
            ', <span class="json-null">$1</span>',
        );

        // Brackets and braces
        highlighted = highlighted.replace(
            /([{}[\]])/g,
            '<span class="json-bracket">$1</span>',
        );

        // Commas (but not those inside strings)
        highlighted = highlighted.replace(
            /,(?![^"]*"[^"]*:)/g,
            '<span class="json-comma">,</span>',
        );

        return highlighted;
    }
</script>

{#if isDev}
    <div
        class="astro-dev-toolbar"
        class:top-left={position === "top-left"}
        class:top-right={position === "top-right"}
        class:bottom-left={position === "bottom-left"}
        class:bottom-right={position === "bottom-right"}
        class:bottom-center={position === "bottom-center"}
    >
        {#if isVisible}
            <!-- Expanded Panel -->
            <div class="toolbar-panel">
                <div class="panel-content">
                    <div class="console-section">
                        <div class="console-controls">
                            <div class="filter-group">
                                <select
                                    bind:value={logFilter}
                                    class="log-filter"
                                >
                                    <option value="all"
                                        >All ({logs.length})</option
                                    >
                                    <option value="log"
                                        >Log ({logs.filter(
                                            (l) => l.level === "log",
                                        ).length})</option
                                    >
                                    <option value="info"
                                        >Info ({logs.filter(
                                            (l) => l.level === "info",
                                        ).length})</option
                                    >
                                    <option value="warn"
                                        >Warn ({logs.filter(
                                            (l) => l.level === "warn",
                                        ).length})</option
                                    >
                                    <option value="error"
                                        >Error ({logs.filter(
                                            (l) => l.level === "error",
                                        ).length})</option
                                    >
                                </select>
                            </div>
                            <button class="clear-btn" onclick={clearLogs}>
                                <X size={14} />
                                Clear
                            </button>
                            <button
                                class="close-panel-btn"
                                onclick={toggleVisibility}
                            >
                                <Minus size={16} />
                            </button>
                        </div>

                        <div class="console-logs">
                            {#each filteredLogs as log (log.id)}
                                <div
                                    class="log-entry"
                                    class:error={log.level === "error"}
                                    class:warn={log.level === "warn"}
                                    class:info={log.level === "info"}
                                >
                                    <div class="log-header">
                                        <span class="log-time"
                                            >{formatTime(log.timestamp)}</span
                                        >
                                        <span
                                            class="log-level"
                                            data-level={log.level}
                                            >{log.level.toUpperCase()}</span
                                        >
                                    </div>
                                    <div class="log-content">
                                        {#each log.args as arg, index}
                                            {#if index > 0}<span
                                                    class="log-separator"
                                                >
                                                </span>{/if}
                                            {#if arg.type === "json"}
                                                <div class="log-json-container">
                                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                                    {#if arg.expanded}
                                                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                                                        <div
                                                            class="log-json expanded"
                                                            onclick={() =>
                                                                toggleExpansion(
                                                                    log.id,
                                                                    index,
                                                                )}
                                                        >
                                                            <div
                                                                class="expand-header"
                                                            >
                                                                <span
                                                                    class="expand-indicator"
                                                                    >▼</span
                                                                >
                                                                <span
                                                                    class="expand-text"
                                                                    >{arg.content.split(
                                                                        "\n",
                                                                    ).length > 6
                                                                        ? "Large JSON Object (click to compact)"
                                                                        : "JSON Object (click to collapse)"}</span
                                                                >
                                                            </div>
                                                            <div
                                                                class="json-content"
                                                            >
                                                                {@html highlightJSON(
                                                                    arg.content,
                                                                )}
                                                            </div>
                                                        </div>
                                                    {:else}
                                                        <div
                                                            class="log-json collapsed"
                                                            onclick={() =>
                                                                toggleExpansion(
                                                                    log.id,
                                                                    index,
                                                                )}
                                                        >
                                                            <div
                                                                class="expand-header"
                                                            >
                                                                <span
                                                                    class="expand-indicator"
                                                                    >▶</span
                                                                >
                                                                <span
                                                                    class="expand-text"
                                                                    >{arg.content.split(
                                                                        "\n",
                                                                    ).length > 6
                                                                        ? "Large JSON Object (click to expand)"
                                                                        : "JSON Object (click to expand)"}</span
                                                                >
                                                            </div>
                                                            <div
                                                                class="json-preview"
                                                            >
                                                                {@html highlightJSON(
                                                                    getCollapsedPreview(
                                                                        arg.content,
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    {/if}
                                                </div>
                                            {:else}
                                                <span class="log-text"
                                                    >{arg.content}</span
                                                >
                                            {/if}
                                        {/each}
                                    </div>
                                </div>
                            {:else}
                                <div class="no-logs">
                                    <Terminal size={24} />
                                    <p>No logs to display</p>
                                    <small>Console logs will appear here</small>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        {:else}
            <!-- Astro-style Toolbar -->
            <div class="toolbar-pill">
                <button
                    class="toolbar-item console-btn"
                    onclick={toggleVisibility}
                    title="Console ({logs.length} logs)"
                >
                    <Terminal size={20} />
                    {#if logs.length > 0}
                        <span class="badge">{logs.length}</span>
                    {/if}
                </button>

                <button
                    class="toolbar-item position-btn"
                    onclick={(e) => togglePositionMenu(e)}
                    title="Change Position"
                >
                    <Move size={20} />
                </button>

                {#if showPositionMenu}
                    <div class="position-dropdown">
                        <div class="position-grid">
                            <button
                                class="position-option"
                                class:active={position === "top-left"}
                                onclick={() => selectPosition("top-left")}
                            >
                                <div class="position-visual">
                                    <div class="corner top-left"></div>
                                </div>
                                <span>Top Left</span>
                            </button>
                            <button
                                class="position-option"
                                class:active={position === "top-right"}
                                onclick={() => selectPosition("top-right")}
                            >
                                <div class="position-visual">
                                    <div class="corner top-right"></div>
                                </div>
                                <span>Top Right</span>
                            </button>
                            <button
                                class="position-option"
                                class:active={position === "bottom-left"}
                                onclick={() => selectPosition("bottom-left")}
                            >
                                <div class="position-visual">
                                    <div class="corner bottom-left"></div>
                                </div>
                                <span>Bottom Left</span>
                            </button>
                            <button
                                class="position-option"
                                class:active={position === "bottom-right"}
                                onclick={() => selectPosition("bottom-right")}
                            >
                                <div class="position-visual">
                                    <div class="corner bottom-right"></div>
                                </div>
                                <span>Bottom Right</span>
                            </button>
                            <button
                                class="position-option"
                                class:active={position === "bottom-center"}
                                onclick={() => selectPosition("bottom-center")}
                            >
                                <div class="position-visual">
                                    <div class="corner bottom-center"></div>
                                </div>
                                <span>Bottom Center</span>
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<style>
    /* Astro DevToolbar-inspired design */
    .astro-dev-toolbar {
        position: fixed;
        z-index: 10000;
        font-family:
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            "Helvetica Neue",
            Arial,
            "Noto Sans",
            sans-serif;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .astro-dev-toolbar.top-left {
        top: 20px;
        left: 20px;
    }

    .astro-dev-toolbar.top-right {
        top: 20px;
        right: 20px;
    }

    .astro-dev-toolbar.bottom-left {
        bottom: 20px;
        left: 20px;
    }

    .astro-dev-toolbar.bottom-right {
        bottom: 20px;
        right: 20px;
    }

    .astro-dev-toolbar.bottom-center {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
    }

    /* Toolbar Pill - Astro-inspired */
    .toolbar-pill {
        background: rgba(27, 31, 35, 0.95);
        border: 1px solid rgba(56, 62, 68, 0.5);
        border-radius: 50px;
        padding: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.32),
            0 2px 8px rgba(0, 0, 0, 0.24);
        backdrop-filter: blur(12px);
        transition: all 0.2s ease;
        position: relative;
    }

    .toolbar-pill:hover {
        background: rgba(27, 31, 35, 0.98);
        border-color: rgba(56, 62, 68, 0.8);
        box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.4),
            0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .toolbar-item {
        background: transparent;
        border: none;
        color: #ffffff;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;
    }

    .toolbar-item:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.05);
    }

    .toolbar-item:active {
        transform: scale(0.95);
    }

    .badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background: #ff6b6b;
        color: white;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
        line-height: 1.2;
    }

    /* Expanded Panel */
    .toolbar-panel {
        background: rgba(27, 31, 35, 0.95);
        border: 1px solid rgba(56, 62, 68, 0.5);
        border-radius: 12px;
        min-width: 400px;
        max-width: 500px;
        max-height: 60vh;
        box-shadow:
            0 16px 64px rgba(0, 0, 0, 0.4),
            0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(16px);
        animation: expandPanel 0.2s ease;
        overflow: hidden;
        color: white;
    }

    @keyframes expandPanel {
        from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    .panel-content {
        padding: 3px;
    }

    /* Console Controls */
    .console-controls {
        display: flex;
        gap: 6px;
        padding: 5px;
        align-items: center;
        border-bottom: 1px solid rgba(56, 62, 68, 0.3);
        margin-bottom: 5px;
    }

    .filter-group {
        flex: 1;
    }

    .log-filter {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid rgba(56, 62, 68, 0.5);
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.2);
        font-size: 12px;
        color: white;
        font-weight: 400;
        transition: all 0.15s ease;
    }

    .log-filter:focus {
        outline: none;
        border-color: #60a5fa;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .clear-btn,
    .close-panel-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 8px;
        background: rgba(239, 68, 68, 0.8);
        color: white;
        border: 1px solid rgba(239, 68, 68, 0.6);
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.15s ease;
    }

    .close-panel-btn {
        background: rgba(56, 62, 68, 0.8);
        border-color: rgba(56, 62, 68, 0.6);
    }

    .clear-btn:hover {
        background: rgba(239, 68, 68, 1);
    }

    .close-panel-btn:hover {
        background: rgba(75, 85, 99, 0.8);
    }

    .console-section {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 300px;
    }

    /* Position Dropdown */
    .position-dropdown {
        position: absolute;
        right: 0;
        background: rgba(27, 31, 35, 0.95);
        border: 1px solid rgba(56, 62, 68, 0.5);
        border-radius: 8px;
        padding: 12px;
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.32),
            0 2px 8px rgba(0, 0, 0, 0.24);
        backdrop-filter: blur(12px);
        z-index: 10001;
        animation: slideIn 0.2s ease;
    }

    /* When toolbar is at bottom positions - show menu above */
    .astro-dev-toolbar.bottom-left .position-dropdown,
    .astro-dev-toolbar.bottom-right .position-dropdown,
    .astro-dev-toolbar.bottom-center .position-dropdown {
        bottom: calc(100% + 12px);
    }

    /* When toolbar is at top positions - show menu below */
    .astro-dev-toolbar.top-left .position-dropdown,
    .astro-dev-toolbar.top-right .position-dropdown {
        top: calc(100% + 12px);
    }

    .position-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 4px;
        min-width: 140px;
    }

    .position-option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: transparent;
        border: 1px solid rgba(56, 62, 68, 0.3);
        border-radius: 6px;
        color: white;
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 12px;
        font-weight: 500;
        text-align: left;
    }

    .position-option:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(56, 62, 68, 0.6);
    }

    .position-option.active {
        background: rgba(59, 130, 246, 0.15);
        border-color: rgba(59, 130, 246, 0.5);
        color: #60a5fa;
    }

    .position-visual {
        width: 20px;
        height: 16px;
        background: rgba(56, 62, 68, 0.5);
        border-radius: 3px;
        position: relative;
        border: 1px solid rgba(75, 85, 99, 0.6);
    }

    .corner {
        width: 4px;
        height: 4px;
        background: #60a5fa;
        border-radius: 1px;
        position: absolute;
    }

    .corner.top-left {
        top: 2px;
        left: 2px;
    }

    .corner.top-right {
        top: 2px;
        right: 2px;
    }

    .corner.bottom-left {
        bottom: 2px;
        left: 2px;
    }

    .corner.bottom-right {
        bottom: 2px;
        right: 2px;
    }

    .corner.bottom-center {
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
    }

    .position-option.active .corner {
        background: #60a5fa;
        box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .console-section {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 350px;
    }

    .console-controls {
        display: flex;
        gap: 5px;
        padding: 5px 5px 0;
        margin-bottom: 5px;
        align-items: center;
    }

    .filter-group {
        flex: 1;
    }

    .log-filter {
        width: 100%;
        padding: 3px 5px;
        border: 1px solid hsl(215 27.9% 16.9% / 0.994);
        border-radius: 6px;
        background: hsl(220 13% 9% / 0.994);
        font-size: 14px;
        color: hsl(210 40% 98%);
        font-weight: 400;
        transition: all 0.15s ease;
    }

    .log-filter:focus {
        outline: none;
        border-color: hsl(217.2 91.2% 59.8%);
        box-shadow: 0 0 0 2px hsl(217.2 91.2% 59.8% / 0.3);
    }

    .log-filter:hover {
        border-color: hsl(215 27.9% 20%);
        background: hsl(220 13% 9%);
    }

    .clear-btn {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 3px 5px;
        background: hsl(0 84.2% 60.2%);
        color: hsl(210 40% 98%);
        border: 1px solid hsl(0 84.2% 60.2%);
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.15s ease;
    }

    .clear-btn:hover {
        background: hsl(0 84.2% 55%);
        border-color: hsl(0 84.2% 55%);
        color: hsl(210 40% 98%);
    }

    .clear-btn :global(svg) {
        color: hsl(210 40% 98%);
        stroke: hsl(210 40% 98%);
    }

    .console-logs {
        flex: 1;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(56, 62, 68, 0.3);
        border-radius: 6px;
        margin: 0 5px 5px;
        padding: 5px;
        font-family:
            ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        font-size: 12px;
        line-height: 1.4;
        scroll-behavior: smooth;
        max-height: 300px;
        min-height: 200px;
    }

    .log-entry {
        margin: 2px 0;
        padding: 4px;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(56, 62, 68, 0.2);
        transition: all 0.15s ease;
        position: relative;
        overflow: hidden;
    }

    .log-entry:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(56, 62, 68, 0.4);
    }

    .log-entry.error {
        border-left: 3px solid #ef4444;
        background: rgba(239, 68, 68, 0.1);
    }

    .log-entry.warn {
        border-left: 3px solid #f59e0b;
        background: rgba(245, 158, 11, 0.1);
    }

    .log-entry.info {
        border-left: 3px solid #60a5fa;
        background: rgba(96, 165, 250, 0.1);
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
        font-family:
            "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas,
            "Courier New", monospace;
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
        color: rgba(156, 163, 175, 0.8);
        margin: 40px 20px;
        padding: 20px;
        background: rgba(0, 0, 0, 0.1);
        border: 1px dashed rgba(56, 62, 68, 0.3);
        border-radius: 6px;
        font-size: 12px;
    }

    .no-logs p {
        margin: 8px 0 4px;
        color: rgba(156, 163, 175, 1);
        font-weight: 500;
    }

    .no-logs small {
        color: rgba(156, 163, 175, 0.6);
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
        .astro-dev-toolbar {
            bottom: 16px;
            right: 16px;
        }

        .toolbar-panel {
            min-width: 256px;
            max-width: calc(100vw - 26px);
        }

        .console-controls {
            flex-direction: column;
            gap: 4px;
        }

        .filter-group {
            width: 100%;
        }
    }
</style>
