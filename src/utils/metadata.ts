import { log, logSuccess } from './debug';

/**
 * Upload metadata to pump.fun API
 */
export async function uploadMetadata(
  name: string,
  symbol: string,
  description: string,
  imageFile: File
): Promise<{ metadataUri: string; imageUri: string }> {
  try {
    log('📤 Uploading metadata to pump.fun API...');

    // Create form data
    const formData = new FormData();
    formData.append('name', name);
    formData.append('symbol', symbol);
    formData.append('description', description);

    // Add image if provided
    if (imageFile) {
      log(`📷 Adding image: ${imageFile.name} (${imageFile.size} bytes)`);
      formData.append('image', imageFile);
    }

    log('🌐 Sending request to pump.fun API...');

    // Send request to pump.fun API
    const response = await fetch('https://api.pump.fun/metadata', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = (await response.json()) as { metadataUri: string; imageUri?: string };

    logSuccess('Metadata uploaded successfully!');
    log(`📋 Metadata URI: ${result.metadataUri}`);

    if (result.imageUri) {
      log(`🖼️  Image URI: ${result.imageUri}`);
    }

    return {
      metadataUri: result.metadataUri,
      imageUri: result.imageUri || '',
    };
  } catch (error) {
    throw new Error(`Failed to upload metadata: ${error}`);
  }
}
