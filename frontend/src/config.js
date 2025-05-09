const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api/",
  endpoints: {
    carTypes: "car-types",
    ecus: "ecus",
    versions: "versions",
  },
};

export default API_CONFIG;
