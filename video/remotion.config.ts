import { Config } from "@remotion/cli/config";
import fs from "node:fs";

// Remotion normally downloads its own chrome-headless-shell. If that is unavailable
// (offline), set SCENAR_SYSTEM_CHROME=1 to fall back to the installed Google Chrome.
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (process.env.SCENAR_SYSTEM_CHROME && fs.existsSync(CHROME)) Config.setBrowserExecutable(CHROME);

// JPEG frames keep Studio and draft renders fast; stills/poster default to PNG.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
