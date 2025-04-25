import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import ecuService from "../../services/ecuService";
import Loading from "../common/Loading";

function CompatibleECUList({ showAlert }) {
  const { carTypeName } = useParams();

  const [compatibleECUs, setCompatibleECUs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCompatibleECUs = async () => {
      try {
        setLoading(true);
        const data = await ecuService.getCompatibleECUs(carTypeName);
        setCompatibleECUs(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching compatible ECUs:", err);
        setError("Failed to fetch compatible ECUs. Please try again later.");
        showAlert("error", "Failed to fetch compatible ECUs");
      } finally {
        setLoading(false);
      }
    };

    if (carTypeName) {
      fetchCompatibleECUs();
    } else {
      setError("No car type specified");
      setLoading(false);
    }
  }, [carTypeName, showAlert]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filter ECUs based on search term
  const filteredECUs = compatibleECUs.filter(
    (ecu) =>
      ecu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ecu.model_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ecu.car_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Loading message={`Loading compatible ECUs for ${carTypeName}...`} />
    );
  }

  return (
    <div className="compatible-ecu-list">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Compatible ECUs for {carTypeName}</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <Link
            to={`/car-types/${carTypeName}`}
            className="btn btn-sm btn-outline-secondary me-2"
          >
            <i className="bi bi-info-circle me-1"></i> Car Type Details
          </Link>
          <Link
            to={`/ecus/${carTypeName}`}
            className="btn btn-sm btn-outline-info"
          >
            <i className="bi bi-cpu me-1"></i> View Car ECUs
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search ECUs by name, model number, or car type..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {filteredECUs.length === 0 ? (
        <div className="alert alert-info" role="alert">
          {searchTerm
            ? "No ECUs match your search criteria."
            : `No ECUs compatible with ${carTypeName} were found.`}
        </div>
      ) : (
        <>
          <div className="alert alert-info" role="alert">
            <i className="bi bi-info-circle me-2"></i>
            Found {filteredECUs.length} ECUs compatible with {carTypeName}
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Model Number</th>
                  <th>Original Car Type</th>
                  <th>Compatible Versions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredECUs.map((ecu, index) => (
                  <tr key={index}>
                    <td>{ecu.name}</td>
                    <td>{ecu.model_number}</td>
                    <td>
                      <Link to={`/car-types/${ecu.car_type}`}>
                        {ecu.car_type}
                      </Link>
                    </td>
                    <td>
                      {ecu.compatible_versions
                        ? ecu.compatible_versions.length
                        : "Unknown"}
                    </td>
                    <td>
                      <div className="btn-group">
                        <Link
                          to={`/ecus/${ecu.name}/${ecu.model_number}`}
                          className="btn btn-sm btn-outline-info"
                        >
                          <i className="bi bi-info-circle"></i> Details
                        </Link>
                        <Link
                          to={`/versions/ecu/${ecu.name}/${ecu.model_number}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          <i className="bi bi-hdd"></i> Versions
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-4">
        <Link
          to={`/versions/compatible/${carTypeName}`}
          className="btn btn-outline-primary me-2"
        >
          <i className="bi bi-hdd me-1"></i> View Compatible Firmware Versions
        </Link>
        <Link to="/car-types" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to Car Types
        </Link>
      </div>
    </div>
  );
}

export default CompatibleECUList;
