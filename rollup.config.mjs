import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.beau-nouvelle.summoning-stone---ttrpg-sfx-soundboard-music--ambience.sdPlugin";

/**
 * @type {import('rollup').RollupOptions}
 */
const plugin = {
	input: "src/plugin.ts",
	output: {
		file: `${sdPlugin}/bin/plugin.js`,
		sourcemap: isWatching,
		sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
			return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
		}
	},
	plugins: [
		{
			name: "watch-externals",
			buildStart: function () {
				this.addWatchFile(`${sdPlugin}/manifest.json`);
			},
		},
		typescript({
			mapRoot: isWatching ? "./" : undefined
		}),
		nodeResolve({
			browser: false,
			exportConditions: ["node"],
			preferBuiltins: true
		}),
		commonjs(),
		!isWatching && terser(),
		{
			name: "emit-module-package-file",
			generateBundle() {
				this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
			}
		}
	]
};

/**
 * @type {import('rollup').RollupOptions}
 */
const propertyInspector = {
	input: "src/property-inspector/play-sfx.ts",
	output: {
		file: `${sdPlugin}/bin/play-sfx-pi.js`,
		sourcemap: isWatching,
		sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
			return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
		}
	},
	plugins: [
		typescript({
			mapRoot: isWatching ? "./" : undefined
		}),
		nodeResolve({
			browser: true, // Important: this is for browser environment
			exportConditions: ["browser", "default"]
		}),
		commonjs(),
		!isWatching && terser()
	]
};

/**
 * @type {import('rollup').RollupOptions}
 */
const startScenePI = {
	input: "src/property-inspector/start-scene.ts",
	output: {
		file: `${sdPlugin}/bin/start-scene-pi.js`,
		sourcemap: isWatching,
		sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
			return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
		}
	},
	plugins: [
		typescript({
			mapRoot: isWatching ? "./" : undefined
		}),
		nodeResolve({
			browser: true,
			exportConditions: ["browser", "default"]
		}),
		commonjs(),
		!isWatching && terser()
	]
};

export default [plugin, propertyInspector, startScenePI];