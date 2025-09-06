# SV Floating Console

A beautiful floating console for Svelte applications that only appears in development mode. Features JSON syntax highlighting, automatic log management, and a modern dark theme inspired by shadcn/ui.

## ✨ Features

- 🎨 **Modern Dark UI** - Beautiful shadcn/ui inspired design
- 🔍 **JSON Syntax Highlighting** - Automatic detection and highlighting of JSON objects
- 📱 **Mobile Responsive** - Works perfectly on desktop and mobile
- ⚡ **Smart Log Management** - Keeps last 20 logs, auto-deletes older logs after 6 seconds
- 🚀 **Auto-Scroll** - Automatically scrolls to show latest logs
- 🌙 **Dark Theme Only** - Clean, professional dark interface
- 🔧 **Two Usage Options** - Manual component or auto-initialization
- 💨 **Development Only** - Automatically detects dev mode, invisible in production

## 📦 Installation

```bash
npm install sv-console
# or
pnpm add sv-console
# or
yarn add sv-console
#or 
bun add sv-console
```

## 🚀 Usage

### Option 1: Manual Component (Recommended)

Import and use the component in your Svelte app:

```svelte
<script>
  import { FloatingDevCards } from 'sv-console';
</script>

<FloatingDevCards />

<!-- Your app content -->
<main>
  <h1>My App</h1>
</main>
```

### Option 2: Auto-Initialization

Import once in your main app file and the console will automatically appear:

```javascript
// In your main app.js, main.ts, or app.html
import 'sv-console/auto';
```

The console will automatically inject itself when in development mode!

## 🔧 Svelte 5 Compatibility

This package is fully compatible with Svelte 5! The auto-initialization automatically detects your Svelte version and uses the appropriate mounting API:

- **Svelte 5**: Uses the new `mount()` API
- **Svelte 4**: Falls back to the legacy `new Component()` API

If you encounter any issues, please use the manual component option instead.

## 🎯 How It Works

### Development Detection
The console uses **strict production exclusion**. It will NOT appear if:

**🚫 Production Indicators (Console HIDDEN):**
- `process.env.NODE_ENV === 'production'` or `'prod'`
- HTTPS protocol with non-localhost hostname
- Standard ports (80, 443, or no port)
- Production domains (non-localhost hostnames)

**✅ Development Indicators (Console SHOWN):**
- `process.env.NODE_ENV === 'development'`
- `localhost`, `127.0.0.1`, or hostnames containing `localhost`
- Local network IPs (`192.168.x.x`)
- Dev server ports (5173, 5174, 3000, 8080, 4000, 8000, 9000)
- URL parameters: `dev`, `debug`, `local`

### Log Management
- **Last 20 logs always preserved** - Never deleted regardless of age
- **6-second cleanup** - Logs beyond the last 20 are deleted after 6 seconds
- **Automatic scrolling** - Always shows the latest logs
- **JSON detection** - Objects are automatically formatted and highlighted

### JSON Highlighting Colors
- **Keys**: Blue (`#66ccff`)
- **Strings**: Green (`#ff6666`) 
- **Numbers**: Purple (`#268d84`)
- **Booleans**: Yellow (`#ffa502`)
- **Null**: Red (`#ff4444`)
- **Brackets/Braces**: Light gray

## 📋 API

### FloatingDevCards Component

The main component with no props needed - it handles everything automatically.

```svelte
<FloatingDevCards />
```

### Auto-Initialization

```javascript
import 'sv-console/auto';
```

## 🎨 Styling

The component uses a fixed dark theme with modern styling. It's positioned at `bottom: 20px; right: 20px` and has a high z-index (10000) to stay on top.

### Mobile Responsive
- Adapts to smaller screens
- Touch-friendly controls
- Responsive layout

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package for publishing
npm run package
```

## 📝 Examples

### Basic Usage
```svelte
<script>
  import { FloatingDevCards } from 'sv-console';
  
  // This will show up in the console with syntax highlighting
  console.log('User data:', { 
    id: 1, 
    name: 'John', 
    active: true, 
    metadata: null 
  });
</script>

<FloatingDevCards />
```

### Auto-initialization
```javascript
// app.js or main.ts
import 'sv-console/auto';

// The console appears automatically!
console.log('This will show in the floating console');
```

## 🌍 URL Examples

**🟢 Console WILL appear (Development):**
```bash
http://localhost:5173          # Vite dev server
http://localhost:3000          # Next.js dev server  
http://127.0.0.1:8080         # Local dev
https://localhost:5174        # Vite with HTTPS
http://192.168.1.100:3000     # Local network
http://myapp.localhost        # Local domain
https://myapp.dev?debug=1     # Debug parameter
```

**🔴 Console will NOT appear (Production):**
```bash
https://myapp.com             # Production domain
https://myapp.vercel.app      # Vercel deployment  
https://subdomain.myapp.com   # Production subdomain
https://192.168.1.100        # No dev port
http://myapp.com:80          # Standard HTTP port
https://myapp.com:443        # Standard HTTPS port
```

## 🐛 Troubleshooting

### "component_api_invalid_new" Error
If you see this error when using auto-initialization:
```
Attempted to instantiate component with `new Component`, which is no longer valid in Svelte 5
```

**Solution**: The updated package should handle this automatically. If the error persists:

1. **Use the manual component instead**:
   ```svelte
   <script>
     import { FloatingDevCards } from 'sv-console';
   </script>
   <FloatingDevCards />
   ```

2. **Or set Svelte compatibility mode** (in `svelte.config.js`):
   ```js
   export default {
     compilerOptions: {
       compatibility: {
         componentApi: 4
       }
     }
   };
   ```

### Console Not Appearing
- Make sure you're in development mode
- Check that the import is in your main app file
- Ensure no other floating console is already mounted
- Check browser console for any error messages

### Icons Not Loading
- Make sure `@lucide/svelte` is installed: `npm install @lucide/svelte`
- The package should install this automatically as a dependency

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License