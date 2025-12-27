import streamDeck from "@elgato/streamdeck";

import { PlaySfx } from "./actions/play-sfx";
import { SceneSelector } from "./actions/scene-selector";
import { StopScene } from "./actions/stop-scene";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

// Register the increment action.
streamDeck.actions.registerAction(new PlaySfx());
streamDeck.actions.registerAction(new SceneSelector());
streamDeck.actions.registerAction(new StopScene());

// Finally, connect to the Stream Deck.
streamDeck.connect();
