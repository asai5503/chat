import { useEffect, useState } from "react";
import "./App.css";
import db from "./firebase";
import {
  collection,
  getDocs
} from "firebase/firestore";

function App() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const usersRef = collection(db, "users");

      const usersSnapshot = await getDocs(usersRef);

      const usersData = [];
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        const friendsRef = collection(db, "users", userId, "friends");
        const friendsSnapshot = await getDocs(friendsRef);
        const friendsData = friendsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        usersData.push({
          id: userId,
          ...userData,
          friends: friendsData,
        });
      }

      setUsers(usersData);
    };
    fetchData();
  }, []);

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>
          <h2>{user.name}</h2>
          <h3>Friends</h3>
          {user.friends.map((friend) => (
            <div key={friend.id}>
              <p>{friend.name}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default App;
