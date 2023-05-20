import React, { useEffect, useState } from "react";
import {
  getDoc,
  doc,
  collection,
  getDocs,
  addDoc,
  runTransaction,
  deleteDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import db from "../firebase";

function ChatList({ currentUser }) {
  const [chats, setChats] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [chatlessFriends, setChatlessFriends] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    async function fetchFriendsAndRooms() {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();
      const friends = userData.private.friends || [];

      const updatedChats = await Promise.all(
        friends.map(async (friendId) => {
          const friendDoc = await getDoc(doc(db, "users", friendId));
          const friendData = friendDoc.data();
          const directRoomsSnapshot = await getDocs(
            collection(db, "directRooms")
          );
          const directRoom = directRoomsSnapshot.docs.find(
            (doc) =>
              (doc.data().user1 === currentUser.uid &&
                doc.data().user2 === friendId) ||
              (doc.data().user1 === friendId &&
                doc.data().user2 === currentUser.uid)
          );

          const directRoomId = directRoom ? directRoom.id : null;
          if (directRoomId) {
            return {
              friendId,
              friendName: friendData.name,
              friendIconUrl: friendData.iconUrl,
              directRoomId,
              unreadCount: userData.private.unreadCounts[friendId] || 0,
            };
          }
        })
      );

      // Filter out undefined values from updatedChats
      const filteredChats = updatedChats.filter((chat) => chat !== undefined);

      // Filter out chats without a room
      const chatsWithRooms = filteredChats.filter(
        (chat) => chat.directRoomId !== null
      );

      setChats(chatsWithRooms);

      const chatlessFriendsPromises = friends
        .filter(
          (friendId) =>
            !filteredChats.some((chat) => chat.friendId === friendId)
        )
        .map(async (friendId) => {
          const friendDoc = await getDoc(doc(db, "users", friendId));
          const friendData = friendDoc.data();
          return {
            friendId,
            friendName: friendData.name,
          };
        });

      setChatlessFriends(await Promise.all(chatlessFriendsPromises));
    }

    if (currentUser) {
      fetchFriendsAndRooms();
    }
  }, [currentUser, selectedFriendId]);

  const handleFriendChange = (e) => {
    setSelectedFriendId(e.target.value);
  };

  //チャット削除
  const deleteChat = async (chatId, friendId, friendName) => {
    try {
      // Delete the chat document
      const chatDoc = doc(db, "directRooms", chatId);
      await deleteDoc(chatDoc);

      // Update the chat list
      setChats(chats.filter((chat) => chat.directRoomId !== chatId));

      // Firebase Transaction
      await runTransaction(db, async (transaction) => {
        // Retrieve current user's document
        const currentUserDoc = doc(db, "users", currentUser.uid);
        const currentUserDocSnapshot = await transaction.get(currentUserDoc);

        // If 'private.rooms' field doesn't exist, initialize it
        let currentUserRooms =
          currentUserDocSnapshot.data().private.rooms || [];

        // Filter out the deleted room from currentUserRooms
        currentUserRooms = currentUserRooms.filter(
          (roomId) => roomId !== chatId
        );

        // Update 'rooms' in currentUser's document
        transaction.update(currentUserDoc, {
          "private.rooms": currentUserRooms,
        });
      });

      console.log("Chat deleted with ID: ", chatId);
      // Add the friend back to chatlessFriends
      setChatlessFriends((prevFriends) => [
        ...prevFriends,
        { friendId: friendId, friendName: friendName },
      ]);
    } catch (e) {
      console.error("Error deleting chat: ", e);
    }
  };

  const createNewChat = async () => {
    if (!selectedFriendId) {
      console.error("No friend selected.");
      return;
    }

    const newChat = {
      user1: currentUser.uid,
      user2: selectedFriendId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const docRef = await addDoc(collection(db, "directRooms"), newChat);

      // Retrieve selected friend's document before the transaction
      const friendDoc = doc(db, "users", selectedFriendId);

      // Firebase Transaction
      await runTransaction(db, async (transaction) => {
        // Retrieve current user's document
        const currentUserDoc = doc(db, "users", currentUser.uid);
        const currentUserDocSnapshot = await transaction.get(currentUserDoc);

        // Retrieve selected friend's document
        const friendDocSnapshot1 = await transaction.get(friendDoc);

        // If 'private.rooms' field doesn't exist, initialize it
        let currentUserRooms =
          currentUserDocSnapshot.data().private.rooms || [];
        currentUserRooms.push(docRef.id);

        // If 'private.rooms' field doesn't exist, initialize it
        let friendRooms = friendDocSnapshot1.data().private.rooms || [];
        friendRooms.push(docRef.id);

        // Update 'rooms' in currentUser's document
        transaction.update(currentUserDoc, {
          "private.rooms": currentUserRooms,
        });

        // Update 'rooms' in selected friend's document
        transaction.update(friendDoc, { "private.rooms": friendRooms });

        // Retrieve friend data to update chats
        const friendDocSnapshot2 = await getDoc(friendDoc);
        const friendData = friendDocSnapshot2.data();

        // Create new chat data
        const newChatData = {
          friendId: selectedFriendId,
          friendName: friendData.name,
          friendIconUrl: friendData.iconUrl,
          directRoomId: docRef.id,
          unreadCount: 0,
        };

        // Update chats
        setChats((prevChats) => [...prevChats, newChatData]);

        // Update chatlessFriends
        setChatlessFriends((prevFriends) =>
          prevFriends.filter((friend) => friend.friendId !== selectedFriendId)
        );

        // Reset selectedFriendId
        setSelectedFriendId("");
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  return (
    <div>
      <h2>Chat List</h2>
      <ul>
        {chats.map(
          (chat) =>
            chat && (
              <li key={chat.friendId}>
                <img src={chat.friendIconUrl} alt={chat.friendName} />
                {chat.directRoomId ? (
                  <div>
                    <Link to={`/directroom/${chat.directRoomId}`}>
                      {chat.friendName}
                    </Link>
                    <button
                      onClick={() =>
                        deleteChat(
                          chat.directRoomId,
                          chat.friendId,
                          chat.friendName
                        )
                      }
                    >
                      Delete Chat
                    </button>
                  </div>
                ) : (
                  chat.friendName
                )}{" "}
                - Unread messages: {chat.unreadCount}
              </li>
            )
        )}
      </ul>
      {chatlessFriends.length > 0 ? (
        <>
          <select
            value={selectedFriendId}
            onChange={handleFriendChange}
            style={{ width: "200px" }}
          >
            <option value="">Select a friend...</option>
            {chatlessFriends.map((friend) => (
              <option key={friend.friendId} value={friend.friendId}>
                {friend.friendName}
              </option>
            ))}
          </select>
          <button onClick={createNewChat}>Create New Chat</button>
        </>
      ) : (
        <p>No chatless friends found.</p>
      )}
    </div>
  );
}

export default ChatList;
