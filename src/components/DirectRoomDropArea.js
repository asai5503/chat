import React from "react";

const DirectRoomDropArea = ({
  dragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
}) => {
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        padding: "20px",
        border: `2px dashed ${dragging ? "green" : "gray"}`,
        margin: "20px",
      }}
    >
      Drag and drop an image here or click to select an image.
    </div>
  );
};

export default DirectRoomDropArea;
