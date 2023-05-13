import React from 'react'
import {Link} from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  return (
    <nav>
      <Link to="/">ホーム</Link>
      <Link to="/signup">サインアップ</Link>
      <Link to="/signin">サインイン</Link>
      <Link to="/signout">サインアウト</Link>
      <Link to="/chatlist">チャットリスト</Link>
      <Link to="/rooms">ルーム</Link>
      <Link to="/directroom">ダイレクトルーム</Link>
      <Link to="/profile">プロフィール</Link>
    </nav>
  )
}

export default Navbar
