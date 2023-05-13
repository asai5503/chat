import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import DirectRoomHeader from "./DirectRoomHeader";
import DirectRoomDropArea from "./DirectRoomDropArea";
import DirectRoomMessageList from "./DirectRoomMessageList";
import DirectRoomMessageForm from "./DirectRoomMessageForm";

const DirectRoom = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const { currentUser } = useAuth();
  const [editingMessageId, setEditingMessageId] = useState(null);

  useEffect(() => {
    if (currentUser) {
      const messagesRef = collection(db, "messages");
      const messagesQuery = query(
        messagesRef,
        where("roomId", "==", roomId),
        orderBy("sendDate", "asc")
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        setMessages(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      });

      return () => {
        unsubscribe();
      };
    }
  }, [currentUser, roomId]);

  const handleNewMessageSubmit = async (e) => {
    e.preventDefault();
    if (newMessage || file) {
      try {
        let imageUrl = "";
        if (file) {
          imageUrl = await handleImageUpload(file);
        }

        const messageData = {
          roomId: roomId,
          sendDate: serverTimestamp(),
          senderId: currentUser.uid,
          content: newMessage,
          image: imageUrl,
          likes: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await addDoc(collection(db, "messages"), messageData);
        setNewMessage("");
        setFile(null);
        setFileUrl("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleImageUpload = async (file) => {
    try {
      const fileRef = ref(storage, `images/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const fileUrl = URL.createObjectURL(file);
      setFileUrl(fileUrl);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFile(file);
      const fileUrl = URL.createObjectURL(file);
      setFileUrl(fileUrl);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setFile(file);
      const fileUrl = URL.createObjectURL(file);
      setFileUrl(fileUrl);
    }
  };

  //いいね機能
  const handleLikeClick = async (messageId, isLiked) => {
    try {
      const messageRef = doc(db, "messages", messageId);

      if (isLiked) {
        await updateDoc(messageRef, {
          likes: arrayRemove(currentUser.uid),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(messageRef, {
          likes: arrayUnion(currentUser.uid),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error updating likes:", error);
    }
  };

  //編集機能
  const handleEditClick = (messageId, content) => {
    setEditingMessageId(messageId);
    setNewMessage(content);
  };

  const handleMessageUpdate = async (messageId) => {
    if (editingMessageId) {
      try {
        const messageRef = doc(db, "messages", messageId);

        await updateDoc(messageRef, {
          content: newMessage,
          updatedAt: serverTimestamp(),
        });

        setEditingMessageId(null);
        setNewMessage("");
      } catch (error) {
        console.error("Error updating message:", error);
      }
    }
  };



  return (
    <div>
      {currentUser ? (
        <div>
          <DirectRoomHeader roomId={roomId} />
          <DirectRoomDropArea
            dragging={dragging}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
          />
          <DirectRoomMessageList
            messages={messages}
            currentUser={currentUser}
            handleLikeClick={handleLikeClick}
            handleEditClick={handleEditClick}
          />
          <DirectRoomMessageForm
            newMessage={newMessage}
            fileUrl={fileUrl}
            handleNewMessageSubmit={handleNewMessageSubmit}
            handleFileInputChange={handleFileInputChange}
            handleMessageUpdate={handleMessageUpdate}
          />
        </div>
      ) : (
        <p>ログインしてください</p>
      )}
    </div>
  );
};

export default DirectRoom;
