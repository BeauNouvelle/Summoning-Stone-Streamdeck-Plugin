import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.beaunouvelle.summoning-stone.scene-selector" })
export class SceneSelector extends SingletonAction<SceneSelectorSettings> {
	override async onKeyDown(ev: KeyDownEvent<SceneSelectorSettings>): Promise<void> {
		const { campaignId, sceneId } = ev.payload.settings;
		if (!campaignId || !sceneId) {
			return;
		}

		const encodedCampaignId = encodeURIComponent(campaignId);
		const encodedSceneId = encodeURIComponent(sceneId);
		await fetch(
			`http://127.0.0.1:7123/campaigns/${encodedCampaignId}/scenes/${encodedSceneId}/start`,
			{ method: "POST" }
		);
	}
}

type SceneSelectorSettings = {
	campaignId?: string;
	campaignName?: string;
	sceneId?: string;
	sceneName?: string;
};
