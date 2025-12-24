import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

import { startScene } from "../api";

type SceneSettings = {
	campaignId?: string;
	campaignName?: string;
	sceneId?: string;
	sceneName?: string;
};

@action({ UUID: "com.beau-nouvelle.summoning-stone---ttrpg-sfx-soundboard-music--ambience.scene.start" })
export class StartScene extends SingletonAction<SceneSettings> {
	override async onWillAppear(ev: WillAppearEvent<SceneSettings>): Promise<void> {
		const { sceneName } = ev.payload.settings;
		await ev.action.setTitle(sceneName ?? "Start Scene");
	}

	override async onKeyDown(ev: KeyDownEvent<SceneSettings>): Promise<void> {
		const { campaignId, sceneId } = ev.payload.settings;
		if (!campaignId || !sceneId) {
			await ev.action.showAlert();
			return;
		}

		try {
			await startScene(campaignId, sceneId);
		} catch (error) {
			streamDeck.logger.error(`Failed to start scene ${sceneId}: ${String(error)}`);
			await ev.action.showAlert();
		}
	}
}
