import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { Shell } from './components/Shell';
import { LaunchPage } from './pages/LaunchPage';
import { CreativesPage } from './pages/CreativesPage';
import { LaunchedAdsPage } from './pages/LaunchedAdsPage';
import { Placeholder } from './pages/Placeholder';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/launch" replace />} />
        <Route path="/launch" element={<LaunchPage />} />
        <Route path="/creatives" element={<CreativesPage />} />
        <Route path="/launched" element={<LaunchedAdsPage />} />
        <Route path="/partnership" element={<Placeholder title="Partnership Ads" />} />
        <Route path="/drafts" element={<Placeholder title="Drafts" />} />
        <Route path="/ad-copy/default" element={<Placeholder title="Default Ad Copy" />} />
        <Route path="/ad-copy/templates" element={<Placeholder title="Ad Copy Templates" />} />
        <Route path="/setup/enhancements" element={<Placeholder title="Creative Enhancements" />} />
        <Route path="/setup/placements" element={<Placeholder title="Configure Placements" />} />
        <Route path="/setup/launch-settings" element={<Placeholder title="Launch Settings" />} />
      </Routes>
    </Shell>
  );
}

export { NavLink };
