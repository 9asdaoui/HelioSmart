# HelioSmart Frontend Setup Guide

## Prerequisites
- Node.js 18 or higher
- npm or yarn

## Installation Steps

### 1. Install Dependencies
```bash
cd frontend
npm install
# or
yarn install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
copy .env.example .env  # Windows
# or
cp .env.example .env    # macOS/Linux
```

Edit `.env` file if needed:
```env
VITE_API_URL=http://localhost:8000/api/v1
```

### 3. Run Development Server
```bash
npm run dev
# or
yarn dev
```

The application will be available at http://localhost:5173

### 4. Build for Production
```bash
npm run build
# or
yarn build
```

The production build will be in the `dist` folder.

### 5. Preview Production Build
```bash
npm run preview
# or
yarn preview
```

## Project Structure

```
src/
├── components/          # Reusable React components
│   └── Layout.jsx      # Main layout component
├── pages/              # Page components
│   ├── Home.jsx
│   ├── Estimations.jsx
│   ├── CreateEstimation.jsx
│   ├── EstimationDetails.jsx
│   ├── Panels.jsx
│   ├── Inverters.jsx
│   ├── Utilities.jsx
│   └── Configurations.jsx
├── services/           # API service layer
│   └── api.js         # API client and endpoints
├── App.jsx            # Main app component with routing
├── main.jsx           # Application entry point
└── index.css          # Global styles with Tailwind
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features

- **Modern UI**: Built with Tailwind CSS
- **Routing**: React Router for client-side routing
- **Data Fetching**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form for form management
- **Icons**: Lucide React for beautiful icons
- **Charts**: Recharts for data visualization

## Common Issues

### Port Already in Use
Change the port in `vite.config.js`:
```js
server: {
  port: 3000, // or any available port
}
```

### API Connection Errors
- Ensure backend is running on http://localhost:8000
- Check VITE_API_URL in .env file
- Verify CORS settings in backend

### Build Errors
- Clear node_modules: `rm -rf node_modules`
- Reinstall: `npm install`
- Clear build cache: `rm -rf dist`
