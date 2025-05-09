import api from "./api";
import API_CONFIG from "../config";

const baseEndpoint = API_CONFIG.endpoints.ecus;

const ecuService = {
  /**
   * Get all ECUs for a car type
   * @param {string} carTypeName - Car type name
   * @returns {Promise<Array>} List of ECUs
   */
  async getECUsForCarType(carTypeName) {
    return api.get(`${baseEndpoint}/car-type/${carTypeName}`);
  },

  /**
   * Get ECU details
   * @param {string} ecuName - ECU name
   * @param {string} ecuModel - ECU model number
   * @returns {Promise<Object>} ECU details
   */
  async getECUDetails(ecuName, ecuModel) {
    return api.get(`${baseEndpoint}/${ecuName}/${ecuModel}`);
  },

  /**
   * Get compatible ECUs for a car type
   * @param {string} carTypeName - Car type name
   * @returns {Promise<Array>} List of compatible ECUs
   */
  async getCompatibleECUs(carTypeName) {
    return api.get(`${baseEndpoint}/compatible/${carTypeName}`);
  },

  /**
   * Fetch all ECUs from the server
   * @returns {Promise<Array>} Promise that resolves to an array of ECUs
   */
  getAllEcus: async () => {
    try {
      const response = await api.get(`${baseEndpoint}`);

      // Make sure we're returning the data consistently
      if (!response.data && !Array.isArray(response)) {
        console.warn("API returned unexpected data structure:", response);
        return []; // Return empty array instead of throwing
      }

      return response || [];
    } catch (error) {
      console.error("Error in ecuService.getAllEcus:", error);

      // Instead of re-throwing, return an empty array with a logged error
      console.error("Returning empty array to prevent infinite retries");
      return [];
    }
  },
};

export default ecuService;
