import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import db from "../firebase";

function ChatList({ currentUser }) {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      // currentUserが存在しない場合、処理を中断
      return;
    }

    async function fetchUnreadCounts() {
      const userReadsRef = collection(db, "userReads");
      const userReadsQuery = query(
        userReadsRef,
        where("userId", "==", currentUser.id)
      );
      const userReadsSnapshot = await getDocs(userReadsQuery);

      const updatedChats = await Promise.all(
        userReadsSnapshot.docs.map(async (userReadDoc) => {
          const userRead = userReadDoc.data();
          console.log("userRead:", userRead);
          console.log("lastReadMessageId:", userRead.lastReadMessageId);
          const roomId = userRead.roomId;

          const messagesRef = collection(db, "messages");
          const unreadMessagesQuery = query(
            messagesRef,
            where("roomId", "==", roomId),
            where("messageId", ">", userRead.lastReadMessageId || "0")
          );
          const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);

          return {
            ...userRead,
            unreadCount: unreadMessagesSnapshot.size,
          };
        })
      );

      setChats(updatedChats);
    }

    if (currentUser) {
      fetchUnreadCounts();
    }
  }, [currentUser]);

  return (
    <div>
      <h2>Chat List</h2>
      <ul>
        {chats.map((chat) => (
          <li key={chat.roomId}>
            {chat.roomId} - Unread messages: {chat.unreadCount}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ChatList;
