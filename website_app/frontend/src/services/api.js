import API_CONFIG from "../config";

// Generic API service with methods for common HTTP requests
const api = {
  /**
   * Perform a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - URL parameters
   * @returns {Promise<Object>} - Response data
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${API_CONFIG.baseURL}${endpoint}`);

    // Add query parameters
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },

  /**
   * Perform a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} - Response data
   */
  async post(endpoint, data = {}) {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },

  /**
   * Perform a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} - Response data
   */
  async put(endpoint, data = {}) {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },

  /**
   * Perform a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @returns {Promise<Object>} - Response data
   */
  async patch(endpoint, data = {}) {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },

  /**
   * Perform a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} - Response data
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },

  /**
   * Download a file
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Blob>} - File blob
   */
  async downloadFile(endpoint) {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error("File download failed:", error);
      throw error;
    }
  },
};

export default api;
