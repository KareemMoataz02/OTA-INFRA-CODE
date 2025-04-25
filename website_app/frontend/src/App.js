import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Common components
import Header from "./components/common/Header";
import Sidebar from "./components/common/Sidebar";
import Footer from "./components/common/Footer";
import AlertMessage from "./components/common/AlertMessage";

// Dashboard
import Dashboard from "./components/dashboard/Dashboard";

// Car Type components
import CarTypeList from "./components/car-types/CarTypeList";
import CarTypeDetail from "./components/car-types/CarTypeDetail";
import CarTypeForm from "./components/car-types/CarTypeForm";
import CarTypeStats from "./components/car-types/CarTypeStats";

// ECU components
import ECUList from "./components/ecus/ECUList";
import ECUDetail from "./components/ecus/ECUDetail";
import CompatibleECUList from "./components/ecus/CompatibleECUList";

// Version components
import VersionList from "./components/versions/VersionList";
import VersionDetail from "./components/versions/VersionDetail";
import VersionUpload from "./components/versions/VersionUpload";

// Request components
import RequestList from "./components/requests/RequestList";
import RequestDetail from "./components/requests/RequestDetail";
import ServiceRequestForm from "./components/requests/ServiceRequestForm";
import DownloadRequestForm from "./components/requests/DownloadRequestForm";
import ActiveDownloads from "./components/requests/ActiveDownloads";

function App() {
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  // Show alert message
  const showAlert = (type, message, duration = 5000) => {
    setAlert({ show: true, type, message });

    // Auto-hide after duration
    setTimeout(() => {
      setAlert({ show: false, type: "", message: "" });
    }, duration);
  };

  return (
    <Router>
      <div className="app-container d-flex flex-column min-vh-100">
        <Header />

        <div className="container-fluid flex-grow-1">
          <div className="row">
            <Sidebar />

            <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
              {alert.show && (
                <AlertMessage
                  type={alert.type}
                  message={alert.message}
                  onClose={() =>
                    setAlert({ show: false, type: "", message: "" })
                  }
                />
              )}

              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<Dashboard />} />

                {/* Car Types */}
                <Route
                  path="/car-types"
                  element={<CarTypeList showAlert={showAlert} />}
                />
                <Route
                  path="/car-types/new"
                  element={<CarTypeForm showAlert={showAlert} />}
                />
                <Route
                  path="/car-types/edit/:name"
                  element={<CarTypeForm showAlert={showAlert} />}
                />
                <Route path="/car-types/stats" element={<CarTypeStats />} />
                <Route
                  path="/car-types/:name"
                  element={<CarTypeDetail showAlert={showAlert} />}
                />

                {/* ECUs */}
                <Route
                  path="/ecus/:carTypeName"
                  element={<ECUList showAlert={showAlert} />}
                />
                <Route
                  path="/ecus/:name/:model"
                  element={<ECUDetail showAlert={showAlert} />}
                />
                <Route
                  path="/ecus/compatible/:carTypeName"
                  element={<CompatibleECUList showAlert={showAlert} />}
                />

                {/* Versions */}
                <Route
                  path="/versions/ecu/:ecuName/:ecuModel"
                  element={<VersionList showAlert={showAlert} />}
                />
                <Route
                  path="/versions/ecu/:ecuName/:ecuModel/:versionNumber"
                  element={<VersionDetail showAlert={showAlert} />}
                />
                <Route
                  path="/versions/upload"
                  element={<VersionUpload showAlert={showAlert} />}
                />
                <Route
                  path="/versions/compatible/:carTypeName"
                  element={
                    <VersionList
                      showAlert={showAlert}
                      isCompatibleView={true}
                    />
                  }
                />

                {/* Requests */}
                {/* <Route
                  path="/requests"
                  element={<RequestList showAlert={showAlert} />}
                />
                <Route
                  path="/requests/:id"
                  element={<RequestDetail showAlert={showAlert} />}
                />
                <Route
                  path="/requests/service/new"
                  element={<ServiceRequestForm showAlert={showAlert} />}
                />
                <Route
                  path="/requests/download/new"
                  element={<DownloadRequestForm showAlert={showAlert} />}
                />
                <Route
                  path="/requests/download/active"
                  element={<ActiveDownloads showAlert={showAlert} />}
                /> */}
              </Routes>
            </main>
          </div>
        </div>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
