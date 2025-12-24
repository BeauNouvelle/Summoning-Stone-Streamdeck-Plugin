type StreamDeckSettingsEvent<TSettings> = {
	payload: {
		settings?: TSettings;
	};
};

type StreamDeckSettingsListener<TSettings> = (event: StreamDeckSettingsEvent<TSettings>) => void;

type StreamDeckSettingsApi<TSettings> = {
	getSettings: () => Promise<TSettings>;
	setSettings: (settings: Partial<TSettings>) => void;
};

type StreamDeckApi<TSettings> = {
	settings: StreamDeckSettingsApi<TSettings>;
	onDidReceiveSettings: (handler: StreamDeckSettingsListener<TSettings>) => void;
};

type StreamDeckConnectionInfo = {
	payload?: {
		settings?: Record<string, unknown>;
	};
	context?: string;
};

const settingsListeners = new Set<StreamDeckSettingsListener<Record<string, unknown>>>();
let webSocket: WebSocket | null = null;
let context: string | null = null;
let cachedSettings: Record<string, unknown> = {};
let resolveSettings: ((settings: Record<string, unknown>) => void) | null = null;
let settingsReady = new Promise<Record<string, unknown>>((resolve) => {
	resolveSettings = resolve;
});

const logPrefix = "[Summoning Stone PI]";
function debugLog(message: string, data?: unknown) {
	const logLine = data === undefined ? message : `${message} ${JSON.stringify(data)}`;
	if (data === undefined) {
		console.log(`${logPrefix} ${message}`);
	} else {
		console.log(`${logPrefix} ${message}`, data);
	}

	if (typeof document !== "undefined") {
		const debugEl = document.getElementById("debug-log");
		if (debugEl) {
			const time = new Date().toLocaleTimeString();
			debugEl.textContent = `${time} ${logPrefix} ${logLine}\n${debugEl.textContent ?? ""}`;
		}
	}
}

function parseJson<T>(value: T | string): T {
	if (typeof value === "string") {
		return JSON.parse(value) as T;
	}
	return value;
}

function emitSettings(settings: Record<string, unknown>) {
	const payload = { settings };
	for (const listener of settingsListeners) {
		listener({ payload });
	}
}

function setCachedSettings(nextSettings: Record<string, unknown>) {
	cachedSettings = nextSettings;
	if (resolveSettings) {
		resolveSettings(cachedSettings);
		resolveSettings = null;
	}
}

function resetSettingsPromise() {
	settingsReady = new Promise<Record<string, unknown>>((resolve) => {
		resolveSettings = resolve;
	});
}

function sendMessage(message: Record<string, unknown>) {
	if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
		return;
	}
	webSocket.send(JSON.stringify(message));
}

function connectElgatoStreamDeck(
	port: string,
	uuid: string,
	registerEvent: string,
	_: unknown,
	actionInfo: StreamDeckConnectionInfo | string,
) {
	debugLog("Connecting property inspector...");
	resetSettingsPromise();
	const parsedInfo = parseJson<StreamDeckConnectionInfo>(actionInfo ?? {});
	context = parsedInfo?.context ?? uuid;
	setCachedSettings(parsedInfo?.payload?.settings ?? {});
	emitSettings(cachedSettings);
	debugLog("Initial settings received from Stream Deck", cachedSettings);

	webSocket = new WebSocket(`ws://127.0.0.1:${port}`);
	webSocket.onopen = () => {
		sendMessage({ event: registerEvent, uuid });
		debugLog("WebSocket connected.");
	};
	webSocket.onmessage = (event) => {
		const message = parseJson<Record<string, unknown>>(event.data as string);
		if (message?.event === "didReceiveSettings" && typeof message.payload === "object") {
			const payload = message.payload as { settings?: Record<string, unknown> };
			setCachedSettings(payload.settings ?? {});
			emitSettings(cachedSettings);
			debugLog("Settings updated from Stream Deck", cachedSettings);
		}
	};
}

declare global {
	interface Window {
		connectElgatoStreamDeck?: typeof connectElgatoStreamDeck;
	}
}

if (typeof window !== "undefined") {
	window.connectElgatoStreamDeck = connectElgatoStreamDeck;
}

const streamDeck: StreamDeckApi<Record<string, unknown>> = {
	settings: {
		async getSettings() {
			if (context) {
				sendMessage({ event: "getSettings", context });
			}
			debugLog("Requested settings from Stream Deck.");
			return settingsReady;
		},
		setSettings(settings: Record<string, unknown>) {
			if (!context) return;
			const nextSettings = { ...cachedSettings, ...settings };
			setCachedSettings(nextSettings);
			sendMessage({ event: "setSettings", context, payload: nextSettings });
			debugLog("Sent settings to Stream Deck", nextSettings);
		},
	},
	onDidReceiveSettings(handler) {
		settingsListeners.add(handler);
	},
};

export default streamDeck;
