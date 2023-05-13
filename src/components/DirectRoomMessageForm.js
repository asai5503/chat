import React from "react";

const DirectRoomMessageForm = ({
  newMessage,
  setNewMessage,
  fileUrl,
  handleNewMessageSubmit,
  handleFileInputChange,
  handleMessageUpdate,
}) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (newMessage) {
          handleMessageUpdate();
        } else {
          handleNewMessageSubmit();
        }
      }}
    >
      <input
        type="text"
        placeholder="Enter a new message"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
      />
      <input type="file" onChange={handleFileInputChange} />
      {fileUrl && (
        <img src={fileUrl} alt="uploaded file preview" width="100" />
      )}
      <button type="submit">{newMessage ? "Update" : "Send"}</button>
    </form>
  );
};

export default DirectRoomMessageForm;
