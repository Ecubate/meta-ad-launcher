import { Route, Routes, Navigate } from 'react-router-dom';
import { Shell } from './components/Shell';
import { LaunchTablePage } from './pages/LaunchTablePage';
import { CreativesPage } from './pages/CreativesPage';
import { LaunchedAdsPage } from './pages/LaunchedAdsPage';
import { DraftsPage } from './pages/DraftsPage';
import { LaunchSettingsPage } from './pages/LaunchSettingsPage';
import { CreativeEnhancementsPage } from './pages/CreativeEnhancementsPage';
import { ConfigurePlacementsPage } from './pages/ConfigurePlacementsPage';
import { AdCopyTemplatesPage } from './pages/AdCopyTemplatesPage';
import { DefaultAdCopyPage } from './pages/DefaultAdCopyPage';
import { Placeholder } from './pages/Placeholder';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/launch" replace />} />
        <Route path="/launch" element={<LaunchTablePage />} />
        <Route path="/creatives" element={<CreativesPage />} />
        <Route path="/launched" element={<LaunchedAdsPage />} />
        <Route path="/drafts" element={<DraftsPage />} />
        <Route path="/partnership" element={<Placeholder title="Partnership Ads" />} />
        <Route path="/ad-copy/default" element={<DefaultAdCopyPage />} />
        <Route path="/ad-copy/templates" element={<AdCopyTemplatesPage />} />
        <Route path="/setup/enhancements" element={<CreativeEnhancementsPage />} />
        <Route path="/setup/placements" element={<ConfigurePlacementsPage />} />
        <Route path="/setup/launch-settings" element={<LaunchSettingsPage />} />
      </Routes>
    </Shell>
  );
}
