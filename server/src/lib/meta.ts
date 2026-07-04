import { env } from '../env.js';

/**
 * Thin client over the Meta Marketing (Graph) API.
 *
 * Design principle: every Advantage+/AI feature is OFF unless explicitly enabled.
 * That's the whole point of this tool — no more toggling AI off by hand in Ads Manager.
 * The API does NOT auto-enable these the way the UI does; we still opt out explicitly
 * where Meta would otherwise default-enroll (standard enhancements, advantage audience).
 */

const BASE = () => `https://graph.facebook.com/${env.meta.version}`;

export class MetaError extends Error {
  constructor(message: string, public status: number, public fbtrace?: string, public raw?: unknown) {
    super(message);
    this.name = 'MetaError';
  }
}

async function graph<T = any>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'DELETE'; token: string; params?: Record<string, any>; body?: FormData } = { token: '' },
): Promise<T> {
  const method = opts.method ?? 'GET';
  const url = new URL(`${BASE()}/${path.replace(/^\//, '')}`);

  let body: BodyInit | undefined;
  if (opts.body) {
    body = opts.body;
    opts.body.set('access_token', opts.token);
  } else if (method === 'GET') {
    for (const [k, v] of Object.entries(opts.params ?? {})) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    url.searchParams.set('access_token', opts.token);
  } else {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.params ?? {})) {
      if (v === undefined || v === null) continue;
      form.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    form.set('access_token', opts.token);
    body = form;
  }

  const res = await fetch(url, {
    method,
    body,
    headers: opts.body ? undefined : method === 'GET' ? undefined : { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error ?? {};
    throw new MetaError(e.message ?? `Meta API ${res.status}`, res.status, e.fbtrace_id, json);
  }
  return json as T;
}

const acct = (id: string) => `act_${id.replace(/^act_/, '')}`;

// ─── Discovery (onboarding dropdowns) ────────────────────────────────────────

export const meta = {
  /** Pages the token can manage — feeds the "Select Facebook Page" dropdown. */
  listPages(token: string) {
    return graph<{ data: Array<{ id: string; name: string; instagram_business_account?: { id: string } }> }>(
      'me/accounts',
      { token, params: { fields: 'id,name,instagram_business_account', limit: 200 } },
    );
  },

  listAdAccounts(token: string) {
    return graph<{ data: Array<{ id: string; account_id: string; name: string; currency: string; account_status: number }> }>(
      'me/adaccounts',
      { token, params: { fields: 'account_id,name,currency,account_status', limit: 200 } },
    );
  },

  /** Pixels on an ad account — feeds the "Website pixel" dropdown. */
  listPixels(accountId: string, token: string) {
    return graph<{ data: Array<{ id: string; name: string }> }>(`${acct(accountId)}/adspixels`, {
      token,
      params: { fields: 'id,name', limit: 100 },
    });
  },

  /** Existing campaigns on the account — for the launch table campaign filter. */
  listCampaigns(accountId: string, token: string) {
    return graph<{ data: Array<{ id: string; name: string; status: string; objective: string }> }>(
      `${acct(accountId)}/campaigns`,
      { token, params: { fields: 'id,name,status,objective', limit: 200 } },
    );
  },

  /** Existing ad sets — feeds the "Select Ad Set" column (attach ads to an existing ad set). */
  listAdSets(accountId: string, token: string) {
    return graph<{ data: Array<{ id: string; name: string; status: string; campaign_id: string; campaign?: { name: string } }> }>(
      `${acct(accountId)}/adsets`,
      { token, params: { fields: 'id,name,status,campaign_id,campaign{name}', limit: 500 } },
    );
  },

  // ─── Media upload ──────────────────────────────────────────────────────────

  /** Upload an image; returns its image_hash (cache this on the Creative). */
  async uploadImage(accountId: string, token: string, file: { bytes: Buffer; filename: string }): Promise<string> {
    const form = new FormData();
    form.set('source', new Blob([new Uint8Array(file.bytes)]), file.filename);
    const res = await graph<{ images: Record<string, { hash: string }> }>(`${acct(accountId)}/adimages`, {
      method: 'POST',
      token,
      body: form,
    });
    const first = Object.values(res.images)[0];
    return first.hash;
  },

  /** Upload a video; returns its video_id. */
  async uploadVideo(accountId: string, token: string, file: { bytes: Buffer; filename: string }): Promise<string> {
    const form = new FormData();
    form.set('source', new Blob([new Uint8Array(file.bytes)]), file.filename);
    const res = await graph<{ id: string }>(`${acct(accountId)}/advideos`, { method: 'POST', token, body: form });
    return res.id;
  },

  // ─── Launch chain ────────────────────────────────────────────────────────────

  async createCampaign(
    accountId: string,
    token: string,
    p: { name: string; objective: string; status?: 'PAUSED' | 'ACTIVE'; specialAdCategories?: string[]; dailyBudget?: number },
  ): Promise<string> {
    const res = await graph<{ id: string }>(`${acct(accountId)}/campaigns`, {
      method: 'POST',
      token,
      params: {
        name: p.name,
        objective: p.objective,
        status: p.status ?? 'PAUSED',
        special_ad_categories: p.specialAdCategories ?? [],
        // Budget lives at the ad set by default → avoids Advantage Campaign Budget (CBO)
        // unless a campaign-level dailyBudget is explicitly passed. When there's no campaign
        // budget, Meta requires is_adset_budget_sharing_enabled to be set explicitly; false
        // keeps budgets isolated per ad set (no Advantage budget sharing).
        ...(p.dailyBudget ? { daily_budget: p.dailyBudget } : { is_adset_budget_sharing_enabled: false }),
      },
    });
    return res.id;
  },

  async createAdSet(
    accountId: string,
    token: string,
    p: {
      name: string;
      campaignId: string;
      dailyBudget?: number; // minor units (cents)
      billingEvent?: string;
      optimizationGoal?: string;
      bidStrategy?: string;
      pixelId?: string;
      customEventType?: string; // e.g. PURCHASE
      targeting: Record<string, any>;
      startTime?: string;
      status?: 'PAUSED' | 'ACTIVE';
      advantageAudience?: boolean; // default false → AI audience OFF
    },
  ): Promise<string> {
    // Force AI audience OFF unless explicitly opted in.
    const targeting = {
      ...p.targeting,
      targeting_automation: { advantage_audience: p.advantageAudience ? 1 : 0 },
    };
    const res = await graph<{ id: string }>(`${acct(accountId)}/adsets`, {
      method: 'POST',
      token,
      params: {
        name: p.name,
        campaign_id: p.campaignId,
        ...(p.dailyBudget ? { daily_budget: p.dailyBudget } : {}),
        billing_event: p.billingEvent ?? 'IMPRESSIONS',
        optimization_goal: p.optimizationGoal ?? 'OFFSITE_CONVERSIONS',
        bid_strategy: p.bidStrategy ?? 'LOWEST_COST_WITHOUT_CAP',
        ...(p.pixelId
          ? { promoted_object: { pixel_id: p.pixelId, custom_event_type: p.customEventType ?? 'PURCHASE' } }
          : {}),
        targeting,
        start_time: p.startTime,
        status: p.status ?? 'PAUSED',
      },
    });
    return res.id;
  },

  async createAdCreative(
    accountId: string,
    token: string,
    p: {
      name: string;
      pageId: string;
      instagramActorId?: string;
      imageHash?: string;
      videoId?: string;
      message: string; // primary text
      headline?: string;
      description?: string;
      link: string;
      ctaType?: string;
      enhancements?: Record<string, boolean>; // per-feature; default all OFF
      multiAdvertiser?: boolean;
    },
  ): Promise<string> {
    const link_data: Record<string, any> = {
      link: p.link,
      message: p.message,
      ...(p.headline ? { name: p.headline } : {}),
      ...(p.description ? { description: p.description } : {}),
      ...(p.imageHash ? { image_hash: p.imageHash } : {}),
      ...(p.ctaType ? { call_to_action: { type: p.ctaType, value: { link: p.link } } } : {}),
    };

    // Opt OUT of standard creative enhancements (auto-crop, filters, text rewrite, etc.)
    // unless a feature is explicitly enabled in `enhancements`.
    const features = p.enhancements ?? {};
    const optOut = (on?: boolean) => ({ enroll_status: on ? 'OPT_IN' : 'OPT_OUT' });
    // NOTE: the umbrella `standard_enhancements` field is deprecated (error 3858504) —
    // Meta requires opting into/out of individual features instead. All OPT_OUT = AI off.
    const degrees_of_freedom_spec = {
      creative_features_spec: {
        image_templates: optOut(features.imageTemplates),
        text_optimizations: optOut(features.textImprovements),
        image_brightness_and_contrast: optOut(features.brightnessContrast),
        image_uncrop: optOut(features.uncrop),
      },
    };

    const object_story_spec: Record<string, any> = {
      page_id: p.pageId,
      ...(p.instagramActorId ? { instagram_actor_id: p.instagramActorId } : {}),
      ...(p.videoId ? { video_data: { video_id: p.videoId, message: p.message, call_to_action: link_data.call_to_action } } : { link_data }),
    };

    const res = await graph<{ id: string }>(`${acct(accountId)}/adcreatives`, {
      method: 'POST',
      token,
      params: {
        name: p.name,
        object_story_spec,
        degrees_of_freedom_spec,
        ...(p.multiAdvertiser !== undefined
          ? { contextual_multi_ads: { enroll_status: p.multiAdvertiser ? 'OPT_IN' : 'OPT_OUT' } }
          : {}),
      },
    });
    return res.id;
  },

  async createAd(
    accountId: string,
    token: string,
    p: { name: string; adsetId: string; creativeId: string; status?: 'PAUSED' | 'ACTIVE' },
  ): Promise<string> {
    const res = await graph<{ id: string }>(`${acct(accountId)}/ads`, {
      method: 'POST',
      token,
      params: {
        name: p.name,
        adset_id: p.adsetId,
        creative: { creative_id: p.creativeId },
        status: p.status ?? 'PAUSED',
      },
    });
    return res.id;
  },
};
