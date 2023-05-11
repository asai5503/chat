import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import DirectRoom from "./components/DirectRoom";
import Rooms from "./components/Rooms";
import ChatList from "./components/ChatList";
import SignIn from "./components/SignIn";
import SignOut from "./components/SignOut";
import Home from "./components/Home";
import Navbar from "./components/Navbar";
import SignUp from "./components/SignUp";
import { AuthProvider } from "./contexts/AuthContext";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const roomId = "KijoJSou1a0ZaaV0GsIo"; // KijoJSou1a0ZaaV0GsIoを定数として定義

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />}></Route>
        <Route path="/signup" element={<SignUp />}></Route>
        <Route path="/signin" element={<SignIn user={user} />}></Route>
        <Route path="/signout" element={<SignOut />}></Route>
        <Route path="/rooms" element={<Rooms />}></Route>
        <Route path="/chatlist" element={<ChatList />}></Route>
        <Route
          path="/directroom/:roomId"
          element={
            user ? (
              <AuthProvider>
                <DirectRoom roomId={roomId} />
              </AuthProvider>
            ) : (
              <Navigate to="/signin" />
            )
          }
        ></Route>
      </Routes>
      {user ? (
        <div>
          <p>ユーザID: {user.uid}</p>
          <p>ユーザ名: {user.displayName}</p>
        </div>
      ) : (
        <p>ログインしてください</p>
      )}
    </Router>
  );
}

export default App;
