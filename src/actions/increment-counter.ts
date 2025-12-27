import { action, SingletonAction } from "@elgato/streamdeck";

/**
 * An example action class.
 */
@action({ UUID: "com.beau-nouvelle.summoning-stone---ttrpg-sfx-soundboard-music--ambience.increment" })
export class IncrementCounter extends SingletonAction<CounterSettings> {
	// Action logic will be added in a future iteration.
}

/**
 * Settings for {@link IncrementCounter}.
 */
type CounterSettings = {
	sfxName?: string;
};
