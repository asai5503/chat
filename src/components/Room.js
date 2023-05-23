import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Linkify from "react-linkify";
import { useParams } from "react-router-dom";

const Room = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const { roomId } = useParams();
  const { currentUser } = useAuth();

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

  return (
    <div>
      {currentUser ? (
        <>
          <h1>Room: {roomId}</h1>
          <div>
            {messages.map((message) => (
              <div key={message.id}>
                {message.senderId}:{message.content}{" "}
                <span>Likes: {message.likes.length}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleNewMessageSubmit}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter a new message"
            />
            <input type="file" onChange={handleFileInputChange} />
            {fileUrl && (
              <img src={fileUrl} alt="uploaded file preview" width="100" />
            )}
            <button type="submit">Send</button>
          </form>
        </>
      ) : (
        <p>ログインしてください</p>
      )}
    </div>
  );
};

export default Room;
