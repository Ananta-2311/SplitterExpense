import { toPng } from 'html-to-image';

/**
 * Converts a Recharts chart container to a base64 image
 * @param chartId - The ID of the chart container element
 * @returns Promise<string> - Base64 encoded image data URL
 */
export const chartToImage = async (chartId: string): Promise<string> => {
  const element = document.getElementById(chartId);
  if (!element) {
    throw new Error(`Chart element with id "${chartId}" not found`);
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    return dataUrl;
  } catch (error) {
    console.error('Error converting chart to image:', error);
    throw error;
  }
};

/**
 * Converts multiple charts to images
 * @param chartIds - Array of chart IDs to convert
 * @returns Promise<Array<{type: string; image: string}>>
 */
export const chartsToImage = async (
  chartIds: Array<{ id: string; type: string }>
): Promise<Array<{ type: string; image: string }>> => {
  const images = await Promise.all(
    chartIds.map(async ({ id, type }) => {
      const image = await chartToImage(id);
      return { type, image };
    })
  );
  return images;
};
