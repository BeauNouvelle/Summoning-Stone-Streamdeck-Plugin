const API_BASE_URL = "http://127.0.0.1:7123";

type ApiError = {
	status: number;
	message: string;
};

export type SfxResponse = {
	name: string;
	localizedName: string;
	category: string;
	icon: string;
	filename: string;
	isPremium: boolean;
	pitchRange?: number | null;
	duration: number;
};

let cachedSfx: { fetchedAt: number; items: SfxResponse[] } | null = null;
const SFX_CACHE_TTL_MS = 30_000;

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	const response = await fetch(`${API_BASE_URL}${path}`, init);
	if (!response.ok) {
		const message = await response.text().catch(() => response.statusText);
		const error: ApiError = { status: response.status, message };
		throw error;
	}
	return response;
}

export async function fetchSfxList(): Promise<SfxResponse[]> {
	if (cachedSfx && Date.now() - cachedSfx.fetchedAt < SFX_CACHE_TTL_MS) {
		return cachedSfx.items;
	}

	const response = await apiFetch("/sfx");
	const items = (await response.json()) as SfxResponse[];
	cachedSfx = { fetchedAt: Date.now(), items };
	return items;
}

export async function fetchSfxIcon(name: string): Promise<string> {
	const response = await apiFetch(`/sfx/${encodeURIComponent(name)}/icon`);
	const buffer = Buffer.from(await response.arrayBuffer());
	return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function playSfx(name: string): Promise<void> {
	await apiFetch(`/sfx/${encodeURIComponent(name)}/play`, { method: "POST" });
}

export async function startScene(campaignId: string, sceneId: string): Promise<void> {
	await apiFetch(`/campaigns/${encodeURIComponent(campaignId)}/scenes/${encodeURIComponent(sceneId)}/start`, {
		method: "POST",
	});
}

export async function stopScene(): Promise<void> {
	await apiFetch("/scenes/stop", { method: "POST" });
}
