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
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Link } from "react-router-dom";
import db, { storage } from "../firebase";

function ChatList({ currentUser }) {
  const [chats, setChats] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [chatlessFriends, setChatlessFriends] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [newIconFile, setNewIconFile] = useState(null);
  const [newIconUrl, setNewIconUrl] = useState(null);

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

    // Fetch the rooms
    async function fetchRooms() {
      // Retrieve user document
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userRooms = userDoc.data().private.rooms || [];

      // Fetch each room
      const roomDocs = await Promise.all(
        userRooms.map((roomId) => getDoc(doc(db, "rooms", roomId)))
      );
      const roomData = roomDocs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setRooms(roomData);
    }

    if (currentUser) {
      fetchRooms();
    }
  }, [currentUser, selectedFriendId]);

  //ドロップダウンリストの変更
  const handleFriendChange = (e) => {
    setSelectedFriendId(e.target.value);
  };

  //1:1チャットを作成
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

  //1:1チャット削除
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

  //チャットルーム作成
  const createNewRoom = async () => {
    if (!newRoomName.trim() || !newIconFile) {
      console.error("No room name or icon file provided.");
      return;
    }

    const storage = getStorage();
    const storageRef = ref(storage, "roomIcons/" + newIconFile.name);
    const uploadTask = uploadBytesResumable(storageRef, newIconFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        console.error("Error uploading file: ", error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        const newRoom = {
          name: newRoomName,
          iconUrl: downloadURL,
          members: [currentUser.uid],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          const docRef = await addDoc(collection(db, "rooms"), newRoom);

          newRoom.id = docRef.id;

          // Update 'rooms' in currentUser's document
          await runTransaction(db, async (transaction) => {
            const currentUserDoc = doc(db, "users", currentUser.uid);
            const currentUserDocSnapshot = await transaction.get(
              currentUserDoc
            );

            // If 'private.rooms' field doesn't exist, initialize it
            let currentUserRooms =
              currentUserDocSnapshot.data().private.rooms || [];
            currentUserRooms.push(docRef.id);

            // Update 'private.rooms' in currentUser's document
            transaction.update(currentUserDoc, {
              "private.rooms": currentUserRooms,
            });
          });

          setRooms([...rooms, newRoom]);

          // Reset new room name and icon file and icon URL
          setNewRoomName("");
          setNewIconFile(null);
          setNewIconUrl(null);
        } catch (e) {
          console.error("Error adding room: ", e);
        }
      }
    );
  };

  //チャットルーム削除
  const deleteRoom = async (roomchatId) => {
    try {
      // Delete the room document
      const roomDoc = doc(db, "rooms", roomchatId);
      await deleteDoc(roomDoc);

      // Update the room list
      setRooms(rooms.filter((room) => room.id !== roomchatId));

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
          (roomId) => roomId !== roomchatId
        );

        // Update 'rooms' in currentUser's document
        transaction.update(currentUserDoc, {
          "private.rooms": currentUserRooms,
        });
      });

      // Delete the room's image from storage
      const storageRef = ref(storage, `rooms/${roomchatId}`);
      await deleteObject(storageRef);

      console.log("Room deleted with ID: ", roomchatId);
    } catch (e) {
      console.error("Error deleting room: ", e);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setNewIconFile(file);

    // Preview the selected image file
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewIconUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <h2>Chat List</h2>
      <h3>DirectRoom</h3>
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
      <ul>
        {chats.map(
          (chat) =>
            chat && (
              <li key={chat.friendId}>
                <img
                  src={chat.friendIconUrl}
                  alt={chat.friendName}
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                  }}
                />
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
                )}
              </li>
            )
        )}
      </ul>

      <h3>Room</h3>
      <input
        type="text"
        placeholder="Enter room name"
        value={newRoomName}
        onChange={(e) => setNewRoomName(e.target.value)}
      />
      <input type="file" onChange={handleFileChange} />
      {newIconUrl && (
        <img
          src={newIconUrl}
          alt="Preview"
          style={{ width: "100px", height: "100px" }}
        />
      )}
      <button onClick={createNewRoom}>Create Room</button>
      <ul>
        {rooms.map(
          (room) =>
            room && (
              <li key={room.id}>
                <img
                  src={room.iconUrl}
                  alt={room.name}
                  style={{ width: "50px", height: "50px" }}
                />

                <Link to={`/room/${room.id}`}>{room.name}</Link>

                <button onClick={() => deleteRoom(room.id)}>Delete Room</button>
              </li>
            )
        )}
      </ul>
    </div>
  );
}

export default ChatList;
