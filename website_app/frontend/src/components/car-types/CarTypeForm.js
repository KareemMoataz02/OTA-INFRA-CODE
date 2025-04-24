import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import carTypeService from "../../services/carTypeService";
import Loading from "../common/Loading";

function CarTypeForm({ showAlert }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(name);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    model_number: "",
    manufactured_count: 0,
    car_ids: [],
    ecus: [],
  });

  // New ECU and version form
  const [newEcu, setNewEcu] = useState({
    name: "",
    model_number: "",
    versions: [],
  });

  // New version form
  const [newVersion, setNewVersion] = useState({
    version_number: "",
    compatible_car_types: [],
    hex_file_path: "",
  });

  // Selected ECU for adding versions
  const [selectedEcuIndex, setSelectedEcuIndex] = useState(null);

  // Car ID input field
  const [carIdInput, setCarIdInput] = useState("");

  // Load existing car type data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchCarType = async () => {
        try {
          setLoading(true);
          const data = await carTypeService.getCarTypeByName(name);
          setFormData({
            name: data.name,
            model_number: data.model_number,
            manufactured_count: data.manufactured_count,
            car_ids: data.car_ids || [],
            ecus: data.ecus || [],
          });
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
    }
  }, [isEditMode, name, showAlert]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Convert manufactured_count to number
    if (name === "manufactured_count") {
      setFormData({
        ...formData,
        [name]: parseInt(value, 10) || 0,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Handle new ECU field changes
  const handleEcuChange = (e) => {
    const { name, value } = e.target;
    setNewEcu({
      ...newEcu,
      [name]: value,
    });
  };

  // Handle new version field changes
  const handleVersionChange = (e) => {
    const { name, value } = e.target;

    if (name === "compatible_car_types") {
      // Handle multi-select by splitting the value by commas
      setNewVersion({
        ...newVersion,
        [name]: value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
    } else {
      setNewVersion({
        ...newVersion,
        [name]: value,
      });
    }
  };

  // Add new ECU to form
  const handleAddEcu = (e) => {
    e.preventDefault();

    if (!newEcu.name || !newEcu.model_number) {
      showAlert("warning", "ECU name and model number are required");
      return;
    }

    setFormData({
      ...formData,
      ecus: [...formData.ecus, { ...newEcu, versions: [] }],
    });

    setNewEcu({
      name: "",
      model_number: "",
      versions: [],
    });
  };

  // Remove ECU from form
  const handleRemoveEcu = (index) => {
    const updatedEcus = [...formData.ecus];
    updatedEcus.splice(index, 1);

    setFormData({
      ...formData,
      ecus: updatedEcus,
    });
  };

  // Set selected ECU for adding versions
  const handleSelectEcu = (index) => {
    setSelectedEcuIndex(index);
    // Make sure "this" car type is in the compatible car types
    setNewVersion({
      ...newVersion,
      compatible_car_types: [formData.name],
    });
  };

  // Add new version to selected ECU
  const handleAddVersion = (e) => {
    e.preventDefault();

    if (selectedEcuIndex === null) {
      showAlert("warning", "Please select an ECU first");
      return;
    }

    if (!newVersion.version_number || !newVersion.hex_file_path) {
      showAlert("warning", "Version number and hex file path are required");
      return;
    }

    const updatedEcus = [...formData.ecus];
    updatedEcus[selectedEcuIndex].versions.push({ ...newVersion });

    setFormData({
      ...formData,
      ecus: updatedEcus,
    });

    setNewVersion({
      version_number: "",
      compatible_car_types: [formData.name],
      hex_file_path: "",
    });
  };

  // Remove version from ECU
  const handleRemoveVersion = (ecuIndex, versionIndex) => {
    const updatedEcus = [...formData.ecus];
    updatedEcus[ecuIndex].versions.splice(versionIndex, 1);

    setFormData({
      ...formData,
      ecus: updatedEcus,
    });
  };

  // Handle adding a car ID
  const handleAddCarId = (e) => {
    e.preventDefault();

    if (!carIdInput) {
      showAlert("warning", "Car ID cannot be empty");
      return;
    }

    if (formData.car_ids.includes(carIdInput)) {
      showAlert("warning", "Car ID already exists");
      return;
    }

    setFormData({
      ...formData,
      car_ids: [...formData.car_ids, carIdInput],
    });

    setCarIdInput("");
  };

  // Handle removing a car ID
  const handleRemoveCarId = (index) => {
    const updatedCarIds = [...formData.car_ids];
    updatedCarIds.splice(index, 1);

    setFormData({
      ...formData,
      car_ids: updatedCarIds,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.model_number) {
      showAlert("warning", "Car type name and model number are required");
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode) {
        await carTypeService.updateCarType(name, formData);
        showAlert("success", `Car type ${formData.name} updated successfully`);
      } else {
        await carTypeService.createCarType(formData);
        showAlert("success", `Car type ${formData.name} created successfully`);
      }

      // Navigate back to car types list
      navigate("/car-types");
    } catch (err) {
      console.error("Error saving car type:", err);
      setError("Failed to save car type. Please try again later.");
      showAlert("error", "Failed to save car type");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message={`Loading car type data...`} />;
  }

  return (
    <div className="car-type-form">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">
          {isEditMode ? `Edit Car Type: ${name}` : "Add New Car Type"}
        </h1>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Basic Information</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    readOnly={isEditMode} // Name cannot be changed in edit mode
                    required
                  />
                  {isEditMode && (
                    <small className="text-muted">
                      Name cannot be changed after creation.
                    </small>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="model_number" className="form-label">
                    Model Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="model_number"
                    name="model_number"
                    value={formData.model_number}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="manufactured_count" className="form-label">
                    Manufactured Count
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="manufactured_count"
                    name="manufactured_count"
                    value={formData.manufactured_count}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Car IDs</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter car ID"
                      value={carIdInput}
                      onChange={(e) => setCarIdInput(e.target.value)}
                    />
                    <button
                      className="btn btn-outline-primary"
                      onClick={handleAddCarId}
                      type="button"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {formData.car_ids.length > 0 ? (
                  <div className="card">
                    <ul className="list-group list-group-flush">
                      {formData.car_ids.map((carId, index) => (
                        <li
                          key={index}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          {carId}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveCarId(index)}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-muted">No car IDs added.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">ECUs</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <h6>Add New ECU</h6>
              <div className="row g-3">
                <div className="col-md-5">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ECU Name"
                    name="name"
                    value={newEcu.name}
                    onChange={handleEcuChange}
                  />
                </div>
                <div className="col-md-5">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Model Number"
                    name="model_number"
                    value={newEcu.model_number}
                    onChange={handleEcuChange}
                  />
                </div>
                <div className="col-md-2">
                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    onClick={handleAddEcu}
                  >
                    Add ECU
                  </button>
                </div>
              </div>
            </div>

            {formData.ecus.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Model Number</th>
                      <th>Versions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.ecus.map((ecu, ecuIndex) => (
                      <tr
                        key={ecuIndex}
                        className={
                          selectedEcuIndex === ecuIndex ? "table-primary" : ""
                        }
                      >
                        <td>{ecu.name}</td>
                        <td>{ecu.model_number}</td>
                        <td>{ecu.versions.length}</td>
                        <td>
                          <div className="btn-group">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleSelectEcu(ecuIndex)}
                            >
                              <i className="bi bi-list"></i> Versions
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveEcu(ecuIndex)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted">No ECUs added yet.</div>
            )}
          </div>
        </div>

        {selectedEcuIndex !== null && formData.ecus[selectedEcuIndex] && (
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                Versions for ECU: {formData.ecus[selectedEcuIndex].name} (
                {formData.ecus[selectedEcuIndex].model_number})
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h6>Add New Version</h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Version Number"
                      name="version_number"
                      value={newVersion.version_number}
                      onChange={handleVersionChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Hex File Path"
                      name="hex_file_path"
                      value={newVersion.hex_file_path}
                      onChange={handleVersionChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Compatible Car Types (comma separated)"
                      name="compatible_car_types"
                      value={newVersion.compatible_car_types.join(", ")}
                      onChange={handleVersionChange}
                    />
                    <small className="text-muted">
                      Current car type is included by default
                    </small>
                  </div>
                  <div className="col-12">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAddVersion}
                    >
                      Add Version
                    </button>
                  </div>
                </div>
              </div>

              {formData.ecus[selectedEcuIndex].versions.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Version Number</th>
                        <th>Hex File Path</th>
                        <th>Compatible Car Types</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.ecus[selectedEcuIndex].versions.map(
                        (version, versionIndex) => (
                          <tr key={versionIndex}>
                            <td>{version.version_number}</td>
                            <td>{version.hex_file_path}</td>
                            <td>{version.compatible_car_types.join(", ")}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  handleRemoveVersion(
                                    selectedEcuIndex,
                                    versionIndex
                                  )
                                }
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted">
                  No versions added yet for this ECU.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="d-flex justify-content-between">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/car-types")}
          >
            Cancel
          </button>
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
                Saving...
              </>
            ) : isEditMode ? (
              "Update Car Type"
            ) : (
              "Create Car Type"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CarTypeForm;
