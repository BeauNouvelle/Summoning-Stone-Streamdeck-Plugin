import { action, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.beau-nouvelle.summoning-stone---ttrpg-sfx-soundboard-music--ambience.scene-selector" })
export class SceneSelector extends SingletonAction<SceneSelectorSettings> {
	// Scene selection logic will be added in a future iteration.
}

type SceneSelectorSettings = {
	campaignId?: string;
	campaignName?: string;
	sceneId?: string;
	sceneName?: string;
};
