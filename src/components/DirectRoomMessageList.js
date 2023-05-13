import React from "react";
import Linkify from "react-linkify";

const DirectRoomMessageList = ({
  messages,
  currentUser,
  handleLikeClick,
  handleEditClick,
}) => {
  return (
    <div>
      {messages.map((message) => {
        const isLiked = message.likes.includes(currentUser.uid);
        return (
          <div key={message.id}>
            {message.senderId}: <Linkify>{message.content || ""}</Linkify>{" "}
            {message.image && (
              <img src={message.image} alt="message" width="100" />
            )}
            <span>Likes: {message.likes.length}</span>
            <button onClick={() => handleLikeClick(message.id, isLiked)}>
              {isLiked ? "Unlike" : "Like"}
            </button>
            {currentUser.uid === message.senderId && (
              <>
                <button
                  onClick={() => handleEditClick(message.id, message.content)}
                >
                  Edit
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DirectRoomMessageList;
