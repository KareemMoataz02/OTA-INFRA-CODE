import api from "./api";
import API_CONFIG from "../config";

const baseEndpoint = API_CONFIG.endpoints.requests;

const requestService = {
  /**
   * Create a new service request
   * @param {Object} serviceRequestData - Service request data
   * @returns {Promise<Object>} Result of operation
   */
  async createServiceRequest(serviceRequestData) {
    return api.post(`${baseEndpoint}/service`, serviceRequestData);
  },

  /**
   * Create a new download request
   * @param {Object} downloadRequestData - Download request data
   * @returns {Promise<Object>} Result of operation
   */
  async createDownloadRequest(downloadRequestData) {
    return api.post(`${baseEndpoint}/download`, downloadRequestData);
  },

  /**
   * Update download request status
   * @param {string} carId - Car ID
   * @param {Object} statusData - Status data
   * @returns {Promise<Object>} Result of operation
   */
  async updateDownloadStatus(carId, statusData) {
    return api.put(`${baseEndpoint}/download/${carId}/status`, statusData);
  },

  /**
   * Get all requests for a car
   * @param {string} carId - Car ID
   * @returns {Promise<Object>} Service and download requests
   */
  async getRequestsForCar(carId) {
    return api.get(`${baseEndpoint}/car/${carId}`);
  },

  /**
   * Get service requests by status
   * @param {string} status - Request status
   * @returns {Promise<Array>} List of service requests
   */
  async getServiceRequestsByStatus(status) {
    return api.get(`${baseEndpoint}/service/status/${status}`);
  },

  /**
   * Get download requests by status
   * @param {string} status - Request status
   * @returns {Promise<Array>} List of download requests
   */
  async getDownloadRequestsByStatus(status) {
    return api.get(`${baseEndpoint}/download/status/${status}`);
  },

  /**
   * Get active download requests
   * @returns {Promise<Array>} List of active download requests
   */
  async getActiveDownloads() {
    return api.get(`${baseEndpoint}/download/active`);
  },
};

export default requestService;
