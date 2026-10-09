/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import fs from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);

// Cloud container: Remotion can't download its own Chrome there, so use the
// preinstalled headless shell when it exists. On a normal machine (Windows/Mac)
// this path is absent and Remotion uses its own browser as usual.
const CONTAINER_HEADLESS_SHELL =
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (fs.existsSync(CONTAINER_HEADLESS_SHELL)) {
  Config.setBrowserExecutable(CONTAINER_HEADLESS_SHELL);
}
