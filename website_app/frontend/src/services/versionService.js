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
};

export default versionService;
