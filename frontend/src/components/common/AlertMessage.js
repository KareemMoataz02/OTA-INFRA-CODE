import React from "react";

function AlertMessage({ type, message, onClose }) {
  // Map alert type to Bootstrap alert class
  const alertClasses = {
    success: "alert-success",
    info: "alert-info",
    warning: "alert-warning",
    error: "alert-danger",
  };

  const className = `alert ${
    alertClasses[type] || "alert-info"
  } alert-dismissible fade show`;

  return (
    <div className={className} role="alert">
      {message}
      <button
        type="button"
        className="btn-close"
        data-bs-dismiss="alert"
        aria-label="Close"
        onClick={onClose}
      ></button>
    </div>
  );
}

export default AlertMessage;
