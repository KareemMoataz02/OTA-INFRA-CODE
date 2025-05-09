import api from "./api";
import API_CONFIG from "../config";

const baseEndpoint = API_CONFIG.endpoints.versions;

const versionService = {
  /**
   * Get all versions for an ECU
   * @param {string} ecuName - ECU name
   * @param {string} ecuModel - ECU model number
   * @returns {Promise<Array>} List of versions
   */
  async getVersionsForECU(ecuName, ecuModel) {
    return api.get(`${baseEndpoint}/ecu/${ecuName}/${ecuModel}`);
  },

  /**
   * Get version details
   * @param {string} ecuName - ECU name
   * @param {string} ecuModel - ECU model number
   * @param {string} versionNumber - Version number
   * @returns {Promise<Object>} Version details
   */
  async getVersionDetails(ecuName, ecuModel, versionNumber) {
    return api.get(
      `${baseEndpoint}/ecu/${ecuName}/${ecuModel}/${versionNumber}`
    );
  },

  /**
   * Download a hex file
   * @param {string} ecuName - ECU name
   * @param {string} ecuModel - ECU model number
   * @param {string} versionNumber - Version number
   * @returns {Promise<Blob>} Hex file blob
   */
  async downloadHexFile(ecuName, ecuModel, versionNumber) {
    return api.downloadFile(
      `${baseEndpoint}/download/${ecuName}/${ecuModel}/${versionNumber}`
    );
  },

  /**
   * Stream a hex file in chunks
   * @param {string} ecuName - ECU name
   * @param {string} ecuModel - ECU model number
   * @param {string} versionNumber - Version number
   * @param {number} chunkSize - Size of each chunk
   * @param {number} offset - Offset to start streaming from
   * @returns {Promise<Blob>} Chunk blob
   */
  async streamHexFile(
    ecuName,
    ecuModel,
    versionNumber,
    chunkSize = 1024,
    offset = 0
  ) {
    return api.downloadFile(
      `${baseEndpoint}/stream/${ecuName}/${ecuModel}/${versionNumber}?chunk_size=${chunkSize}&offset=${offset}`
    );
  },

  /**
   * Get compatible versions for a car type
   * @param {string} carTypeName - Car type name
   * @returns {Promise<Array>} List of compatible versions
   */
  async getCompatibleVersions(carTypeName) {
    return api.get(`${baseEndpoint}/compatible/${carTypeName}`);
  },

  /**
   * Upload a firmware file to Azure Blob Storage and save its details
   * @param {Object} versionData - Data for the new version
   * @param {string} versionData.ecuName - ECU name
   * @param {string} versionData.ecuModel - ECU model number
   * @param {string} versionData.versionNumber - Version number
   * @param {Array<string>} versionData.compatibleCarTypes - List of compatible car types
   * @param {File} versionData.hexFile - The actual hex/srec file to upload
   * @returns {Promise<Object>} - Result of the upload operation
   */
  async uploadFirmware(versionData) {
    // Create a FormData object to send the file
    const formData = new FormData();

    // Append file to the form data
    formData.append("file", versionData.hexFile);

    // Append other version metadata
    formData.append("ecuName", versionData.ecuName);
    formData.append("ecuModel", versionData.ecuModel);
    formData.append("versionNumber", versionData.versionNumber);
    formData.append(
      "compatibleCarTypes",
      JSON.stringify(versionData.compatibleCarTypes)
    );

    // Custom fetch for multipart/form-data
    const response = await fetch(
      `${API_CONFIG.baseURL}${baseEndpoint}/upload-to-azure`,
      {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  },
};

export default versionService;
