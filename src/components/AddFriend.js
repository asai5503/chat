import React, { useEffect, useState } from "react";
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
  const [friends, setFriends] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    fetchFriendsAndBlockedUsers();
  }, []);

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

    if (
      userData.private &&
      userData.private.friends &&
      userData.private.friends.includes(friendId)
    ) {
      setError("This user is already your friend.");
      return;
    }

    const newFriends =
      userData.private && userData.private.friends
        ? [...userData.private.friends, friendId]
        : [friendId];

    await setDoc(userRef, {
      ...userData,
      private: {
        ...userData.private,
        friends: newFriends,
      },
    });

    setError("Friend added successfully.");
    setUserList();
    fetchFriendsAndBlockedUsers();
  };

  //フレンドのブロック
  const blockFriend = async (friendId) => {
    // 自分のユーザ情報を取得
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnapshot = await getDoc(userRef);
    const userData = userSnapshot.data();

    if (!userData.private.friends.includes(friendId)) {
      setError("This user is not your friend.");
      return;
    }

    const newFriends = userData.private.friends.filter((id) => id !== friendId);
    const newBlockedUsers = userData.private.blockedUser
      ? [...userData.private.blockedUser, friendId]
      : [friendId];

    await setDoc(userRef, {
      ...userData,
      private: {
        ...userData.private,
        friends: newFriends,
        blockedUser: newBlockedUsers,
      },
    });

    setError("Friend blocked successfully.");
    setUserList();
    fetchFriendsAndBlockedUsers();
  };

  const fetchFriendsAndBlockedUsers = async () => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnapshot = await getDoc(userRef);
    const userData = userSnapshot.data();

    const friendsIds = userData?.private?.friends || [];
    const blockedUsersIds = userData?.private?.blockedUser || [];

    const friendsPromises = friendsIds.map((friendId) =>
      getDoc(doc(db, "users", friendId))
    );
    const friendsDocs = await Promise.all(friendsPromises);
    setFriends(
      friendsDocs.map((doc) => ({ id: doc.id, name: doc.data().name }))
    );

    const blockedUsersPromises = blockedUsersIds.map((userId) =>
      getDoc(doc(db, "users", userId))
    );
    const blockedUsersDocs = await Promise.all(blockedUsersPromises);
    setBlockedUsers(
      blockedUsersDocs.map((doc) => ({ id: doc.id, name: doc.data().name }))
    );
  };

  const unblockUser = async (userId) => {
    console.log("Unblock button clicked for userId: ", userId);
    // Get current user's data
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnapshot = await getDoc(userRef);
    const userData = userSnapshot.data();

    // Filter out the unblocked user from blockedUsers
    const newBlockedUsers = userData.private.blockedUser.filter(
      (id) => id !== userId
    );

    await setDoc(userRef, {
      ...userData,
      private: {
        ...userData.private,
        blockedUser: newBlockedUsers,
      },
    });

    setError("User unblocked successfully.");
    setUserList();
    fetchFriendsAndBlockedUsers();
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter friend's username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={searchUser}>Search</button>
      {error && <p>{error}</p>}

      {userList?.map((user) => (
        <div key={user.id}>
          <img
            src={user.data.iconUrl}
            alt={user.data.name}
            style={{ width: "100px", height: "100px", objectFit: "cover" }}
          />
          <span>{user.data.name}</span>
          <button onClick={() => addFriend(user.id)}>Add</button>
        </div>
      ))}
      <div>
        <h2>Friends</h2>
        {friends?.map((friend, index) => (
          <div key={index}>
            {friend.name}
            <button onClick={() => blockFriend(friend.id)}>Block</button>
          </div>
        ))}
      </div>
      <div>
        <h2>Blocked Users</h2>
        {blockedUsers?.map((user, index) => (
          <div key={index}>
            {user.name}
            <button onClick={() => unblockUser(user.id)}>Unblock</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AddFriend;
