import { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { DialAction, KeyAction } from "@elgato/streamdeck";

@action({ UUID: "com.beaunouvelle.summoning-stone.increment" })
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

		const normalizedVolume = typeof volume === "number" ? volume : 1;
		const normalizedReverb = typeof reverb === "number" ? reverb : 0;
		const encodedName = encodeURIComponent(sfxName);
		const params = new URLSearchParams();
		params.set("volume", normalizedVolume.toString());
		params.set("reverb", normalizedReverb.toString());
		const query = params.toString();
		const endpoint = query.length
			? `http://127.0.0.1:7123/sfx/${encodedName}/play?${query}`
			: `http://127.0.0.1:7123/sfx/${encodedName}/play`;
		await fetch(endpoint, { method: "POST" });
	}

	private async updateIcon(
		action: KeyAction<PlaySfxSettings> | DialAction<PlaySfxSettings>,
		sfxName?: string
	): Promise<void> {
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
