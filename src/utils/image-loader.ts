import { log } from './debug';

/**
 * Load image from file path and convert to File object
 */
export async function loadImageFromPath(imagePath: string): Promise<File> {
  try {
    log(`📁 Reading image from: ${imagePath}`);

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

    log(`✅ Image loaded: ${imageFile.type}, ${imageFile.size} bytes`);

    // Debug information
    log(`🔍 File instanceof check: ${imageFile instanceof File}`);
    log(`🔍 File constructor: ${imageFile.constructor.name}`);
    log(`🔍 File name: ${imageFile.name}`);

    return imageFile;
  } catch (error) {
    log('📝 Proceeding without image...');
    throw new Error(`Failed to load image: ${error}`);
  }
}
