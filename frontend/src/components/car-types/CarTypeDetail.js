import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import carTypeService from "../../services/carTypeService";
import Loading from "../common/Loading";

function CarTypeDetail({ showAlert }) {
  const { name } = useParams();
  const navigate = useNavigate();

  const [carType, setCarType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const fetchCarType = async () => {
      try {
        setLoading(true);
        const data = await carTypeService.getCarTypeByName(name);
        setCarType(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching car type:", err);
        setError("Failed to fetch car type data. Please try again later.");
        showAlert("error", "Failed to fetch car type data");
      } finally {
        setLoading(false);
      }
    };

    fetchCarType();
  }, [name, showAlert]);

  const handleDelete = async () => {
    if (confirmDelete) {
      try {
        await carTypeService.deleteCarType(name);
        showAlert("success", `Car type ${name} deleted successfully`);
        navigate("/car-types");
      } catch (err) {
        console.error("Error deleting car type:", err);
        showAlert("error", `Failed to delete car type ${name}`);
      }
    } else {
      setConfirmDelete(true);
    }
  };

  if (loading) {
    return <Loading message={`Loading car type data for ${name}...`} />;
  }

  if (error || !carType) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || `Car type ${name} not found`}
      </div>
    );
  }

  return (
    <div className="car-type-detail">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Car Type: {carType.name}</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group me-2">
            <Link
              to={`/car-types/edit/${carType.name}`}
              className="btn btn-sm btn-outline-primary"
            >
              <i className="bi bi-pencil me-1"></i> Edit
            </Link>
            <Link
              to={`/ecus/${carType.name}`}
              className="btn btn-sm btn-outline-secondary"
            >
              <i className="bi bi-cpu me-1"></i> View ECUs
            </Link>
            <button
              className={`btn btn-sm ${
                confirmDelete ? "btn-danger" : "btn-outline-danger"
              }`}
              onClick={handleDelete}
            >
              {confirmDelete ? (
                "Confirm Delete"
              ) : (
                <>
                  <i className="bi bi-trash me-1"></i> Delete
                </>
              )}
            </button>
          </div>
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
                    <td>{carType.name}</td>
                  </tr>
                  <tr>
                    <th>Model Number</th>
                    <td>{carType.model_number}</td>
                  </tr>
                  <tr>
                    <th>Manufactured Count</th>
                    <td>{carType.manufactured_count}</td>
                  </tr>
                  <tr>
                    <th>ECUs Count</th>
                    <td>{carType.ecus.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Car IDs</h5>
            </div>
            <div className="card-body">
              {carType.car_ids && carType.car_ids.length > 0 ? (
                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                  <ul className="list-group">
                    {carType.car_ids.map((carId, index) => (
                      <li
                        key={index}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        {carId}
                        <span className="badge bg-primary rounded-pill">
                          ID
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted">No car IDs added.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">ECUs and Firmware Versions</h5>
        </div>
        <div className="card-body">
          {carType.ecus && carType.ecus.length > 0 ? (
            <div className="accordion" id="ecuAccordion">
              {carType.ecus.map((ecu, ecuIndex) => (
                <div className="accordion-item" key={ecuIndex}>
                  <h2 className="accordion-header" id={`heading-${ecuIndex}`}>
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#collapse-${ecuIndex}`}
                      aria-expanded="false"
                      aria-controls={`collapse-${ecuIndex}`}
                    >
                      <strong>{ecu.name}</strong> - Model: {ecu.model_number} -
                      Versions: {ecu.versions.length}
                    </button>
                  </h2>
                  <div
                    id={`collapse-${ecuIndex}`}
                    className="accordion-collapse collapse"
                    aria-labelledby={`heading-${ecuIndex}`}
                    data-bs-parent="#ecuAccordion"
                  >
                    <div className="accordion-body">
                      {ecu.versions && ecu.versions.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-sm table-hover">
                            <thead>
                              <tr>
                                <th>Version Number</th>
                                <th>Hex File Path</th>
                                <th>Compatible Car Types</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ecu.versions.map((version, versionIndex) => (
                                <tr key={versionIndex}>
                                  <td>{version.version_number}</td>
                                  <td>
                                    <code>{version.hex_file_path}</code>
                                  </td>
                                  <td>
                                    {version.compatible_car_types.map(
                                      (ct, ctIndex) => (
                                        <span
                                          key={ctIndex}
                                          className="badge bg-info me-1"
                                        >
                                          {ct}
                                        </span>
                                      )
                                    )}
                                  </td>
                                  <td>
                                    <Link
                                      to={`/versions/ecu/${ecu.name}/${ecu.model_number}/${version.version_number}`}
                                      className="btn btn-sm btn-outline-primary"
                                    >
                                      <i className="bi bi-eye"></i> View
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted">
                          No firmware versions available for this ECU.
                        </p>
                      )}

                      <div className="mt-3">
                        <Link
                          to={`/versions/ecu/${ecu.name}/${ecu.model_number}`}
                          className="btn btn-outline-secondary"
                        >
                          <i className="bi bi-list me-1"></i> View All Versions
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No ECUs added to this car type.</p>
          )}

          <div className="mt-3 text-end">
            <Link
              to={`/ecus/${carType.name}`}
              className="btn btn-outline-primary"
            >
              <i className="bi bi-cpu me-1"></i> Manage ECUs
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-4 d-flex justify-content-between">
        <Link to="/car-types" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i> Back to Car Types
        </Link>
      </div>
    </div>
  );
}

export default CarTypeDetail;
