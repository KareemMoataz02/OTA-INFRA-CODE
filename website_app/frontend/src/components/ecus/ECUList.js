import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import ecuService from "../../services/ecuService";
import carTypeService from "../../services/carTypeService";
import Loading from "../common/Loading";

function ECUList({ showAlert }) {
  const { carTypeName } = useParams();
  const navigate = useNavigate();

  const [ecus, setEcus] = useState([]);
  const [carType, setCarType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch ECUs for the specified car type
        const [ecusData, carTypeData] = await Promise.all([
          ecuService.getECUsForCarType(carTypeName),
          carTypeService.getCarTypeByName(carTypeName),
        ]);

        setEcus(ecusData);
        setCarType(carTypeData);
        setError(null);
      } catch (err) {
        console.error("Error fetching ECUs:", err);
        setError("Failed to fetch ECUs. Please try again later.");
        showAlert("error", "Failed to fetch ECUs");
      } finally {
        setLoading(false);
      }
    };

    if (carTypeName) {
      fetchData();
    } else {
      setError("No car type specified");
      setLoading(false);
    }
  }, [carTypeName, showAlert]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filter ECUs based on search term
  const filteredECUs = ecus.filter(
    (ecu) =>
      ecu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ecu.model_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Loading message={`Loading ECUs for ${carTypeName}...`} />;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="ecu-list">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">ECUs for {carTypeName}</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <Link
            to={`/car-types/${carTypeName}`}
            className="btn btn-sm btn-outline-secondary me-2"
          >
            <i className="bi bi-info-circle me-1"></i> Car Type Details
          </Link>
          <Link
            to={`/ecus/compatible/${carTypeName}`}
            className="btn btn-sm btn-outline-info"
          >
            <i className="bi bi-check-circle me-1"></i> View Compatible ECUs
          </Link>
        </div>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search ECUs by name or model number..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {filteredECUs.length === 0 ? (
        <div className="alert alert-info" role="alert">
          {searchTerm
            ? "No ECUs match your search criteria."
            : "No ECUs available for this car type."}
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {filteredECUs.map((ecu, index) => (
            <div className="col" key={index}>
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{ecu.name}</h5>
                  <span className="badge bg-primary">{ecu.model_number}</span>
                </div>
                <div className="card-body">
                  <p className="card-text">
                    <strong>Versions Available:</strong> {ecu.versions_count}
                  </p>

                  <div className="d-grid gap-2">
                    <Link
                      to={`/versions/ecu/${ecu.name}/${ecu.model_number}`}
                      className="btn btn-outline-primary"
                    >
                      <i className="bi bi-hdd me-1"></i> View Firmware Versions
                    </Link>
                    <Link
                      to={`/ecus/${ecu.name}/${ecu.model_number}`}
                      className="btn btn-outline-info"
                    >
                      <i className="bi bi-info-circle me-1"></i> ECU Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Link to="/car-types" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to Car Types
        </Link>
      </div>
    </div>
  );
}

export default ECUList;
