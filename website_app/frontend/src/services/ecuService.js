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
};

export default ecuService;
