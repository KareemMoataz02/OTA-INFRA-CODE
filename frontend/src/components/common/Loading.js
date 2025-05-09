import React from "react";

function Loading({ message = "Loading..." }) {
  return (
    <div className="d-flex justify-content-center align-items-center my-5">
      <div className="spinner-border text-primary me-3" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <span>{message}</span>
    </div>
  );
}

export default Loading;
