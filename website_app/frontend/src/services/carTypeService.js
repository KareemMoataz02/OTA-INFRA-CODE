import api from "./api";
import API_CONFIG from "../config";

const baseEndpoint = API_CONFIG.endpoints.carTypes;

const carTypeService = {
  /**
   * Get all car types
   * @returns {Promise<Array>} List of car types
   */
  async getAllCarTypes() {
    return api.get(baseEndpoint);
  },

  /**
   * Get a car type by name
   * @param {string} name - Car type name
   * @returns {Promise<Object>} Car type details
   */
  async getCarTypeByName(name) {
    return api.get(`${baseEndpoint}/${name}`);
  },

  /**
   * Get a car type by model number
   * @param {string} modelNumber - Car type model number
   * @returns {Promise<Object>} Car type details
   */
  async getCarTypeByModel(modelNumber) {
    return api.get(`${baseEndpoint}/model/${modelNumber}`);
  },

  /**
   * Create a new car type
   * @param {Object} carTypeData - Car type data
   * @returns {Promise<Object>} Result of operation
   */
  async createCarType(carTypeData) {
    return api.post(baseEndpoint, carTypeData);
  },

  /**
   * Update a car type
   * @param {string} name - Car type name
   * @param {Object} carTypeData - Car type data
   * @returns {Promise<Object>} Result of operation
   */
  async updateCarType(name, carTypeData) {
    return api.put(`${baseEndpoint}/${name}`, carTypeData);
  },

  /**
   * Partially update a car type
   * @param {string} name - Car type name
   * @param {Object} carTypeData - Partial car type data
   * @returns {Promise<Object>} Result of operation
   */
  async patchCarType(name, carTypeData) {
    return api.patch(`${baseEndpoint}/${name}`, carTypeData);
  },

  /**
   * Delete a car type
   * @param {string} name - Car type name
   * @returns {Promise<Object>} Result of operation
   */
  async deleteCarType(name) {
    return api.delete(`${baseEndpoint}/${name}`);
  },

  /**
   * Get car type statistics
   * @returns {Promise<Object>} Car type statistics
   */
  async getCarTypeStatistics() {
    return api.get(`${baseEndpoint}/statistics`);
  },
};

export default carTypeService;
