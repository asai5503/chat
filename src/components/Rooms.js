import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where } from "firebase/firestore";
import db from "../firebase";

const Rooms = () => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRoomsAndMessages = async () => {
      const roomsRef = collection(db, "rooms");
      const roomSnapshot = await getDocs(roomsRef);
      const roomData = roomSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        messages: [],
      }));

      for (const room of roomData) {
        const messagesRef = collection(db, "messages");
        const messagesQuery = query(
          messagesRef,
          where("roomId", "==", room.id)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesData = messagesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        room.messages = messagesData;
      }

      setRooms(roomData);
    };
    fetchRoomsAndMessages();
  }, []);

  return (
    <div>
      <h1>Rooms</h1>
      <div>
        {rooms.map((room) => (
          <div key={room.id}>
            <h2>{room.roomName}</h2>
            <div>
              {room.messages.map((message) => (
                <div key={message.id}>
                  {message.senderId}:{message.content} <span>Likes: {message.likes.length}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Rooms;
