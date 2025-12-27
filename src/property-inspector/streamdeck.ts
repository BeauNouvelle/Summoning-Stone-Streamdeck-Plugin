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

const logPrefix = "[Summoning Stone PI]";
function debugLog(message: string, data?: unknown) {
	if (data === undefined) {
		console.log(`${logPrefix} ${message}`);
	} else {
		console.log(`${logPrefix} ${message}`, data);
	}

	if (typeof document !== "undefined") {
		const debugEl = document.getElementById("debug-log");
		if (debugEl) {
			const time = new Date().toLocaleTimeString();
			debugEl.textContent = `[${time}] ${message}${data !== undefined ? ": " + JSON.stringify(data) : ""}\n${debugEl.textContent ?? ""}`;
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
	debugLog("Emitting settings to listeners", settings);
	const payload = { settings };
	for (const listener of settingsListeners) {
		listener({ payload });
	}
}

function sendMessage(message: Record<string, unknown>) {
	if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
		debugLog("Cannot send message - WebSocket not ready", message);
		return;
	}
	debugLog("Sending message", message);
	webSocket.send(JSON.stringify(message));
}

function connectElgatoStreamDeck(
	port: string,
	uuid: string,
	registerEvent: string,
	_info: unknown,
	actionInfo?: StreamDeckConnectionInfo | string,
) {
	debugLog("connectElgatoStreamDeck called", { port, uuid, registerEvent });
	
	const parsedInfo = parseJson<StreamDeckConnectionInfo>(actionInfo ?? {});
	context = parsedInfo?.context ?? uuid;
	cachedSettings = parsedInfo?.payload?.settings ?? {};
	
	debugLog("Initial settings from actionInfo", cachedSettings);
	debugLog("Context", context);

	webSocket = new WebSocket(`ws://127.0.0.1:${port}`);
	
	webSocket.onopen = () => {
		debugLog("WebSocket opened");
		sendMessage({ event: registerEvent, uuid });
		
		// Request settings explicitly
		if (context) {
			sendMessage({ event: "getSettings", context });
		}
	};
	
	webSocket.onmessage = (event) => {
		const message = parseJson<Record<string, unknown>>(event.data as string);
		debugLog("Received message", message);
		
		if (message?.event === "didReceiveSettings" && typeof message.payload === "object") {
			const payload = message.payload as { settings?: Record<string, unknown> };
			cachedSettings = payload.settings ?? {};
			debugLog("Settings updated from didReceiveSettings", cachedSettings);
			emitSettings(cachedSettings);
		}
	};
	
	webSocket.onerror = (error) => {
		debugLog("WebSocket error", error);
	};
	
	webSocket.onclose = () => {
		debugLog("WebSocket closed");
	};
	
	// Emit initial settings after a small delay to ensure listeners are set up
	setTimeout(() => {
		debugLog("Emitting initial settings");
		emitSettings(cachedSettings);
	}, 100);
}

declare global {
	interface Window {
		connectElgatoStreamDeck?: typeof connectElgatoStreamDeck;
	}
}

// Define the function globally BEFORE any other code runs
if (typeof window !== "undefined") {
	debugLog("Registering connectElgatoStreamDeck globally");
	window.connectElgatoStreamDeck = connectElgatoStreamDeck;
}

const streamDeck: StreamDeckApi<Record<string, unknown>> = {
	settings: {
		async getSettings() {
			debugLog("getSettings called");
			if (context && webSocket && webSocket.readyState === WebSocket.OPEN) {
				sendMessage({ event: "getSettings", context });
			}
			return cachedSettings;
		},
		setSettings(settings: Record<string, unknown>) {
			debugLog("setSettings called", settings);
			if (!context) {
				debugLog("Cannot set settings - no context");
				return;
			}
			
			// Merge with existing settings
			cachedSettings = { ...cachedSettings, ...settings };
			debugLog("Merged settings", cachedSettings);
			
			sendMessage({ event: "setSettings", context, payload: cachedSettings });
		},
	},
	onDidReceiveSettings(handler) {
		debugLog("Adding settings listener");
		settingsListeners.add(handler);
	},
};

export default streamDeck;