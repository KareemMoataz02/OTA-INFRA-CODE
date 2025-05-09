import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import carTypeService from "../../services/carTypeService";
import versionService from "../../services/versionService";
import ecuService from "../../services/ecuService";
import Loading from "../common/Loading";

function CarTypeForm({ showAlert }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(name);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingVersions, setUploadingVersions] = useState(false);

  // Add flags to prevent repeated API calls
  const [attemptedLoadingEcus, setAttemptedLoadingEcus] = useState(false);
  const [attemptedLoadingCarTypes, setAttemptedLoadingCarTypes] =
    useState(false);

  // Initialize arrays properly
  const [availableCarTypes, setAvailableCarTypes] = useState([]);
  const [availableEcus, setAvailableEcus] = useState([]);
  const [filteredEcus, setFilteredEcus] = useState([]); // New state to store filtered ECUs
  const [loadingCarTypes, setLoadingCarTypes] = useState(true);
  const [loadingEcus, setLoadingEcus] = useState(true);
  const [ecuLoadError, setEcuLoadError] = useState(null);

  // For multiple ECU selection with checkboxes (store using name|model format)
  const [selectedExistingEcus, setSelectedExistingEcus] = useState([]);

  // Add this new state to track compatible car types for the selected ECU
  const [ecuCompatibleCarTypes, setEcuCompatibleCarTypes] = useState([]);
  const [loadingCompatibleCarTypes, setLoadingCompatibleCarTypes] =
    useState(false);

  const [formData, setFormData] = useState({
    name: "",
    model_number: "",
    manufactured_count: 0,
    car_ids: [],
    ecus: [],
  });

  // State for ECU selection mode
  const [ecuMode, setEcuMode] = useState("new"); // "new" or "existing"

  // New ECU and version form
  const [newEcu, setNewEcu] = useState({
    name: "",
    model_number: "",
    versions: [],
  });

  // New version form - initialize with current car type
  const [newVersion, setNewVersion] = useState({
    version_number: "",
    compatible_car_types: [],
    hex_file_path: "",
    hexFile: null, // File object
    hexFileName: "", // For displaying file name
    hexFileSize: 0, // For displaying file size
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
            name: data.name || "",
            model_number: data.model_number || "",
            manufactured_count: data.manufactured_count || 0,
            car_ids: data.car_ids || [],
            ecus: data.ecus || [],
          });

          // Initialize version with the current car type
          setNewVersion((prev) => ({
            ...prev,
            compatible_car_types: [data.name.toLowerCase()],
          }));

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

  // Fetch available car types and ECUs
  useEffect(() => {
    // Only fetch if we haven't attempted yet
    if (!attemptedLoadingCarTypes) {
      const fetchCarTypes = async () => {
        try {
          setLoadingCarTypes(true);
          const response = await carTypeService.getAllCarTypes();
          const data = response?.data || response; // Handle different API response structures
          setAvailableCarTypes(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("Error fetching car types:", err);
          showAlert("error", "Failed to fetch available car types");
          setAvailableCarTypes([]);
        } finally {
          setLoadingCarTypes(false);
          setAttemptedLoadingCarTypes(true); // Mark as attempted
        }
      };

      fetchCarTypes();
    }

    // Only fetch if we haven't attempted yet
    if (!attemptedLoadingEcus) {
      const fetchEcus = async () => {
        try {
          setLoadingEcus(true);
          setEcuLoadError(null);
          const response = await ecuService.getAllEcus();
          const data = response?.data || response; // Handle different API response structures

          if (!data) {
            throw new Error("No data returned from ECU service");
          }

          if (!Array.isArray(data)) {
            console.warn("ECU data is not an array:", data);
            throw new Error(
              "Expected array of ECUs but received different data structure"
            );
          }

          setAvailableEcus(data);
        } catch (err) {
          console.error("Error fetching ECUs:", err);
          setEcuLoadError(`Failed to fetch ECUs: ${err.message}`);
          showAlert("error", `Failed to fetch available ECUs: ${err.message}`);
          setAvailableEcus([]);
        } finally {
          setLoadingEcus(false);
          setAttemptedLoadingEcus(true); // Mark as attempted
        }
      };

      fetchEcus();
    }
  }, [showAlert, attemptedLoadingEcus, attemptedLoadingCarTypes]);

  // Filter out already added ECUs when the form data or available ECUs change
  useEffect(() => {
    if (availableEcus.length > 0 && formData.ecus.length > 0) {
      const filteredList = availableEcus.filter((availableEcu) => {
        // Check if this ECU is already in the formData ECUs
        return !formData.ecus.some(
          (formEcu) =>
            formEcu.name === availableEcu.name &&
            formEcu.model_number === availableEcu.model_number
        );
      });

      setFilteredEcus(filteredList);
    } else {
      setFilteredEcus(availableEcus);
    }
  }, [availableEcus, formData.ecus]);

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

  // Handle ECU mode change
  const handleEcuModeChange = (mode) => {
    setEcuMode(mode);
    // Reset selections when switching modes
    setSelectedExistingEcus([]);
  };

  // Handle ECU checkbox changes
  const handleEcuCheckboxChange = (e) => {
    const { checked } = e.target;
    // Get the ECU data from the data-* attributes
    const ecuName = e.target.getAttribute("data-name");
    const ecuModel = e.target.getAttribute("data-model");

    // Create a unique key for this ECU
    const ecuKey = `${ecuName}|${ecuModel}`;

    if (checked) {
      // Add to selected ECUs
      setSelectedExistingEcus((prev) => [...prev, ecuKey]);
      console.log(`ECU ${ecuName} (${ecuModel}) selected`);
    } else {
      // Remove from selected ECUs
      setSelectedExistingEcus((prev) => prev.filter((key) => key !== ecuKey));
      console.log(`ECU ${ecuName} (${ecuModel}) unselected`);
    }
  };

  // Handle compatible car type checkbox changes
  const handleCompatibleCarTypeChange = (e) => {
    const { value, checked } = e.target;

    // If checked, add to array, otherwise remove
    if (checked) {
      setNewVersion({
        ...newVersion,
        compatible_car_types: [...newVersion.compatible_car_types, value],
      });
    } else {
      // Don't allow removing current car type
      if (value === formData.name.toLowerCase()) {
        return;
      }

      setNewVersion({
        ...newVersion,
        compatible_car_types: newVersion.compatible_car_types.filter(
          (ct) => ct !== value
        ),
      });
    }
  };

  // Handle version file changes
  const handleVersionFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a path that would be used in the backend
      const hexFilePath = `hex_files/${file.name}`;

      setNewVersion({
        ...newVersion,
        hexFile: file,
        hexFileName: file.name,
        hexFileSize: file.size,
        hex_file_path: hexFilePath,
      });
    }
  };

  // Add new ECU to form
  const handleAddEcu = (e) => {
    e.preventDefault();

    if (ecuMode === "new") {
      if (!newEcu.name || !newEcu.model_number) {
        showAlert("warning", "ECU name and model number are required");
        return;
      }

      // Check if this ECU already exists in the formData
      const isEcuAlreadyAdded = formData.ecus.some(
        (ecu) =>
          ecu.name === newEcu.name && ecu.model_number === newEcu.model_number
      );

      if (isEcuAlreadyAdded) {
        showAlert(
          "warning",
          `ECU ${newEcu.name} (${newEcu.model_number}) is already added`
        );
        return;
      }

      // Create new ECU with empty versions array
      const ecuToAdd = {
        ...newEcu,
        versions: [],
      };

      // Update formData with the new ECU
      setFormData((prevData) => ({
        ...prevData,
        ecus: [...prevData.ecus, ecuToAdd],
      }));

      // Reset the newEcu form
      setNewEcu({
        name: "",
        model_number: "",
        versions: [],
      });

      showAlert(
        "success",
        `ECU ${ecuToAdd.name} (${ecuToAdd.model_number}) added successfully`
      );
      console.log("New ECU added:", ecuToAdd);
    } else {
      // Add existing ECUs (multiple)
      if (!selectedExistingEcus.length) {
        showAlert("warning", "Please select at least one ECU");
        return;
      }

      // Process each selected ECU
      const ecusToAdd = [];

      for (const ecuKey of selectedExistingEcus) {
        // Split the key back into name and model
        const [ecuName, ecuModel] = ecuKey.split("|");

        // Find the selected ECU with safety checks
        const selectedEcu = filteredEcus.find(
          (ecu) => ecu && ecu.name === ecuName && ecu.model_number === ecuModel
        );

        if (!selectedEcu) {
          console.warn(`Selected ECU "${ecuName}" (${ecuModel}) not found`);
          continue;
        }

        // Check if this ECU is already added - should be redundant due to filtering
        const isEcuAlreadyAdded = formData.ecus.some(
          (ecu) =>
            ecu &&
            ecu.name === selectedEcu.name &&
            ecu.model_number === selectedEcu.model_number
        );

        if (isEcuAlreadyAdded) {
          console.warn(
            `ECU ${selectedEcu.name} - ${selectedEcu.model_number} already added, skipping`
          );
          continue;
        }

        // Ensure versions is always an array
        const ecuToAdd = {
          ...selectedEcu,
          versions: Array.isArray(selectedEcu.versions)
            ? selectedEcu.versions
            : [],
        };

        ecusToAdd.push(ecuToAdd);
      }

      // Add all valid ECUs at once - using functional update to avoid state issues
      if (ecusToAdd.length) {
        setFormData((prevData) => ({
          ...prevData,
          ecus: [...prevData.ecus, ...ecusToAdd],
        }));

        showAlert("success", `Added ${ecusToAdd.length} ECU(s)`);
        console.log(`Added ${ecusToAdd.length} existing ECUs`);
      } else {
        showAlert(
          "warning",
          "No new ECUs were added (all were duplicates or invalid)"
        );
        console.warn("No new ECUs added - all were duplicates or invalid");
      }

      // Reset selection
      setSelectedExistingEcus([]);
    }
  };

  // Remove ECU from form
  const handleRemoveEcu = (index) => {
    const updatedEcus = [...formData.ecus];
    const removedEcu = updatedEcus[index];
    updatedEcus.splice(index, 1);

    // Using functional update to ensure we get the latest state
    setFormData((prevData) => ({
      ...prevData,
      ecus: updatedEcus,
    }));

    // Reset selected ECU if it was the one removed
    if (selectedEcuIndex === index) {
      setSelectedEcuIndex(null);
    } else if (selectedEcuIndex > index) {
      // Adjust index if a ECU before the selected one was removed
      setSelectedEcuIndex(selectedEcuIndex - 1);
    }

    showAlert(
      "info",
      `Removed ECU: ${removedEcu.name} (${removedEcu.model_number})`
    );
  };

  // Set selected ECU for adding versions
  // Update the handleSelectEcu function to fetch compatible car types for the selected ECU
  const handleSelectEcu = async (index) => {
    setSelectedEcuIndex(index);
    const selectedEcu = formData.ecus[index];

    // Make sure current car type is included
    const currentCarTypeName = formData.name.toLowerCase();

    // Reset the version form when switching ECUs
    setNewVersion({
      version_number: "",
      compatible_car_types: [currentCarTypeName],
      hex_file_path: "",
      hexFile: null,
      hexFileName: "",
      hexFileSize: 0,
    });

    // Fetch car types compatible with this ECU
    try {
      setLoadingCompatibleCarTypes(true);
      const response = await carTypeService.getCarTypesByEcuName(
        selectedEcu.name
      );
      const compatibleTypes = response?.data || response || [];

      // Extract just the car type names and convert to lowercase
      const carTypeNames = compatibleTypes.map((ct) => ct.name.toLowerCase());

      // Make sure the current car type is included
      if (!carTypeNames.includes(currentCarTypeName)) {
        carTypeNames.push(currentCarTypeName);
      }

      setEcuCompatibleCarTypes(carTypeNames);
      console.log(
        `Fetched ${carTypeNames.length} compatible car types for ECU ${selectedEcu.name}`
      );
    } catch (error) {
      console.error("Error fetching compatible car types:", error);
      // Fallback to all car types if the fetch fails
      setEcuCompatibleCarTypes([]);
    } finally {
      setLoadingCompatibleCarTypes(false);
    }

    console.log(`Selected ECU at index ${index} for adding versions`);
  };

  // Add new version to selected ECU
  const handleAddVersion = (e) => {
    e.preventDefault();

    if (selectedEcuIndex === null) {
      showAlert("warning", "Please select an ECU first");
      return;
    }

    if (!newVersion.version_number) {
      showAlert("warning", "Version number is required");
      return;
    }

    if (!newVersion.hexFile && !newVersion.hex_file_path) {
      showAlert(
        "warning",
        "Please upload a firmware file or provide a file path"
      );
      return;
    }

    // Ensure the current car type is in compatible car types
    let compatibleCarTypes = [...newVersion.compatible_car_types];
    const currentCarTypeName = formData.name.toLowerCase();

    if (!compatibleCarTypes.includes(currentCarTypeName)) {
      compatibleCarTypes.push(currentCarTypeName);
    }

    // Use functional update to ensure latest state
    setFormData((prevData) => {
      const updatedEcus = [...prevData.ecus];

      // Initialize versions array if it doesn't exist
      if (!updatedEcus[selectedEcuIndex].versions) {
        updatedEcus[selectedEcuIndex].versions = [];
      }

      // Check if this version number already exists to prevent duplicates
      const isDuplicate = updatedEcus[selectedEcuIndex].versions.some(
        (version) => version.version_number === newVersion.version_number
      );

      if (isDuplicate) {
        // Skip adding if it's a duplicate
        showAlert(
          "warning",
          `Version ${newVersion.version_number} already exists for this ECU`
        );
        return prevData; // Return unchanged state
      }

      // Add file information to the version
      updatedEcus[selectedEcuIndex].versions.push({
        ...newVersion,
        compatible_car_types: compatibleCarTypes,
        // Keep these properties for UI display
        hexFileName: newVersion.hexFileName,
        hexFileSize: newVersion.hexFileSize,
      });

      return {
        ...prevData,
        ecus: updatedEcus,
      };
    });

    // Reset the form but keep compatible car types
    setNewVersion({
      version_number: "",
      compatible_car_types: [currentCarTypeName],
      hex_file_path: "",
      hexFile: null,
      hexFileName: "",
      hexFileSize: 0,
    });

    // Only show alert if we actually added the version (not for duplicates)
    // if (
    //   !updatedEcus[selectedEcuIndex].versions.some(
    //     (v) => v.version_number === newVersion.version_number
    //   )
    // ) {
    //   showAlert(
    //     "success",
    //     `Added version ${newVersion.version_number} to ECU: ${formData.ecus[selectedEcuIndex].name}`
    //   );
    //   console.log(`Added new version to ECU at index ${selectedEcuIndex}`);
    // }
  };

  // Remove version from ECU
  const handleRemoveVersion = (ecuIndex, versionIndex) => {
    // Use functional update to ensure latest state
    setFormData((prevData) => {
      const updatedEcus = [...prevData.ecus];
      const versionNumber =
        updatedEcus[ecuIndex].versions[versionIndex].version_number;

      // Check if versions array exists
      if (!updatedEcus[ecuIndex].versions) {
        updatedEcus[ecuIndex].versions = [];
        return {
          ...prevData,
          ecus: updatedEcus,
        };
      }

      updatedEcus[ecuIndex].versions.splice(versionIndex, 1);

      showAlert(
        "info",
        `Removed version ${versionNumber} from ECU: ${updatedEcus[ecuIndex].name}`
      );
      return {
        ...prevData,
        ecus: updatedEcus,
      };
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

    // Use functional update to ensure latest state
    setFormData((prevData) => ({
      ...prevData,
      car_ids: [...prevData.car_ids, carIdInput],
    }));

    setCarIdInput("");
    showAlert("success", `Added Car ID: ${carIdInput}`);
  };

  // Handle removing a car ID
  const handleRemoveCarId = (index) => {
    const carId = formData.car_ids[index];

    // Use functional update to ensure latest state
    setFormData((prevData) => {
      const updatedCarIds = [...prevData.car_ids];
      updatedCarIds.splice(index, 1);

      return {
        ...prevData,
        car_ids: updatedCarIds,
      };
    });

    showAlert("info", `Removed Car ID: ${carId}`);
  };

  // Upload files to Azure blob storage
  const uploadFirmwareFiles = async () => {
    const updatedEcus = [...formData.ecus];
    let uploadCount = 0;

    // Count how many files need to be uploaded
    for (const ecu of updatedEcus) {
      if (!ecu.versions) continue;
      for (const version of ecu.versions) {
        if (version.hexFile) {
          uploadCount++;
        }
      }
    }

    if (uploadCount === 0) {
      return updatedEcus; // No files to upload
    }

    setUploadingVersions(true);
    showAlert("info", `Uploading ${uploadCount} firmware files...`);

    // Upload each file
    for (let i = 0; i < updatedEcus.length; i++) {
      // Skip if versions array doesn't exist
      if (!updatedEcus[i].versions) continue;

      for (let j = 0; j < updatedEcus[i].versions.length; j++) {
        const version = updatedEcus[i].versions[j];

        if (version.hexFile) {
          try {
            // Prepare upload data
            const uploadData = {
              ecuName: updatedEcus[i].name,
              ecuModel: updatedEcus[i].model_number,
              versionNumber: version.version_number,
              compatibleCarTypes: version.compatible_car_types,
              hexFile: version.hexFile,
            };

            // Upload to Azure
            const result = await versionService.uploadFirmware(uploadData);

            // Update the path with the Azure URL
            updatedEcus[i].versions[j].hex_file_path =
              result.version.hex_file_path;

            // Remove the File object references - they can't be stored in MongoDB
            delete updatedEcus[i].versions[j].hexFile;
          } catch (error) {
            console.error(`Error uploading firmware file: ${error}`);
            showAlert(
              "error",
              `Failed to upload firmware file for ${version.version_number}`
            );
            throw error; // Rethrow to stop the process
          }
        }
      }
    }

    showAlert("success", `Successfully uploaded ${uploadCount} firmware files`);
    setUploadingVersions(false);

    return updatedEcus;
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

      // Check if we have any files to upload
      const hasFileUploads = formData.ecus.some(
        (ecu) => ecu.versions && ecu.versions.some((version) => version.hexFile)
      );

      // Copy formData to avoid mutating state directly
      let carTypeData = { ...formData };

      if (hasFileUploads) {
        try {
          // Upload firmware files and get updated ECUs with Azure URLs
          carTypeData.ecus = await uploadFirmwareFiles();
        } catch (uploadError) {
          // If upload fails, stop the submission process
          setSubmitting(false);
          return;
        }
      }

      // Clean up any remaining File objects or display-only properties
      carTypeData.ecus = carTypeData.ecus.map((ecu) => ({
        ...ecu,
        versions: ecu.versions
          ? ecu.versions.map((version) => {
              const cleanVersion = { ...version };
              delete cleanVersion.hexFile;
              delete cleanVersion.hexFileName;
              delete cleanVersion.hexFileSize;
              return cleanVersion;
            })
          : [],
      }));

      // Save car type
      if (isEditMode) {
        console.log("\n\n Editing", carTypeData);
        await carTypeService.updateCarType(name, carTypeData);
        showAlert("success", `Car type ${formData.name} updated successfully`);
      } else {
        await carTypeService.createCarType(carTypeData);
        showAlert("success", `Car type ${formData.name} created successfully`);
      }

      // Navigate back to car types list
      navigate("/car-types");
    } catch (err) {
      console.error("Error saving car type:", err);
      setError("Name and model number combination may already exist.");
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
                    readOnly={isEditMode} // model_number cannot be changed in edit mode
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
        {!isEditMode ? (
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">ECUs</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <ul className="nav nav-tabs">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${
                        ecuMode === "new" ? "active" : ""
                      }`}
                      onClick={() => handleEcuModeChange("new")}
                      type="button"
                    >
                      Add New ECU
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${
                        ecuMode === "existing" ? "active" : ""
                      }`}
                      onClick={() => handleEcuModeChange("existing")}
                      type="button"
                    >
                      Choose Existing ECUs
                    </button>
                  </li>
                </ul>

                <div className="tab-content p-3 border border-top-0 rounded-bottom">
                  {ecuMode === "new" ? (
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
                  ) : (
                    <div>
                      {loadingEcus ? (
                        <div className="text-center p-3">
                          <div
                            className="spinner-border text-primary"
                            role="status"
                          >
                            <span className="visually-hidden">
                              Loading ECUs...
                            </span>
                          </div>
                          <p className="mt-2">Loading available ECUs...</p>
                        </div>
                      ) : ecuLoadError ? (
                        <div className="alert alert-danger">{ecuLoadError}</div>
                      ) : (
                        <div className="row g-3">
                          <div className="col-md-10">
                            <div
                              className="border rounded p-2"
                              style={{ maxHeight: "200px", overflowY: "auto" }}
                            >
                              {filteredEcus && filteredEcus.length > 0 ? (
                                filteredEcus.map((ecu, index) => (
                                  <div
                                    className="form-check"
                                    key={`ecu-${index}`}
                                  >
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`ecu-${index}`}
                                      data-name={ecu.name || ""}
                                      data-model={ecu.model_number || ""}
                                      checked={selectedExistingEcus.includes(
                                        `${ecu.name || ""}|${
                                          ecu.model_number || ""
                                        }`
                                      )}
                                      onChange={handleEcuCheckboxChange}
                                    />
                                    <label
                                      className="form-check-label"
                                      htmlFor={`ecu-${index}`}
                                    >
                                      {ecu.name || "Unnamed"} -{" "}
                                      {ecu.model_number || "No model"} (
                                      {(ecu.versions && ecu.versions.length) ||
                                        0}{" "}
                                      versions)
                                    </label>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center p-2">
                                  {filteredEcus.length === 0 &&
                                  availableEcus.length > 0
                                    ? "All available ECUs are already added"
                                    : "No ECUs available"}
                                </div>
                              )}
                            </div>

                            {availableEcus &&
                              availableEcus.length === 0 &&
                              !loadingEcus && (
                                <div className="text-danger mt-2">
                                  <small>
                                    No ECUs found. Make sure your API is working
                                    correctly.
                                  </small>
                                </div>
                              )}
                          </div>
                          <div className="col-md-2">
                            <button
                              type="button"
                              className="btn btn-primary w-100"
                              onClick={handleAddEcu}
                              disabled={selectedExistingEcus.length === 0}
                            >
                              Add ECUs
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                          <td>{(ecu.versions && ecu.versions.length) || 0}</td>
                          <td>
                            <div className="btn-group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleSelectEcu(ecuIndex)}
                              >
                                <i className="bi bi-plus-circle"></i> Add
                                Version
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
        ) : (
          <div></div>
        )}
        {selectedEcuIndex !== null &&
          !isEditMode &&
          formData.ecus[selectedEcuIndex] && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">
                  Add Version for ECU: {formData.ecus[selectedEcuIndex].name} (
                  {formData.ecus[selectedEcuIndex].model_number})
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label htmlFor="version_number" className="form-label">
                        Version Number
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="version_number"
                        placeholder="e.g., v1.2.0"
                        name="version_number"
                        value={newVersion.version_number}
                        onChange={(e) =>
                          setNewVersion({
                            ...newVersion,
                            version_number: e.target.value,
                          })
                        }
                      />
                      <small className="text-muted">
                        Use semantic versioning if possible (e.g., v1.2.3)
                      </small>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="hexFile" className="form-label">
                        Firmware File
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        id="hexFile"
                        onChange={handleVersionFileChange}
                        accept=".hex,.srec,.bin"
                      />
                      <small className="text-muted">
                        Upload the firmware file
                      </small>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Compatible Car Types</label>
                      <div
                        className="border rounded p-2"
                        style={{ maxHeight: "150px", overflowY: "auto" }}
                      >
                        {/* Current car type is always checked and disabled */}
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`ct-current`}
                            value={formData.name.toLowerCase()}
                            checked={true}
                            disabled={true}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`ct-current`}
                          >
                            {formData.name} (current)
                          </label>
                        </div>

                        {/* Other available car types as checkboxes - now filtered by ECU compatibility */}
                        {loadingCompatibleCarTypes ? (
                          <div className="text-center py-2">
                            <span
                              className="spinner-border spinner-border-sm text-primary"
                              role="status"
                            ></span>
                            <span className="ms-2">
                              Loading compatible car types...
                            </span>
                          </div>
                        ) : ecuCompatibleCarTypes.length > 1 ? (
                          // Show all compatible car types except the current one
                          availableCarTypes
                            .filter(
                              (ct) =>
                                ct.name &&
                                ct.name.toLowerCase() !==
                                  formData.name.toLowerCase() &&
                                ecuCompatibleCarTypes.includes(
                                  ct.name.toLowerCase()
                                )
                            )
                            .map((carType, index) => (
                              <div
                                className="form-check"
                                key={carType._id || `ct-${index}`}
                              >
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`ct-${carType._id || index}`}
                                  value={carType.name.toLowerCase()}
                                  checked={newVersion.compatible_car_types.includes(
                                    carType.name.toLowerCase()
                                  )}
                                  onChange={handleCompatibleCarTypeChange}
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor={`ct-${carType._id || index}`}
                                >
                                  {carType.name} - {carType.model_number}
                                </label>
                              </div>
                            ))
                        ) : (
                          <div className="text-muted py-2">
                            No other compatible car types found for this ECU.
                          </div>
                        )}
                      </div>
                      <small className="form-text text-muted mt-1">
                        Current car type is always included. Only car types
                        compatible with this ECU are shown.
                      </small>
                    </div>

                    {newVersion.hexFile && (
                      <div className="col-12">
                        <div className="alert alert-info">
                          <strong>File:</strong> {newVersion.hexFile.name}
                          <br />
                          <strong>Size:</strong>{" "}
                          {Math.round(newVersion.hexFile.size / 1024)} KB
                          <br />
                          <strong>Path on server:</strong>{" "}
                          <code>{newVersion.hex_file_path}</code>
                        </div>
                      </div>
                    )}

                    <div className="col-12">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddVersion}
                        disabled={
                          !newVersion.version_number ||
                          (!newVersion.hexFile && !newVersion.hex_file_path)
                        }
                      >
                        <i className="bi bi-plus-circle me-1"></i> Add Version
                      </button>
                    </div>
                  </div>
                </div>

                {formData.ecus[selectedEcuIndex].versions &&
                formData.ecus[selectedEcuIndex].versions.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Version Number</th>
                          <th>Firmware File</th>
                          <th>Compatible Car Types</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.ecus[selectedEcuIndex].versions.map(
                          (version, versionIndex) => (
                            <tr key={versionIndex}>
                              <td>{version.version_number}</td>
                              <td>
                                {version.hexFileName ? (
                                  <div>
                                    <div>{version.hexFileName}</div>
                                    <span className="badge bg-info">
                                      {Math.round(
                                        (version.hexFileSize || 0) / 1024
                                      )}{" "}
                                      KB
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className="text-truncate"
                                    style={{ maxWidth: "200px" }}
                                  >
                                    <a
                                      href={version.hex_file_path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary"
                                      title={version.hex_file_path}
                                    >
                                      {version.hex_file_path}
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td>
                                {version.compatible_car_types?.map(
                                  (carType, ctIndex) => (
                                    <span
                                      key={ctIndex}
                                      className="badge bg-info me-1"
                                    >
                                      {carType}
                                    </span>
                                  )
                                )}
                              </td>
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
        <div></div>
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
            disabled={submitting || uploadingVersions}
          >
            {submitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                {uploadingVersions
                  ? "Uploading Firmware Files..."
                  : "Saving..."}
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
