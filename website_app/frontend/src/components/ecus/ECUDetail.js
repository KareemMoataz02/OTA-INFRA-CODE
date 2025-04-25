import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ecuService from "../../services/ecuService";
import Loading from "../common/Loading";

function ECUDetail({ showAlert }) {
  const { name, model } = useParams();

  const [ecu, setEcu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchECU = async () => {
      try {
        setLoading(true);
        const data = await ecuService.getECUDetails(name, model);
        setEcu(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching ECU details:", err);
        setError("Failed to fetch ECU details. Please try again later.");
        showAlert("error", "Failed to fetch ECU details");
      } finally {
        setLoading(false);
      }
    };

    fetchECU();
  }, [name, model, showAlert]);

  if (loading) {
    return (
      <Loading message={`Loading ECU details for ${name} (${model})...`} />
    );
  }

  if (error || !ecu) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || `ECU ${name} (${model}) not found`}
      </div>
    );
  }

  return (
    <div className="ecu-detail">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">ECU: {ecu.name}</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <Link
            to={`/versions/ecu/${ecu.name}/${ecu.model_number}`}
            className="btn btn-sm btn-outline-primary"
          >
            <i className="bi bi-hdd me-1"></i> View Firmware Versions
          </Link>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Basic Information</h5>
            </div>
            <div className="card-body">
              <table className="table">
                <tbody>
                  <tr>
                    <th style={{ width: "30%" }}>Name</th>
                    <td>{ecu.name}</td>
                  </tr>
                  <tr>
                    <th>Model Number</th>
                    <td>{ecu.model_number}</td>
                  </tr>
                  <tr>
                    <th>Versions Count</th>
                    <td>{ecu.versions ? ecu.versions.length : 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link
                  to={`/versions/ecu/${ecu.name}/${ecu.model_number}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-hdd me-1"></i> Manage Firmware Versions
                </Link>
                <Link to="/versions/upload" className="btn btn-outline-success">
                  <i className="bi bi-upload me-1"></i> Upload New Firmware
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Firmware Versions</h5>
        </div>
        <div className="card-body">
          {ecu.versions && ecu.versions.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Version Number</th>
                    <th>Hex File Path</th>
                    <th>Compatible Car Types</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ecu.versions.map((version, index) => (
                    <tr key={index}>
                      <td>{version.version_number}</td>
                      <td>
                        <code>{version.hex_file_path}</code>
                      </td>
                      <td>
                        {version.compatible_car_types.map(
                          (carType, ctIndex) => (
                            <span key={ctIndex} className="badge bg-info me-1">
                              {carType}
                            </span>
                          )
                        )}
                      </td>
                      <td>
                        <div className="btn-group">
                          <Link
                            to={`/versions/ecu/${ecu.name}/${ecu.model_number}/${version.version_number}`}
                            className="btn btn-sm btn-outline-info"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link
                            to={`/versions/download/${ecu.name}/${ecu.model_number}/${version.version_number}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-download"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info" role="alert">
              No firmware versions available for this ECU.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Link
          to={`/ecus`}
          onClick={(e) => {
            e.preventDefault();
            window.history.back();
          }}
          className="btn btn-outline-secondary"
        >
          <i className="bi bi-arrow-left me-1"></i> Back
        </Link>
      </div>
    </div>
  );
}

export default ECUDetail;
