import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AccountProvider } from './lib/account';
import { AuthProvider, useAuth } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-full grid place-items-center bg-bg text-muted text-sm">Loading…</div>;
  if (!user) return <LoginPage />;
  return (
    <ErrorBoundary>
      <AccountProvider>
        <App />
      </AccountProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
