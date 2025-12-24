import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";

import { stopScene } from "../api";

@action({ UUID: "com.beau-nouvelle.summoning-stone---ttrpg-sfx-soundboard-music--ambience.scene.stop" })
export class StopScene extends SingletonAction<Record<string, never>> {
	override async onWillAppear(ev: WillAppearEvent<Record<string, never>>): Promise<void> {
		await ev.action.setTitle("Stop Scene");
	}

	override async onKeyDown(ev: KeyDownEvent<Record<string, never>>): Promise<void> {
		try {
			await stopScene();
		} catch (error) {
			streamDeck.logger.error(`Failed to stop scene: ${String(error)}`);
			await ev.action.showAlert();
		}
	}
}
