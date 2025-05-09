import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import carTypeService from "../../services/carTypeService";
import ecuService from "../../services/ecuService";
import versionService from "../../services/versionService";
import Loading from "../common/Loading";

function VersionUpload({ showAlert }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [carTypes, setCarTypes] = useState([]);
  const [ecus, setEcus] = useState([]);
  const [selectedCarType, setSelectedCarType] = useState("");
  const [error, setError] = useState(null);

  // Add states for compatible car types
  const [compatibleCarTypes, setCompatibleCarTypes] = useState([]);
  const [loadingCompatibleCarTypes, setLoadingCompatibleCarTypes] =
    useState(false);

  const [formData, setFormData] = useState({
    ecuName: "",
    ecuModel: "",
    versionNumber: "",
    hexFile: null,
    hexFilePath: "",
    compatibleCarTypes: [],
  });

  // Fetch car types on component mount
  useEffect(() => {
    const fetchCarTypes = async () => {
      try {
        const data = await carTypeService.getAllCarTypes();
        setCarTypes(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching car types:", err);
        setError("Failed to fetch car types. Please try again later.");
        showAlert("error", "Failed to fetch car types");
      } finally {
        setLoading(false);
      }
    };

    fetchCarTypes();
  }, [showAlert]);

  // Fetch ECUs when a car type is selected
  useEffect(() => {
    const fetchECUs = async () => {
      if (!selectedCarType) {
        setEcus([]);
        return;
      }

      try {
        setLoading(true);
        const data = await ecuService.getECUsForCarType(selectedCarType);
        setEcus(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching ECUs:", err);
        setError("Failed to fetch ECUs for the selected car type.");
        showAlert("error", "Failed to fetch ECUs");
      } finally {
        setLoading(false);
      }
    };

    fetchECUs();
  }, [selectedCarType, showAlert]);

  // Fetch compatible car types when an ECU is selected
  const fetchCompatibleCarTypes = async (ecuName) => {
    if (!ecuName) {
      setCompatibleCarTypes([]);
      return;
    }

    try {
      setLoadingCompatibleCarTypes(true);
      const response = await carTypeService.getCarTypesByEcuName(ecuName);
      const data = response?.data || response;
      setCompatibleCarTypes(Array.isArray(data) ? data : []);

      // Make sure the selected car type is included in compatible car types
      if (
        selectedCarType &&
        !formData.compatibleCarTypes.includes(selectedCarType)
      ) {
        setFormData((prev) => ({
          ...prev,
          compatibleCarTypes: [...prev.compatibleCarTypes, selectedCarType],
        }));
      }

      console.log(
        `Fetched ${data.length} compatible car types for ECU ${ecuName}`
      );
    } catch (err) {
      console.error("Error fetching compatible car types:", err);
      showAlert("error", "Failed to fetch compatible car types");
      setCompatibleCarTypes([]);
    } finally {
      setLoadingCompatibleCarTypes(false);
    }
  };

  const handleCarTypeChange = (e) => {
    const carType = e.target.value;
    setSelectedCarType(carType);

    // Add the selected car type to compatible car types if not already there
    if (carType && !formData.compatibleCarTypes.includes(carType)) {
      setFormData({
        ...formData,
        compatibleCarTypes: [...formData.compatibleCarTypes, carType],
      });
    }
  };

  const handleECUChange = (e) => {
    const selectedIndex = e.target.selectedIndex;
    if (selectedIndex === 0) {
      // "Select ECU" option
      setFormData({
        ...formData,
        ecuName: "",
        ecuModel: "",
      });
      setCompatibleCarTypes([]);
      return;
    }

    const selectedECU = ecus[selectedIndex - 1]; // -1 because of the initial "Select ECU" option
    setFormData({
      ...formData,
      ecuName: selectedECU.name,
      ecuModel: selectedECU.model_number,
      // Reset compatible car types when ECU changes
      compatibleCarTypes: selectedCarType ? [selectedCarType] : [],
    });

    // Fetch compatible car types for this ECU
    fetchCompatibleCarTypes(selectedECU.name);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a mock path that would be used in the backend
      const hexFilePath = `hex_files/${file.name}`;

      setFormData({
        ...formData,
        hexFile: file,
        hexFilePath: hexFilePath,
      });
    }
  };

  const handleCompatibleCarTypeToggle = (carType) => {
    if (formData.compatibleCarTypes.includes(carType)) {
      // Don't allow removal of the selected car type
      if (carType === selectedCarType) {
        showAlert("warning", "The source car type must remain compatible");
        return;
      }

      // Remove the car type if it's already in the list
      setFormData({
        ...formData,
        compatibleCarTypes: formData.compatibleCarTypes.filter(
          (ct) => ct !== carType
        ),
      });
    } else {
      // Add the car type if it's not in the list
      setFormData({
        ...formData,
        compatibleCarTypes: [...formData.compatibleCarTypes, carType],
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.ecuName || !formData.ecuModel) {
      showAlert("warning", "Please select an ECU");
      return;
    }

    if (!formData.versionNumber) {
      showAlert("warning", "Please enter a version number");
      return;
    }

    if (!formData.hexFile) {
      showAlert("warning", "Please upload a hex file");
      return;
    }

    if (formData.compatibleCarTypes.length === 0) {
      showAlert("warning", "Please select at least one compatible car type");
      return;
    }

    setSubmitting(true);

    try {
      // Prepare the data for upload
      const versionData = {
        ecuName: formData.ecuName,
        ecuModel: formData.ecuModel,
        versionNumber: formData.versionNumber,
        compatibleCarTypes: formData.compatibleCarTypes,
        hexFile: formData.hexFile, // The actual File object
      };

      // Call the upload function
      const result = await versionService.uploadFirmware(versionData);

      showAlert(
        "success",
        "Firmware uploaded successfully to Azure Blob Storage"
      );

      // Navigate to the ECU's versions page
      navigate(`/versions/ecu/${formData.ecuName}/${formData.ecuModel}`);
    } catch (err) {
      console.error("Error uploading firmware:", err);
      showAlert("error", "Failed to upload firmware");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && carTypes.length === 0) {
    return <Loading message="Loading car types..." />;
  }

  return (
    <div className="version-upload">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Upload Firmware Version</h1>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="carType" className="form-label">
                Car Type
              </label>
              <select
                className="form-select"
                id="carType"
                value={selectedCarType}
                onChange={handleCarTypeChange}
                required
              >
                <option value="">Select Car Type</option>
                {carTypes.map((carType, index) => (
                  <option key={index} value={carType.name}>
                    {carType.name} ({carType.model_number})
                  </option>
                ))}
              </select>
              <small className="text-muted">
                Select the car type to view available ECUs
              </small>
            </div>

            <div className="mb-3">
              <label htmlFor="ecu" className="form-label">
                ECU
              </label>
              <select
                className="form-select"
                id="ecu"
                onChange={handleECUChange}
                disabled={!selectedCarType || loading}
                required
              >
                <option value="">Select ECU</option>
                {ecus.map((ecu, index) => (
                  <option key={index} value={`${ecu.name}|${ecu.model_number}`}>
                    {ecu.name} ({ecu.model_number})
                  </option>
                ))}
              </select>
              {loading && selectedCarType && (
                <div className="mt-2">
                  <small className="text-muted">
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Loading ECUs...
                  </small>
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="versionNumber" className="form-label">
                Version Number
              </label>
              <input
                type="text"
                className="form-control"
                id="versionNumber"
                name="versionNumber"
                value={formData.versionNumber}
                onChange={handleChange}
                placeholder="e.g., v1.2.0"
                required
              />
              <small className="text-muted">
                Use semantic versioning if possible (e.g., v1.2.3)
              </small>
            </div>

            <div className="mb-3">
              <label htmlFor="hexFile" className="form-label">
                Hex File
              </label>
              <input
                type="file"
                className="form-control"
                id="hexFile"
                onChange={handleFileChange}
                accept=".hex,.srec,.bin"
                required
              />
              <small className="text-muted">Upload the firmware hex file</small>
            </div>

            {formData.hexFile && (
              <div className="mb-3">
                <div className="alert alert-info">
                  <strong>File:</strong> {formData.hexFile.name}
                  <br />
                  <strong>Size:</strong>{" "}
                  {Math.round(formData.hexFile.size / 1024)} KB
                  <br />
                  <strong>Path on server:</strong>{" "}
                  <code>{formData.hexFilePath}</code>
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Compatible Car Types</label>
              <div className="card">
                <div className="card-body">
                  {loadingCompatibleCarTypes ? (
                    <div className="text-center">
                      <div
                        className="spinner-border text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">
                          Loading compatible car types...
                        </span>
                      </div>
                      <p className="mt-2">Loading compatible car types...</p>
                    </div>
                  ) : formData.ecuName ? (
                    compatibleCarTypes.length > 0 ? (
                      <div className="row">
                        {compatibleCarTypes.map((carType, index) => (
                          <div className="col-md-4 mb-2" key={index}>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`carType${index}`}
                                checked={formData.compatibleCarTypes.includes(
                                  carType.name
                                )}
                                onChange={() =>
                                  handleCompatibleCarTypeToggle(carType.name)
                                }
                                disabled={carType.name === selectedCarType} // Disable for selected car type
                              />
                              <label
                                className="form-check-label"
                                htmlFor={`carType${index}`}
                              >
                                {carType.name} ({carType.model_number})
                                {carType.name === selectedCarType && (
                                  <span className="badge bg-primary ms-1">
                                    Source
                                  </span>
                                )}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        No compatible car types found for this ECU. The source
                        car type will be used.
                      </div>
                    )
                  ) : (
                    <div className="alert alert-warning">
                      Please select an ECU to see compatible car types.
                    </div>
                  )}
                </div>
              </div>
              <small className="text-muted">
                Select all car types that this firmware version is compatible
                with. The source car type is automatically included.
              </small>
            </div>

            <div className="d-flex justify-content-between">
              <Link to="/" className="btn btn-outline-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-upload me-1"></i> Upload Firmware
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default VersionUpload;
