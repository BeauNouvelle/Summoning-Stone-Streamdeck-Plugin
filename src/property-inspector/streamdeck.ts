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
const settingsReady = new Promise<Record<string, unknown>>((resolve) => {
	resolveSettings = resolve;
});

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
	const parsedInfo = parseJson<StreamDeckConnectionInfo>(actionInfo ?? {});
	context = parsedInfo?.context ?? uuid;
	setCachedSettings(parsedInfo?.payload?.settings ?? {});

	webSocket = new WebSocket(`ws://127.0.0.1:${port}`);
	webSocket.onopen = () => {
		sendMessage({ event: registerEvent, uuid });
	};
	webSocket.onmessage = (event) => {
		const message = parseJson<Record<string, unknown>>(event.data as string);
		if (message?.event === "didReceiveSettings" && typeof message.payload === "object") {
			const payload = message.payload as { settings?: Record<string, unknown> };
			setCachedSettings(payload.settings ?? {});
			emitSettings(cachedSettings);
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
			return settingsReady;
		},
		setSettings(settings: Record<string, unknown>) {
			if (!context) return;
			const nextSettings = { ...cachedSettings, ...settings };
			setCachedSettings(nextSettings);
			sendMessage({ event: "setSettings", context, payload: nextSettings });
		},
	},
	onDidReceiveSettings(handler) {
		settingsListeners.add(handler);
	},
};

export default streamDeck;
