import React, { useState } from "react";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const AddFriend = () => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [userList, setUserList] = useState([]);

  const searchUser = async () => {
    // friendユーザを探す
    const usersSnapshot = await getDocs(
      query(collection(db, "users"), where("name", "==", username))
    );
    if (usersSnapshot.empty) {
      setError("No users found with this username.");
      return;
    }

    setUserList(
      usersSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
    );
  };

  const addFriend = async (friendId) => {
    // 自分のフレンドリストに追加
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnapshot = await getDoc(userRef);
    const userData = userSnapshot.data();

    if (userData.private && userData.private.friends && userData.private.friends.includes(friendId)) {
      setError("This user is already your friend.");
      return;
    }

    const newFriends = userData.private && userData.private.friends
      ? [...userData.private.friends, friendId]
      : [friendId];
      
      await setDoc(userRef, { 
        ...userData, 
        private: {
          ...userData.private,
          friends: newFriends 
        }
      });

    setError("Friend added successfully.");
    searchUser(); // to refresh the user list
  };

  return (
    <div>
      <h2>Add Friend</h2>
      <input
        type="text"
        placeholder="Enter friend's username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={searchUser}>Search</button>
      {error && <p>{error}</p>}
      {userList.map((user) => (
        <div key={user.id}>
          <img src={user.data.iconUrl} alt={user.data.name} />
          <span>{user.data.name}</span>
          <button onClick={() => addFriend(user.id)}>Add</button>
        </div>
      ))}
    </div>
  );
};

export default AddFriend;
