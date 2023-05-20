import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const Profile = () => {
  const [displayName, setDisplayName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [previewIconUrl, setPreviewIconUrl] = useState("");
  const [email, setEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForPassword, setCurrentPasswordForPassword] =
    useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (auth.currentUser) {
      setEmail(auth.currentUser.email);
      setDisplayName(auth.currentUser.displayName);
      fetchUserData(auth.currentUser.uid);
    }
  }, []);

  const fetchUserData = async (uid) => {
    const userDocRef = doc(db, "users", uid);
    const userDocData = await getDoc(userDocRef);
    setIconUrl(userDocData.data().iconUrl);
    setPreviewIconUrl(userDocData.data().iconUrl);
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    try {
      let newIconUrl = iconUrl;
      if (iconFile) {
        newIconUrl = await handleIconUpload(iconFile);
      }

      // Save the new display name and photo URL to Firebase Authentication.
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL: newIconUrl,
      });

      // Also save the photo URL to Firestore.
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, { name: displayName, iconUrl: newIconUrl });

      console.log("Profile updated!");

      // Fetch user data again after successful profile update
      fetchUserData(auth.currentUser.uid);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPasswordForEmail
      );

      // Re-authenticate the user.
      await reauthenticateWithCredential(user, credential);

      // Update the email.
      await updateEmail(user, newEmail);

      console.log("Email updated!");

      // Fetch user data again after successful email update
      fetchUserData(user.uid);
    } catch (error) {
      console.error("Error updating email:", error);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    try {
      if (newPassword !== confirmPassword) {
        console.error("New passwords do not match.");
        return;
      }

      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPasswordForPassword
      );

      // Re-authenticate the user.
      await reauthenticateWithCredential(user, credential);

      // Update the password.
      await updatePassword(user, newPassword);

      console.log("Password updated!");

      // Fetch user data again after successful password update
      fetchUserData(user.uid);
    } catch (error) {
      console.error("Error updating password:", error);
    }
  };

  const handleIconFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIconFile(file);

      // Update the preview icon URL to reflect the new file.
      setPreviewIconUrl(URL.createObjectURL(file));
    }
  };

  const handleIconUpload = async (file) => {
    try {
      const fileRef = ref(storage, `icons/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error("Error uploading icon:", error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmitProfile}>
        <h2>Edit Profile</h2>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display Name"
        />
        {previewIconUrl && (
          <img
            src={previewIconUrl}
            alt="Icon Preview"
            style={{ width: "100px", height: "100px", objectFit: "cover" }}
          />
        )}
        <input type="file" onChange={handleIconFileChange} />
        <button type="submit">Save Profile</button>
      </form>

      <form onSubmit={handleSubmitEmail}>
        <h2>Change Email</h2>
        <p>Current Email: {email}</p>
        <input
          type="password"
          value={currentPasswordForEmail}
          onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
          placeholder="Current Password"
        />
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="New Email"
        />
        <button type="submit">Change Email</button>
      </form>

      <form onSubmit={handleSubmitPassword}>
        <h2>Change Password</h2>
        <input
          type="password"
          value={currentPasswordForPassword}
          onChange={(e) => setCurrentPasswordForPassword(e.target.value)}
          placeholder="Current Password"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New Password"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm New Password"
        />
        <button type="submit">Change Password</button>
      </form>
    </div>
  );
};

export default Profile;
