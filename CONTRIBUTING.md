# Contributing to sv-console

Thank you for your interest in contributing to sv-console! This guide will help you set up the project for local development and testing.

## 🛠️ Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm, pnpm, yarn, or bun

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sv-console.git
   cd sv-console
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   This starts the Vite dev server where you can test the component in real-time.

4. **Build the package**
   ```bash
   npm run build
   ```
   This runs both `vite build` and `npm run package` to create the distributable package.

5. **Package for distribution**
   ```bash
   npm run package
   ```
   This creates the final package in the `dist/` directory using SvelteKit's packaging tools.

## 🧪 Local Testing with file:../../

To test your local changes in another Svelte project without publishing to npm:

### Method 1: Using file: Protocol (Recommended)

1. **In your sv-console project**, build the package:
   ```bash
   npm run build
   ```

2. **In your test project**, install the local package:
   ```bash
   # Navigate to your test project
   cd ../your-test-project
   
   # Install using file protocol with relative path
   npm install file:../sv-console
   # or if projects are in different locations:
   npm install file:../../path/to/sv-console
   ```

3. **Use the component in your test project**:
   ```svelte
   <script>
     import { FloatingDevCards } from 'sv-console';
   </script>

   <FloatingDevCards />
   ```

4. **After making changes**, rebuild and reinstall:
   ```bash
   # In sv-console directory
   npm run build
   
   # In your test project
   npm install file:../sv-console --force
   ```

### Method 2: Using npm link

1. **In your sv-console project**, create a global link:
   ```bash
   npm run build
   npm link
   ```

2. **In your test project**, link to the local package:
   ```bash
   npm link sv-console
   ```

3. **After changes**, rebuild and the link will automatically use the latest build:
   ```bash
   # In sv-console directory
   npm run build
   ```

### Method 3: Using pnpm (if using pnpm)

```bash
# In your test project
pnpm add file:../sv-console
```

## 🔍 Development Workflow

### Making Changes

1. **Edit source files** in `src/lib/`
   - `FloatingDevCards.svelte` - Main component
   - `auto.ts` - Auto-initialization logic
   - `utils.ts` - Utility functions

2. **Test your changes**
   ```bash
   npm run dev
   ```

3. **Type check your code**
   ```bash
   npm run check
   ```

4. **Build and test locally**
   ```bash
   npm run build
   # Test in your local project using file:../../ method
   ```

### Project Structure

```
sv-console/
├── src/
│   ├── lib/
│   │   ├── FloatingDevCards.svelte  # Main component
│   │   ├── auto.ts                  # Auto-initialization
│   │   ├── utils.ts                 # Utilities
│   │   └── index.ts                 # Package exports
│   ├── routes/                      # Dev server routes
│   └── app.html                     # Dev server template
├── dist/                            # Built package (after npm run package)
├── package.json
├── svelte.config.js
├── vite.config.js
└── tsconfig.json
```

### Build Scripts Explained

- `npm run dev` - Start Vite dev server for development
- `npm run build` - Build and package the library
- `npm run package` - Create distributable package in `dist/`
- `npm run check` - Type check with Svelte compiler

## 🐛 Testing Changes

### Quick Test Loop

1. Make changes to source code
2. Run `npm run build` 
3. In test project: `npm install file:../sv-console --force`
4. Test the changes in your application
5. Repeat as needed

### Testing Auto-initialization

To test the auto-initialization feature:

```javascript
// In your test project's main file (app.js, main.ts, etc.)
import 'sv-console/auto';

console.log('This should appear in the floating console');
```

### Testing Different Environments

The console only appears in development mode. Test various scenarios:

- `localhost` with dev ports (5173, 3000, etc.)
- Different `NODE_ENV` values
- Production-like URLs (should hide the console)

## 📋 Code Guidelines

- Follow existing code style and patterns
- Use TypeScript for type safety
- Keep the package lightweight
- Test in both Svelte 4 and 5 environments
- Ensure backwards compatibility
- Add JSDoc comments for public APIs

## 🚀 Publishing Workflow

1. Make your changes and test locally
2. Update version in `package.json`
3. Run `npm run build` to ensure everything builds
4. Commit your changes
5. Create a pull request

## 🤝 Getting Help

- Check existing issues and discussions
- Create an issue for bugs or feature requests
- Ask questions in discussions section

Happy contributing! 🎉