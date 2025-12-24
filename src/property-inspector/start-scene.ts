import streamDeck from "@elgato/streamdeck/property-inspector";

const API_BASE_URL = "http://127.0.0.1:7123";

type SceneSettings = {
	campaignId?: string;
	campaignName?: string;
	sceneId?: string;
	sceneName?: string;
};

type Campaign = {
	id: string;
	name: string;
};

type Scene = {
	id: string;
	name: string;
};

let settings: SceneSettings = {};
let campaigns: Campaign[] = [];
let scenes: Scene[] = [];
let isLoadingCampaigns = false;
let isLoadingScenes = false;
let isApplyingSettings = false;
let loadedCampaignId = "";
let retryTimer: number | null = null;

const campaignSelect = document.getElementById("campaign-select") as HTMLSelectElement | null;
const sceneSelect = document.getElementById("scene-select") as HTMLSelectElement | null;
const statusEl = document.getElementById("status") as HTMLParagraphElement | null;
const retryButton = document.getElementById("retry-button") as HTMLButtonElement | null;

function setStatus(message: string) {
	if (statusEl) statusEl.textContent = message || "";
}

function scheduleRetry() {
	if (retryTimer) return;
	retryTimer = window.setTimeout(() => {
		retryTimer = null;
		loadCampaigns();
	}, 5000);
}

function clearRetry() {
	if (retryTimer) {
		window.clearTimeout(retryTimer);
		retryTimer = null;
	}
}

function setSelectsEnabled(enabled: boolean) {
	if (campaignSelect) campaignSelect.disabled = !enabled;
	if (sceneSelect) sceneSelect.disabled = !enabled;
}

function setCampaignPlaceholder(label: string) {
	if (!campaignSelect) return;
	campaignSelect.innerHTML = "";
	const placeholder = document.createElement("option");
	placeholder.value = "";
	placeholder.textContent = label;
	campaignSelect.appendChild(placeholder);
}

function setScenePlaceholder(label: string) {
	if (!sceneSelect) return;
	sceneSelect.innerHTML = "";
	const placeholder = document.createElement("option");
	placeholder.value = "";
	placeholder.textContent = label;
	sceneSelect.appendChild(placeholder);
}

async function fetchJson(path: string): Promise<any> {
	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => controller.abort(), 3000);
	try {
		const response = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal });
		if (response.status === 401) {
			throw new Error("Please sign in to Summoning Stone to load scenes.");
		}
		if (!response.ok) {
			throw new Error(`Unexpected response (${response.status}).`);
		}
		return await response.json();
	} catch (error: any) {
		if (error?.name === "AbortError") {
			throw new Error("Request timed out. Is Summoning Stone open?");
		}
		throw error;
	} finally {
		window.clearTimeout(timeoutId);
	}
}

async function loadCampaigns() {
	if (isLoadingCampaigns) return;
	isLoadingCampaigns = true;
	clearRetry();
	setStatus("Loading campaigns...");
	setSelectsEnabled(false);
	setCampaignPlaceholder("Loading...");
	setScenePlaceholder("Select a scene");

	try {
		campaigns = await fetchJson("/campaigns");
		populateCampaigns();
		await loadScenes(settings.campaignId);
		await updateSelections();
		setStatus("");
		setSelectsEnabled(true);
	} catch (error: any) {
		const message = error?.message || "Unable to load campaigns.";
		setCampaignPlaceholder("Summoning Stone not connected");
		setScenePlaceholder("Select a scene");
		setStatus(`${message} Open the Summoning Stone app to continue. Retrying...`);
		scheduleRetry();
	} finally {
		isLoadingCampaigns = false;
	}
}

async function loadScenes(campaignId?: string) {
	scenes = [];
	if (!campaignId) {
		loadedCampaignId = "";
		populateScenes();
		return;
	}
	
	isLoadingScenes = true;
	setStatus("Loading scenes...");
	try {
		scenes = await fetchJson(`/campaigns/${encodeURIComponent(campaignId)}/scenes`);
		populateScenes();
		loadedCampaignId = campaignId;
		setStatus("");
	} catch (error: any) {
		populateScenes();
		loadedCampaignId = "";
		const message = error?.message || "Unable to load scenes for this campaign.";
		setStatus(message);
	} finally {
		isLoadingScenes = false;
	}
}

function populateCampaigns() {
	if (!campaignSelect) return;
	setCampaignPlaceholder("Select a campaign");

	campaigns.forEach((campaign) => {
		const option = document.createElement("option");
		option.value = campaign.id;
		option.textContent = campaign.name;
		campaignSelect.appendChild(option);
	});
}

function populateScenes() {
	if (!sceneSelect) return;
	setScenePlaceholder("Select a scene");

	scenes.forEach((scene) => {
		const option = document.createElement("option");
		option.value = scene.id;
		option.textContent = scene.name;
		sceneSelect.appendChild(option);
	});
}

async function updateSelections() {
	if (campaigns.length && campaignSelect) {
		isApplyingSettings = true;
		campaignSelect.value = settings.campaignId || "";
		isApplyingSettings = false;
	}
	
	if (settings.campaignId && loadedCampaignId !== settings.campaignId && !isLoadingCampaigns) {
		await loadScenes(settings.campaignId);
	}
	
	if (scenes.length && sceneSelect) {
		isApplyingSettings = true;
		sceneSelect.value = settings.sceneId || "";
		isApplyingSettings = false;
	}
}

async function handleCampaignChange() {
	if (isApplyingSettings || !campaigns.length || !campaignSelect) return;
	const currentValue = campaignSelect.value;
	const selected = campaigns.find((campaign) => campaign.id === currentValue);
	
	streamDeck.settings.setSettings({
		campaignId: selected?.id,
		campaignName: selected?.name,
		sceneId: undefined,
		sceneName: undefined,
	});
	
	await loadScenes(selected?.id);
	if (sceneSelect) sceneSelect.value = "";
}

function handleSceneChange() {
	if (isApplyingSettings || !scenes.length || !sceneSelect) return;
	const currentValue = sceneSelect.value;
	const selected = scenes.find((scene) => scene.id === currentValue);
	
	streamDeck.settings.setSettings({
		sceneId: selected?.id,
		sceneName: selected?.name,
	});
}

// Listen for settings from Stream Deck
streamDeck.onDidReceiveSettings(({ payload }) => {
	settings = payload.settings || {};
	void updateSelections();
});

// Set up event listeners
if (campaignSelect) {
	campaignSelect.addEventListener("change", () => void handleCampaignChange());
	campaignSelect.addEventListener("input", () => void handleCampaignChange());
}

if (sceneSelect) {
	sceneSelect.addEventListener("change", handleSceneChange);
	sceneSelect.addEventListener("input", handleSceneChange);
}

if (retryButton) {
	retryButton.addEventListener("click", () => loadCampaigns());
}

// Initialize
setCampaignPlaceholder("Loading...");
setScenePlaceholder("Loading...");
setStatus("Connecting...");

streamDeck.settings.getSettings().then((initialSettings) => {
	settings = (initialSettings as SceneSettings) || {};
	loadCampaigns();
});