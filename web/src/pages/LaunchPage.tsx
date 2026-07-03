/**
 * The bulk Launch screen. Currently shows the connect-accounts empty state
 * (Adnova screenshot 1). The bulk-launch table flow drops in here once the
 * remaining launch-flow screenshots are mapped.
 */
export function LaunchPage() {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center max-w-md">
        <div className="mx-auto w-40 h-40 rounded-2xl bg-emerald-50 grid place-items-center mb-6 text-5xl">🚀</div>
        <h1 className="text-lg font-semibold">Save 20+ hours every week</h1>
        <p className="text-slate-500 text-sm mt-1">Link your ad accounts to launch ads 10x faster</p>
        <div className="flex items-center justify-center gap-2 mt-5">
          <button className="px-4 py-2 rounded-md bg-[#1877F2] text-white text-sm font-medium">Facebook</button>
          <button className="px-4 py-2 rounded-md bg-cyan-600 text-white text-sm font-medium">AppLovin</button>
          <button className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium">TikTok</button>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          Bulk-launch table coming next — send the 3 launch-flow screenshots to wire it up.
        </p>
      </div>
    </div>
  );
}
