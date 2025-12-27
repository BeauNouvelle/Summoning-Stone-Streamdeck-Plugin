import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.beaunouvelle.summoning-stone.stop-scene" })
export class StopScene extends SingletonAction {
	override async onKeyDown(_ev: KeyDownEvent): Promise<void> {
		await fetch("http://127.0.0.1:7123/scenes/stop", { method: "POST" });
	}
}
