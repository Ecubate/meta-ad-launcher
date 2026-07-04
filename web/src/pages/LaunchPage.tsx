import { Rocket } from '../components/icons';

/**
 * The bulk Launch screen. Currently shows the connect-accounts empty state.
 * The bulk-launch table flow drops in here next.
 */
export function LaunchPage() {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center max-w-md">
        <div className="mx-auto w-24 h-24 rounded-2xl bg-surface border border-line grid place-items-center mb-6 text-primary">
          <Rocket size={40} />
        </div>
        <h1 className="text-lg font-semibold text-fg">Save 20+ hours every week</h1>
        <p className="text-muted text-sm mt-1">Link your ad accounts to launch ads 10x faster</p>
        <div className="flex items-center justify-center gap-2 mt-5">
          <button className="px-4 py-2 rounded-md bg-[#1877F2] text-white text-sm font-medium">Facebook</button>
          <button className="px-4 py-2 rounded-md bg-cyan-600 text-white text-sm font-medium">AppLovin</button>
          <button className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium border border-line">TikTok</button>
        </div>
        <p className="text-xs text-muted mt-6">Bulk-launch table coming next.</p>
      </div>
    </div>
  );
}
