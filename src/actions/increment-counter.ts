import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

/**
 * An example action class.
 */
@action({ UUID: "com.beau-nouvelle.summoning-stone---ttrpg-sfx-soundboard-music--ambience.increment" })
export class IncrementCounter extends SingletonAction<CounterSettings> {
	override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
		const sfxName = ev.payload.settings.sfxName;
		if (!sfxName) {
			return;
		}

		const encodedName = encodeURIComponent(sfxName);
		await fetch(`http://127.0.0.1:7123/sfx/${encodedName}/play`, { method: "POST" });
	}
}

/**
 * Settings for {@link IncrementCounter}.
 */
type CounterSettings = {
	sfxName?: string;
};
