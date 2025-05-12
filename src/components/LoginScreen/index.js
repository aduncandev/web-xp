// src/components/LoginScreen/index.js
import React, { useState, useEffect } from 'react';
// Assuming your assets folder is at src/assets and jsconfig.json has baseUrl: "src"
import winLoginLogo from 'assets/windowsIcons/xplogo.png'; 
import offIcon from 'assets/windowsIcons/310(32x32).png'; 
import adminAvatar from 'assets/userIcons/dog.bmp'; 
import arrowIcon from 'assets/windowsIcons/290.ico';
import skillzAvatar from 'assets/userIcons/chess.bmp'; 

const LoginScreen = ({ onLogin, userStatus, onInitiateShutdown }) => {
  const [selectedUser, setSelectedUser] = useState(null); 
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const handleAdminClick = () => {
    setSelectedUser('administrator');
    setShowAdminPasswordPrompt(true);
    setAdminPassword(''); 
  };

  const handleSkillzClick = () => {
    setSelectedUser('skillz');
    setShowAdminPasswordPrompt(false); 
    if (onLogin) {
      onLogin(); 
    }
  };

  const handleAdminPasswordSubmit = (e) => {
    e.preventDefault(); 
    console.log("Admin password submitted (no validation):", adminPassword);
    setAdminPassword(''); 
  };
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (showAdminPasswordPrompt && selectedUser === 'administrator') {
        const adminOuterWrapper = event.target.closest('.user-account-outer-wrapper[data-user="administrator"]');
        if (!adminOuterWrapper) {
          setShowAdminPasswordPrompt(false);
          setSelectedUser(null); 
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdminPasswordPrompt, selectedUser]);

  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Tahoma&family=Source+Sans+Pro:wght@300;400;500;600&display=swap');
    .login-screen-body { height: 100vh; width: 100vw; display: flex; flex-direction: column; font-family: 'Tahoma', 'Source Sans Pro', sans-serif; position: fixed; top: 0; left: 0; z-index: 9998; overflow: hidden; background-color: #084DA3; }
    .login-header-bar { min-height: 112px; width: 100%; background-color: #084DA3; position: relative; z-index: 1; flex-shrink: 0; }
    .login-header-bar::before { content: ""; width: 100%; height: 7px; position: absolute; bottom: -2px; left: 0; background: linear-gradient(270deg, #084DA3 -33.4%, #084DA3 6.07%, #FFFFFF 49.56%, #084DA3 82.59%, #084DA3 121.25%); }
    
    .login-main-content { 
      flex-grow: 1; width: 100%; 
      background: radial-gradient(19.48% 42.48% at 10% 22.48%, #9CC0E9 0%, #508FD9 100%); 
      display: grid; 
      grid-template-columns: 1fr auto 1fr; 
      align-items: center; 
      padding: 0 5%; 
      color: white; position: relative; z-index: 0; 
      overflow-y: auto; 
    }
    .login-main-branding { 
        display: flex; justify-content: center; align-items: flex-end; 
        flex-direction: column; text-align: right; padding-right: 20px; 
    }
    .login-main-branding img { width: 150px; margin-bottom: 20px; }
    .login-main-branding h1 { font-family: 'Source Sans Pro', 'Tahoma', sans-serif; font-weight: 500; font-size: 1.3em; margin: 0; }
    .login-vertical-line { 
        width: 2px; height: 70%; 
        align-self: center; 
        background: linear-gradient(180deg, rgba(80, 143, 217, 0.5) 0%, #FFFFFF 47.4%, rgba(80, 143, 217, 0.5) 98.96%); 
    }
    
    .login-users-area {
      padding-left: 20px; 
      display: flex;
      flex-direction: column; 
      justify-content: center; 
      gap: 10px; 
      margin-bottom: 5vh; 
    }

    .user-account-outer-wrapper { 
        display: flex;
        flex-direction: column;
        align-items: flex-start; 
    }

    .user-account-container {
      padding: 8px 12px; 
      width: auto; 
      min-width: 300px; 
      max-width: 420px; 
      border-radius: 8px; 
      display: flex; 
      align-items: center; 
      cursor: pointer;
      position: relative;
      transition: background 0.15s ease-out, border-color 0.15s ease-out, box-shadow 0.15s ease-out, padding-bottom 0.15s ease-out; 
      border: 1px solid transparent; 
    }

    .user-account-container.selected,
    .user-account-container:hover {
      background: linear-gradient(to right, rgba(77, 141, 239, 0.9) 0%, rgba(58, 123, 213, 0.8) 50%, rgba(77, 141, 239, 0.9) 100%);
      border: 1px solid rgba(121, 175, 255, 0.7); 
      box-shadow: 0 0 5px rgba(77, 141, 239, 0.3); 
      padding-bottom: 8px; 
    }
    .user-account-container.selected.admin-password-active {
         padding-bottom: 10px; 
    }

    .user-account-container.selected::before, 
    .user-account-container:hover::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        border-radius: 7px; 
        background: radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.0) 70%);
        pointer-events: none;
        z-index: -1; 
    }

    .user-avatar-icon {
      width: 52px; 
      height: 52px;
      border: 2px solid #FFCC00; 
      border-radius: 4px;
      margin-right: 12px; 
      background-color: #ddd; 
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0; 
      overflow: hidden; 
    }
    .user-avatar-icon img { 
        width: 100%; 
        height: 100%; 
        object-fit: cover; 
    }
     .user-avatar-icon span { 
        font-size: 1.8em; color: #888; 
    }

    .user-details { 
        color: #fff; 
        flex-grow: 1; 
        display: flex; 
        flex-direction: column;
        justify-content: center; 
        min-height: 52px; 
    }
    .user-details h3 { 
        font-family: 'Tahoma', 'Source Sans Pro', sans-serif; 
        font-weight: 600; font-size: 1.15em; 
        margin: 0; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 1px 1px 1px rgba(0,0,0,0.15); 
        line-height: 1.2; 
        padding-bottom: 2px; 
    }
    .user-details p.user-status-text { font-family: 'Tahoma', sans-serif; font-size: 0.75em; margin-top: 2px; opacity: 0.9; color: #D0E0FF; line-height: 1; }
    
    .admin-password-section {
        margin-top: 4px; 
    }
    .admin-password-section p.password-instruction {
        font-family: 'Tahoma', sans-serif;
        font-size: 0.8em; 
        color: #fff;
        margin: 0 0 4px 0; 
        text-shadow: 1px 1px 1px rgba(0,0,0,0.10);
        line-height: 1.1; 
    }
    .admin-password-prompt-container {
      display: flex;
      align-items: center;
      gap: 6px; 
    }
    .admin-password-prompt-container input[type="password"] {
      padding: 4px 7px; 
      border: 1px solid #7F9DB9; 
      border-radius: 0px; 
      background-color: white;
      color: black;
      font-family: 'Tahoma', sans-serif;
      font-size: 0.9em; 
      width: 180px; 
      height: 24px; 
      box-sizing: border-box;
    }
    .admin-password-prompt-container input[type="password"]:focus {
      outline: 1px solid #FFBF47; 
      border-color: #FFBF47;
    }
    .admin-password-prompt-container button { 
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      line-height: 0;
      width: 24px; 
      height: 24px;
    }
    .admin-password-prompt-container button img {
      width: 100%; 
      height: 100%;
      vertical-align: middle;
    }

    .login-footer-bar { 
      min-height: 60px; width: 100%; 
      background-color: #084DA3; 
      position: relative; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 0 15px; 
      z-index: 1;
      flex-shrink: 0; 
    }
    .login-footer-bar::before { content: ""; width: 100%; height: 7px; position: absolute; top: -2px; left: 0; background: linear-gradient(270deg, #084DA3 -33.4%, #084DA3 6.07%, #FF9933 49.56%, #084DA3 82.59%, #084DA3 121.25%); }
    .login-footer-btn-container { display: flex; align-items: center; }
    .login-footer-btn-container button { background: transparent; border: none; padding: 0; width: 32px; height: 32px; cursor: pointer; outline: none; line-height: 0; transition: transform 0.05s ease-in-out, filter 0.05s ease-in-out; }
    .login-footer-btn-container button:active img { transform: translate(1px, 1px); filter: brightness(0.85); }
    .login-footer-btn-container button img { width: 100%; height: 100%; display: block; }
    .login-footer-btn-container p { color: #fff; margin-left: 8px; font-size: 0.9em; font-family: 'Source Sans Pro', 'Tahoma', sans-serif; font-weight: 400; }
    .login-footer-info { color: #fff; font-family: 'Source Sans Pro', 'Tahoma', sans-serif; font-size: 0.75em; text-align: right; letter-spacing: 0.5px; font-weight: 400; line-height: 1.3; }

    /* --- Media Query for Mobile Responsiveness --- */
    @media (max-width: 768px) { 
      .login-header-bar {
        min-height: 50px; 
      }
      .login-main-content {
        grid-template-columns: 1fr; 
        align-content: center; 
        justify-items: center; 
        padding: 15px; 
        gap: 20px; 
      }
      .login-main-branding {
        padding-right: 0; 
        padding-top: 0; 
      }
      .login-main-branding img {
        width: 150px; 
        margin-bottom: 8px;
        margin-right: 20px;
      }
      .login-main-branding h1 {
        font-size: 1.0em; 
      }
      .login-vertical-line { display: none; }
      .login-users-area {
        padding-left: 0; 
        align-items: center; 
        margin-bottom: 0; 
        width: 100%; 
        gap: 15px; 
      }
      .user-account-container {
        min-width: 290px; /* MODIFIED: Slightly increased min-width */
        width: auto; 
        max-width: 90%; /* MODIFIED: Allow it to be a bit wider */
        padding: 10px 15px; /* MODIFIED: Increased padding for more space */
      }
      /* MODIFIED: Ensure highlight expands for password prompt on mobile */
      .user-account-container.selected.admin-password-active {
          padding-bottom: 18px; /* MODIFIED: Increased padding to ensure prompt fits well */
      }
      .user-avatar-icon {
          width: 48px; 
          height: 48px;
          margin-right: 10px;
      }
      .user-details h3 {
          font-size: 1.05em; 
      }
      .admin-password-section {
          margin-top: 6px; /* MODIFIED: More space above password section */
      }
      .admin-password-prompt-container input[type="password"] {
        width: 180px; /* MODIFIED: Increased width for better usability */
        height: 28px; /* MODIFIED: Increased height */
        font-size: 1em; /* MODIFIED: Larger font */
      }

      .login-footer-bar {
        flex-direction: row; 
        justify-content: center; /* MODIFIED: Center the button and text */
        min-height: 55px; /* MODIFIED: Slightly taller footer */
        padding: 8px 10px; 
        gap: 10px; 
      }
      .login-footer-btn-container {
        order: 0; 
        margin-bottom: 0; 
      }
       .login-footer-btn-container p {
         font-size: 1.2em; /* MODIFIED: Larger text */
       }
       .login-footer-btn-container button {
            width: 45px; /* MODIFIED: Larger power button */
            height: 45px;
       }
       .login-footer-btn-container button img {
            width: 30px; /* MODIFIED: Larger icon in button */
            height: 30px;
       }
      .login-footer-info {
        display: none; /* MODIFIED: Hide on mobile as requested */
      }
    }
    /* Removed the second media query for max-width: 480px as requested */
  `;

  return (
    <>
      <style>{style}</style>
      <div className="login-screen-body">
        <div className="login-header-bar"></div>
        <div className="login-main-content">
          <div className="login-main-branding">
            <img src={winLoginLogo} alt="Windows Logo" onError={(e) => e.target.src='https://placehold.co/150x60/transparent/FFFFFF?text=WindowsXP'} />
            <h1>To begin, click your user name</h1>
          </div>
          <div className="login-vertical-line"></div>
          <div className="login-users-area">
            {/* Administrator User Section */}
            <div className="user-account-outer-wrapper" data-user="administrator"> 
              <div 
                className={`user-account-container ${selectedUser === 'administrator' ? 'selected admin-password-active' : ''}`}
                onClick={handleAdminClick} 
                title="Administrator"
              >
                <div className="user-avatar-icon">
                  <img src={adminAvatar} alt="Admin" onError={(e) => e.target.innerHTML = '<span>A</span>'} />
                </div>
                <div className="user-details">
                  <h3>Administrator</h3>
                  {showAdminPasswordPrompt && selectedUser === 'administrator' && (
                    <div className="admin-password-section">
                      <p className="password-instruction">Type your password</p>
                      <form onSubmit={handleAdminPasswordSubmit} className="admin-password-prompt-container">
                        <input 
                          type="password" 
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          autoFocus
                        />
                        <button type="submit" title="OK">
                          <img src={arrowIcon} alt="OK" onError={(e) => e.target.style.display='none'}/>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Skillz User Section */}
            <div className="user-account-outer-wrapper" data-user="skillz">
              <div 
                className={`user-account-container ${selectedUser === 'skillz' ? 'selected' : ''}`}
                onClick={handleSkillzClick} 
                title="Click to log in as skillz"
              >
                <div className="user-avatar-icon">
                  <img src={skillzAvatar} alt="Skillz" onError={(e) => e.target.innerHTML = '<span>S</span>'} />
                </div>
                <div className="user-details">
                  <h3>Skillz</h3> {/* Capitalized Skillz */}
                  {userStatus === 'loggedInInBackground' && (
                    <p className="user-status-text">Logged on</p>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        </div>
        <div className="login-footer-bar">
          <div className="login-footer-btn-container">
            <button onClick={onInitiateShutdown} title="Turn off computer">
              <img src={offIcon} alt="Turn off" onError={(e) => { e.target.style.display='none'; }} />
            </button>
            <p>Turn off computer</p>
          </div>
          <div className="login-footer-info">
            <p>After you log on, you can add or change accounts</p>
            <p>Just go to your Control Panel and click User Accounts</p>
          </div>
        </div>
      </div>
    </>
  );
};
export default LoginScreen;
