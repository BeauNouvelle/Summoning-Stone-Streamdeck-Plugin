import { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { KeyAction } from "@elgato/streamdeck";

@action({ UUID: "com.beau-nouvelle.summoning-stone---ttrpg-sfx-soundboard-music--ambience.increment" })
export class PlaySfx extends SingletonAction<PlaySfxSettings> {
	private currentIconName?: string;

	override async onWillAppear(ev: WillAppearEvent<PlaySfxSettings>): Promise<void> {
		await this.updateIcon(ev.action, ev.payload.settings.sfxName);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PlaySfxSettings>): Promise<void> {
		await this.updateIcon(ev.action, ev.payload.settings.sfxName);
	}

	override async onKeyDown(ev: KeyDownEvent<PlaySfxSettings>): Promise<void> {
		const { sfxName, volume, reverb } = ev.payload.settings;
		if (!sfxName) {
			return;
		}

		const encodedName = encodeURIComponent(sfxName);
		const params = new URLSearchParams();
		if (typeof volume === "number") {
			params.set("volume", volume.toString());
		}
		if (typeof reverb === "number") {
			params.set("reverb", reverb.toString());
		}
		const query = params.toString();
		const endpoint = query.length
			? `http://127.0.0.1:7123/sfx/${encodedName}/play?${query}`
			: `http://127.0.0.1:7123/sfx/${encodedName}/play`;
		await fetch(endpoint, { method: "POST" });
	}

	private async updateIcon(action: KeyAction<PlaySfxSettings>, sfxName?: string): Promise<void> {
		if (!sfxName) {
			if (this.currentIconName) {
				await action.setImage(undefined);
				this.currentIconName = undefined;
			}
			return;
		}

		if (sfxName === this.currentIconName) {
			return;
		}

		try {
			const encodedName = encodeURIComponent(sfxName);
			const response = await fetch(`http://127.0.0.1:7123/sfx/${encodedName}/icon`);
			if (!response.ok) {
				return;
			}

			const buffer = Buffer.from(await response.arrayBuffer());
			const base64 = buffer.toString("base64");
			await action.setImage(`data:image/png;base64,${base64}`);
			this.currentIconName = sfxName;
		} catch (error) {
			// Ignore icon update errors to avoid blocking action usage.
		}
	}
}

type PlaySfxSettings = {
	sfxName?: string;
	volume?: number;
	reverb?: number;
};
