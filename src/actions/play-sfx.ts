import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

import { fetchSfxIcon, fetchSfxList, playSfx } from "../api";

type SfxSettings = {
	sfxName?: string;
	sfxTitle?: string;
};

@action({ UUID: "com.beau-nouvelle.summoning-stone---ttrpg-sfx-soundboard-music--ambience.sfx.play" })
export class PlaySfx extends SingletonAction<SfxSettings> {
	override async onWillAppear(ev: WillAppearEvent<SfxSettings>): Promise<void> {
		const { sfxName, sfxTitle } = ev.payload.settings;

		if (sfxName) {
			await this.setSfxTitle(ev, sfxName, sfxTitle);
			await this.setSfxImage(ev, sfxName);
		} else {
			await ev.action.setTitle("Pick SFX");
		}
	}

	override async onKeyDown(ev: KeyDownEvent<SfxSettings>): Promise<void> {
		const { sfxName } = ev.payload.settings;
		if (!sfxName) {
			await ev.action.showAlert();
			return;
		}

		try {
			await playSfx(sfxName);
		} catch (error) {
			streamDeck.logger.error(`Failed to play SFX ${sfxName}: ${String(error)}`);
			await ev.action.showAlert();
		}
	}

	private async setSfxTitle(ev: WillAppearEvent<SfxSettings>, sfxName: string, sfxTitle?: string): Promise<void> {
		if (sfxTitle) {
			await ev.action.setTitle(sfxTitle);
			return;
		}

		try {
			const sfxList = await fetchSfxList();
			const entry = sfxList.find((item) => item.name === sfxName);
			await ev.action.setTitle(entry?.localizedName ?? sfxName);
		} catch (error) {
			streamDeck.logger.warn(`Unable to resolve SFX title: ${String(error)}`);
			await ev.action.setTitle(sfxName);
		}
	}

	private async setSfxImage(ev: WillAppearEvent<SfxSettings>, sfxName: string): Promise<void> {
		try {
			const image = await fetchSfxIcon(sfxName);
			await ev.action.setImage(image);
		} catch (error) {
			streamDeck.logger.warn(`Unable to load SFX icon for ${sfxName}: ${String(error)}`);
		}
	}
}
