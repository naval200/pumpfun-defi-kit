"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadImageFromPath = loadImageFromPath;
const debug_1 = require("./debug");
/**
 * Load image from file path and convert to File object
 */
async function loadImageFromPath(imagePath) {
    try {
        (0, debug_1.log)(`📁 Reading image from: ${imagePath}`);
        // Read the file
        const response = await fetch(imagePath);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        // Create a File object from the blob
        const imageFile = new File([blob], imagePath.split('/').pop() || 'image.png', {
            type: blob.type || 'image/png',
        });
        (0, debug_1.log)(`✅ Image loaded: ${imageFile.type}, ${imageFile.size} bytes`);
        // Debug information
        (0, debug_1.log)(`🔍 File instanceof check: ${imageFile instanceof File}`);
        (0, debug_1.log)(`🔍 File constructor: ${imageFile.constructor.name}`);
        (0, debug_1.log)(`🔍 File name: ${imageFile.name}`);
        return imageFile;
    }
    catch (error) {
        (0, debug_1.log)('📝 Proceeding without image...');
        throw new Error(`Failed to load image: ${error}`);
    }
}
//# sourceMappingURL=image-loader.js.map