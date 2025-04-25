import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import versionService from "../../services/versionService";
import Loading from "../common/Loading";

function VersionList({ showAlert, isCompatibleView = false }) {
  const { ecuName, ecuModel, carTypeName } = useParams();

  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        let data;

        if (isCompatibleView) {
          // Get versions compatible with a car type
          data = await versionService.getCompatibleVersions(carTypeName);
        } else {
          // Get versions for a specific ECU
          data = await versionService.getVersionsForECU(ecuName, ecuModel);
        }

        setVersions(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching versions:", err);
        setError("Failed to fetch firmware versions. Please try again later.");
        showAlert("error", "Failed to fetch firmware versions");
      } finally {
        setLoading(false);
      }
    };

    if ((ecuName && ecuModel) || (isCompatibleView && carTypeName)) {
      fetchVersions();
    } else {
      setError("Missing required parameters");
      setLoading(false);
    }
  }, [ecuName, ecuModel, carTypeName, isCompatibleView, showAlert]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filter versions based on search term
  const filteredVersions = versions.filter((version) => {
    if (isCompatibleView) {
      return (
        version.version_number
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        version.hex_file_path
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        version.ecu_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        version.ecu_model?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return (
        version.version_number
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        version.hex_file_path
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        version.compatible_car_types?.some((ct) =>
          ct.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  });

  if (loading) {
    return (
      <Loading
        message={
          isCompatibleView
            ? `Loading compatible versions for ${carTypeName}...`
            : `Loading versions for ECU: ${ecuName} (${ecuModel})...`
        }
      />
    );
  }

  const getTitle = () => {
    if (isCompatibleView) {
      return `Compatible Firmware Versions for ${carTypeName}`;
    } else {
      return `Firmware Versions for ECU: ${ecuName} (${ecuModel})`;
    }
  };

  return (
    <div className="version-list">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">{getTitle()}</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          {!isCompatibleView && (
            <>
              <Link
                to={`/ecus/${ecuName}/${ecuModel}`}
                className="btn btn-sm btn-outline-secondary me-2"
              >
                <i className="bi bi-cpu me-1"></i> ECU Details
              </Link>
              <Link to="/versions/upload" className="btn btn-sm btn-primary">
                <i className="bi bi-upload me-1"></i> Upload New Version
              </Link>
            </>
          )}
          {isCompatibleView && (
            <Link
              to={`/ecus/compatible/${carTypeName}`}
              className="btn btn-sm btn-outline-secondary"
            >
              <i className="bi bi-cpu me-1"></i> Compatible ECUs
            </Link>
          )}
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
          placeholder={
            isCompatibleView
              ? "Search by version number, file path, ECU name, or model..."
              : "Search by version number, file path, or compatible car types..."
          }
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {filteredVersions.length === 0 ? (
        <div className="alert alert-info" role="alert">
          {searchTerm
            ? "No versions match your search criteria."
            : isCompatibleView
            ? `No firmware versions compatible with ${carTypeName} were found.`
            : `No firmware versions available for ECU: ${ecuName} (${ecuModel}).`}
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              {filteredVersions.length} Firmware Versions
            </h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead>
                  <tr>
                    {isCompatibleView && (
                      <>
                        <th>ECU Name</th>
                        <th>ECU Model</th>
                      </>
                    )}
                    <th>Version Number</th>
                    <th>Hex File Path</th>
                    {!isCompatibleView && <th>Compatible Car Types</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVersions.map((version, index) => (
                    <tr key={index}>
                      {isCompatibleView && (
                        <>
                          <td>{version.ecu_name}</td>
                          <td>{version.ecu_model}</td>
                        </>
                      )}
                      <td>{version.version_number}</td>
                      <td>
                        <code>{version.hex_file_path}</code>
                      </td>
                      {!isCompatibleView && (
                        <td>
                          {version.compatible_car_types?.map((ct, ctIndex) => (
                            <span key={ctIndex} className="badge bg-info me-1">
                              {ct}
                            </span>
                          ))}
                        </td>
                      )}
                      <td>
                        <div className="btn-group">
                          {isCompatibleView ? (
                            <Link
                              to={`/versions/ecu/${version.ecu_name}/${version.ecu_model}/${version.version_number}`}
                              className="btn btn-sm btn-outline-info"
                            >
                              <i className="bi bi-eye"></i> View
                            </Link>
                          ) : (
                            <Link
                              to={`/versions/ecu/${ecuName}/${ecuModel}/${version.version_number}`}
                              className="btn btn-sm btn-outline-info"
                            >
                              <i className="bi bi-eye"></i> View
                            </Link>
                          )}

                          {isCompatibleView ? (
                            <Link
                              to={`/versions/download/${version.ecu_name}/${version.ecu_model}/${version.version_number}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              <i className="bi bi-download"></i> Download
                            </Link>
                          ) : (
                            <Link
                              to={`/versions/download/${ecuName}/${ecuModel}/${version.version_number}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              <i className="bi bi-download"></i> Download
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {isCompatibleView ? (
          <Link
            to={`/car-types/${carTypeName}`}
            className="btn btn-outline-secondary"
          >
            <i className="bi bi-arrow-left me-1"></i> Back to Car Type
          </Link>
        ) : (
          <Link
            to="/ecus"
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
            className="btn btn-outline-secondary"
          >
            <i className="bi bi-arrow-left me-1"></i> Back
          </Link>
        )}
      </div>
    </div>
  );
}

export default VersionList;
