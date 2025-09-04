"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMetadata = uploadMetadata;
const debug_1 = require("./debug");
/**
 * Upload metadata to pump.fun API
 */
async function uploadMetadata(name, symbol, description, imageFile) {
    try {
        (0, debug_1.log)('📤 Uploading metadata to pump.fun API...');
        // Create form data
        const formData = new FormData();
        formData.append('name', name);
        formData.append('symbol', symbol);
        formData.append('description', description);
        // Add image if provided
        if (imageFile) {
            (0, debug_1.log)(`📷 Adding image: ${imageFile.name} (${imageFile.size} bytes)`);
            formData.append('image', imageFile);
        }
        (0, debug_1.log)('🌐 Sending request to pump.fun API...');
        // Send request to pump.fun API
        const response = await fetch('https://api.pump.fun/metadata', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = (await response.json());
        (0, debug_1.logSuccess)('Metadata uploaded successfully!');
        (0, debug_1.log)(`📋 Metadata URI: ${result.metadataUri}`);
        if (result.imageUri) {
            (0, debug_1.log)(`🖼️  Image URI: ${result.imageUri}`);
        }
        return {
            metadataUri: result.metadataUri,
            imageUri: result.imageUri || '',
        };
    }
    catch (error) {
        throw new Error(`Failed to upload metadata: ${error}`);
    }
}
//# sourceMappingURL=metadata.js.map