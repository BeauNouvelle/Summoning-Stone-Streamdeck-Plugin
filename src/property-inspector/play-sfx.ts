import streamDeck from "./streamdeck";

const API_BASE_URL = "http://127.0.0.1:7123";

type SfxSettings = {
	sfxName?: string;
	sfxTitle?: string;
};

type SfxItem = {
	name: string;
	localizedName: string;
	category: string;
	icon: string;
};

let settings: SfxSettings = {};
let sfxList: SfxItem[] = [];
let isLoadingSfx = false;
let isApplyingSettings = false;
let retryTimer: number | null = null;

const sfxSelect = document.getElementById("sfx-select") as HTMLSelectElement | null;
const statusEl = document.getElementById("status") as HTMLParagraphElement | null;
const retryButton = document.getElementById("retry-button") as HTMLButtonElement | null;

function setStatus(message: string) {
	if (statusEl) statusEl.textContent = message || "";
}

function scheduleRetry() {
	if (retryTimer) return;
	retryTimer = window.setTimeout(() => {
		retryTimer = null;
		loadSfx();
	}, 5000);
}

function clearRetry() {
	if (retryTimer) {
		window.clearTimeout(retryTimer);
		retryTimer = null;
	}
}

function setSelectEnabled(enabled: boolean) {
	if (sfxSelect) sfxSelect.disabled = !enabled;
}

function setOptionsPlaceholder(label: string) {
	if (!sfxSelect) return;
	sfxSelect.innerHTML = "";
	const placeholder = document.createElement("option");
	placeholder.value = "";
	placeholder.textContent = label;
	sfxSelect.appendChild(placeholder);
}

async function fetchJson(path: string): Promise<any> {
	try {
		const response = await fetch(`${API_BASE_URL}${path}`);
		if (response.status === 401) {
			throw new Error("Please sign in to Summoning Stone to load SFX.");
		}
		if (!response.ok) {
			throw new Error(`Unexpected response (${response.status}).`);
		}
		return await response.json();
	} catch (error) {
		throw error;
	}
}

async function loadSfx() {
	if (isLoadingSfx) return;
	isLoadingSfx = true;
	clearRetry();
	setStatus("Loading SFX...");
	setSelectEnabled(false);
	setOptionsPlaceholder("Loading...");
	
	try {
		sfxList = await fetchJson("/sfx");
		populateOptions();
		updateSelection();
		setStatus("");
		setSelectEnabled(true);
	} catch (error: any) {
		const message = error?.message || "Unable to load SFX.";
		setOptionsPlaceholder("Summoning Stone not connected");
		setStatus(`${message} Open the Summoning Stone app to continue. Retrying...`);
		scheduleRetry();
	} finally {
		isLoadingSfx = false;
	}
}

function populateOptions() {
	if (!sfxSelect) return;
	setOptionsPlaceholder("Select a sound effect");

	sfxList.forEach((item) => {
		const option = document.createElement("option");
		option.value = item.name;
		option.textContent = item.localizedName || item.name;
		sfxSelect.appendChild(option);
	});
}

function updateSelection() {
	if (!sfxList.length || !sfxSelect) return;
	isApplyingSettings = true;
	sfxSelect.value = settings.sfxName || "";
	isApplyingSettings = false;
}

function handleSelectionChange() {
	if (isApplyingSettings || !sfxList.length || !sfxSelect) return;
	const selected = sfxList.find((item) => item.name === sfxSelect.value);
	
	if (!selected) {
		settings = { ...settings, sfxName: undefined, sfxTitle: undefined };
		streamDeck.settings.setSettings(settings);
		return;
	}
	
	settings = {
		...settings,
		sfxName: selected.name,
		sfxTitle: selected.localizedName || selected.name,
	};
	streamDeck.settings.setSettings(settings);
}

// Listen for settings from Stream Deck
streamDeck.onDidReceiveSettings(({ payload }: { payload: { settings?: SfxSettings } }) => {
	settings = payload.settings || {};
	updateSelection();
});

// Set up event listeners
if (sfxSelect) {
	sfxSelect.addEventListener("change", handleSelectionChange);
	sfxSelect.addEventListener("input", handleSelectionChange);
}

if (retryButton) {
	retryButton.addEventListener("click", () => loadSfx());
}

// Initialize
setOptionsPlaceholder("Loading...");
setStatus("Connecting...");

streamDeck.settings.getSettings().then((initialSettings) => {
	settings = (initialSettings as SfxSettings) || {};
	loadSfx();
});
