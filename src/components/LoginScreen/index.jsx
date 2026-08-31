import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

import winLoginLogo from 'assets/windowsIcons/xplogo.png';
import offIcon from 'assets/windowsIcons/310(32x32).png';
import adminAvatar from 'assets/userIcons/dog.bmp';
import arrowIcon from 'assets/windowsIcons/290.ico';
import skillzAvatar from 'assets/userIcons/skillz.bmp';
import errorIcon from 'assets/windowsIcons/897(16x16).png';

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  font-family: 'Tahoma', 'Source Sans Pro', sans-serif;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9998;
  overflow: hidden;
  background-color: #00309c;
`;

const HeaderBar = styled.div`
  min-height: 112px;
  width: 100%;
  background-color: #00309c;
  position: relative;
  z-index: 1;
  flex-shrink: 0;

  &::before {
    content: '';
    width: 100%;
    height: 7px;
    position: absolute;
    bottom: -2px;
    left: 0;
    background: linear-gradient(
      270deg,
      #00309c -33.4%,
      #00309c 6.07%,
      #ffffff 49.56%,
      #00309c 82.59%,
      #00309c 121.25%
    );
  }

  @media (max-width: 768px) {
    min-height: 50px;
  }
`;

const MainContent = styled.div`
  flex-grow: 1;
  width: 100%;
  background: radial-gradient(
    19.48% 42.48% at 10% 22.48%,
    #9cc0e9 0%,
    #5a7edc 100%
  );
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 5%;
  color: white;
  position: relative;
  z-index: 0;
  overflow-y: auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    align-content: center;
    justify-items: center;
    padding: 15px;
    gap: 20px;
  }
`;

const Branding = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  flex-direction: column;
  text-align: right;
  padding-right: 20px;

  img {
    width: 150px;
    margin-bottom: 20px;
  }
  h1 {
    font-family: 'Source Sans Pro', 'Tahoma', sans-serif;
    font-weight: 800;
    font-size: 1.3em;
    margin: 0;
  }

  @media (max-width: 768px) {
    padding-right: 0;
    padding-top: 0;
    align-items: center;
    text-align: center;
    img {
      margin-bottom: 8px;
    }
    h1 {
      font-size: 1em;
    }
  }
`;

const VerticalLine = styled.div`
  width: 2px;
  height: 70%;
  align-self: center;
  background: linear-gradient(
    180deg,
    #5a7edc 0%,
    rgba(255, 255, 255, 0.59) 47.4%,
    #5a7edc 98.96%
  );

  @media (max-width: 768px) {
    display: none;
  }
`;

const UsersArea = styled.div`
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  margin-bottom: 5vh;

  @media (max-width: 768px) {
    padding-left: 0;
    align-items: center;
    margin-bottom: 0;
    width: 100%;
    gap: 15px;
  }
`;

const UserCard = styled.div`
  padding: 8px 12px;
  width: auto;
  min-width: 300px;
  max-width: 420px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease-out, box-shadow 0.15s ease-out,
    padding-bottom 0.15s ease-out;

  background: ${props =>
    props.selected
      ? 'linear-gradient(to right, #00309C 30%, #5A7EDC 90%, #5A7EDC 100%)'
      : 'transparent'};
  padding-bottom: ${props =>
    props.selected ? (props.adminActive ? '10px' : '8px') : '8px'};

  &:hover {
    background: linear-gradient(
      to right,
      #00309c 30%,
      #5a7edc 90%,
      #5a7edc 100%
    );
    padding-bottom: 8px;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 7px;
    background: radial-gradient(
      ellipse at 30% 40%,
      rgba(255, 255, 255, 0.25) 0%,
      rgba(255, 255, 255, 0) 70%
    );
    pointer-events: none;
    z-index: -1;
    opacity: ${props => (props.selected ? 1 : 0)};
  }
  &:hover::before {
    opacity: 1;
  }

  @media (max-width: 768px) {
    min-width: 290px;
    max-width: 90%;
    padding: 10px 15px;
  }
`;

const AvatarIcon = styled.div`
  width: 52px;
  height: 52px;
  border: 3px solid
    ${props => (props.selected ? '#FFCC00' : 'rgba(222, 222, 222, 0.8)')};
  border-radius: 4px;
  margin-right: 12px;
  background-color: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  transition: border-color 0.15s ease-out;

  ${UserCard}:hover & {
    border-color: #ffcc00;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserDetails = styled.div`
  color: #fff;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 52px;

  h3 {
    font-family: 'Tahoma', 'Source Sans Pro', sans-serif;
    font-weight: 600;
    font-size: 1.15em;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.15);
    line-height: 1.2;
    padding-bottom: 2px;
  }

  p {
    font-family: 'Tahoma', sans-serif;
    font-size: 0.8em;
    margin-top: 2px;
    opacity: 1;
    color: ${props => (props.selected ? '#FFFFFF' : '#00309C')};
    line-height: 1;
    font-weight: 600;
    transition: color 0.15s ease-out;
  }

  ${UserCard}:hover & p {
    color: #ffffff;
  }
`;

const PasswordSection = styled.div`
  margin-top: 4px;
  position: relative;

  .instruction {
    font-family: 'Tahoma', sans-serif;
    font-size: 0.8em;
    color: #fff;
    margin: 0 0 4px 0;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
    line-height: 1.1;
  }

  form {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  input {
    padding: 4px 7px;
    border: 1px solid #7f9db9;
    background-color: white;
    color: black;
    font-family: 'Tahoma', sans-serif;
    font-size: 0.9em;
    width: 180px;
    height: 24px;
    box-sizing: border-box;

    &:focus {
      outline: 1px solid #ffbf47;
      border-color: #ffbf47;
    }
  }

  button {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    line-height: 0;
    width: 24px;
    height: 24px;

    img {
      width: 100%;
      height: 100%;
    }
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Tooltip = styled.div`
  position: absolute;
  top: 60px; /* Position below the input */
  left: -20px;
  width: 260px;
  background-color: #ffffe1;
  border: 1px solid black;
  border-radius: 5px;
  padding: 8px 10px;
  z-index: 100;
  box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: black;
  animation: ${fadeIn} 0.2s ease-out;

  &:before {
    content: '';
    position: absolute;
    top: -11px;
    left: 45px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 11px 11px 11px;
    border-color: transparent transparent black transparent;
  }

  &:after {
    content: '';
    position: absolute;
    top: -10px;
    left: 46px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 10px 10px 10px;
    border-color: transparent transparent #ffffe1 transparent;
  }

  .tooltip-icon {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .tooltip-content {
    font-family: 'Tahoma', sans-serif;
    font-size: 11px;
    line-height: 1.3;

    strong {
      display: block;
      margin-bottom: 4px;
      font-weight: 700;
    }
  }
`;

const FooterBar = styled.div`
  min-height: 112px;
  width: 100%;
  background-color: #00309c;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 15px;
  z-index: 1;
  flex-shrink: 0;

  &::before {
    content: '';
    width: 100%;
    height: 7px;
    position: absolute;
    top: -2px;
    left: 0;
    background: linear-gradient(
      270deg,
      #00309c -33.4%,
      #00309c 6.07%,
      #ff9933 49.56%,
      #00309c 82.59%,
      #00309c 121.25%
    );
  }

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: center;
    min-height: 55px;
    padding: 8px 10px;
    gap: 10px;
  }
`;

const FooterBtn = styled.div`
  display: flex;
  align-items: center;

  button {
    background: transparent;
    border: none;
    padding: 0;
    width: 32px;
    height: 32px;
    cursor: pointer;
    outline: none;
    transition: transform 0.05s ease-in-out, filter 0.05s ease-in-out;

    &:active {
      transform: translate(1px, 1px);
      filter: brightness(0.85);
    }

    img {
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  p {
    color: #fff;
    margin-left: 8px;
    font-size: 1.2em;
    font-family: 'Source Sans Pro', 'Tahoma', sans-serif;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    button {
      width: 45px;
      height: 45px;
    }
  }
`;

const FooterInfo = styled.div`
  color: #fff;
  font-family: 'Source Sans Pro', 'Tahoma', sans-serif;
  font-size: 0.75em;
  text-align: right;
  letter-spacing: 0.5px;
  font-weight: 600;
  line-height: 1.3;

  @media (max-width: 768px) {
    display: none;
  }
`;

const LoginScreen = ({ onLogin, userStatus, onInitiateShutdown }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showError, setShowError] = useState(false);

  const handleAdminClick = e => {
    e.stopPropagation();
    if (selectedUser === 'administrator') return;
    setSelectedUser('administrator');
    setShowAdminPasswordPrompt(true);
    setAdminPassword('');
    setShowError(false);
  };

  const handleSkillzClick = e => {
    e.stopPropagation();
    setSelectedUser('skillz');
    setShowAdminPasswordPrompt(false);
    if (onLogin) onLogin();
  };

  const handleAdminPasswordSubmit = e => {
    e.preventDefault();
    if (adminPassword === 'ILoveFemboys') {
      if (onLogin) onLogin();
    } else {
      setAdminPassword('');
      setShowError(true);
    }
  };

  const handlePasswordChange = e => {
    setAdminPassword(e.target.value);
    if (showError) setShowError(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (showAdminPasswordPrompt && selectedUser === 'administrator') {
        const adminWrapper = event.target.closest(
          '[data-user="administrator"]',
        );
        if (!adminWrapper) {
          setShowAdminPasswordPrompt(false);
          setSelectedUser(null);
          setAdminPassword('');
          setShowError(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAdminPasswordPrompt, selectedUser]);

  return (
    <Container>
      <HeaderBar />
      <MainContent>
        <Branding>
          <img
            src={winLoginLogo}
            alt="Windows Logo"
            onError={e => (e.target.style.opacity = 0)}
          />
          <h1>To begin, click your user name</h1>
        </Branding>
        <VerticalLine />
        <UsersArea>
          {/* Administrator */}
          <div data-user="administrator">
            <UserCard
              selected={selectedUser === 'administrator'}
              adminActive={showAdminPasswordPrompt}
              onClick={handleAdminClick}
            >
              <AvatarIcon selected={selectedUser === 'administrator'}>
                <img
                  src={adminAvatar}
                  alt="Admin"
                  onError={e => {
                    e.target.style.display = 'none';
                    e.target.parentNode.style.backgroundColor = '#888';
                    e.target.parentNode.innerText = 'A';
                    e.target.parentNode.style.color = 'white';
                    e.target.parentNode.style.fontSize = '24px';
                    e.target.parentNode.style.fontWeight = 'bold';
                  }}
                />
              </AvatarIcon>
              <UserDetails selected={selectedUser === 'administrator'}>
                <h3>Administrator</h3>
                {showAdminPasswordPrompt && selectedUser === 'administrator' && (
                  <PasswordSection>
                    <p className="instruction">Type your password</p>
                    <form onSubmit={handleAdminPasswordSubmit}>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={handlePasswordChange}
                        autoFocus
                      />
                      <button type="submit" title="OK">
                        <img src={arrowIcon} alt="OK" />
                      </button>
                    </form>
                    {showError && (
                      <Tooltip onClick={() => setShowError(false)}>
                        <img
                          className="tooltip-icon"
                          src={errorIcon}
                          alt="Error"
                        />
                        <div className="tooltip-content">
                          <strong>Did you forget your password?</strong>
                          Please type your password again.
                          <br />
                          Be sure to use the correct uppercase and lowercase
                          letters.
                        </div>
                      </Tooltip>
                    )}
                  </PasswordSection>
                )}
              </UserDetails>
            </UserCard>
          </div>

          {/* Skillz */}
          <div data-user="skillz">
            <UserCard
              selected={selectedUser === 'skillz'}
              onClick={handleSkillzClick}
            >
              <AvatarIcon selected={selectedUser === 'skillz'}>
                <img
                  src={skillzAvatar}
                  alt="Skillz"
                  onError={e => {
                    e.target.style.display = 'none';
                    e.target.parentNode.style.backgroundColor = '#888';
                    e.target.parentNode.innerText = 'S';
                    e.target.parentNode.style.color = 'white';
                    e.target.parentNode.style.fontSize = '24px';
                    e.target.parentNode.style.fontWeight = 'bold';
                  }}
                />
              </AvatarIcon>
              <UserDetails selected={selectedUser === 'skillz'}>
                <h3>Skillz</h3>
                {userStatus === 'loggedInInBackground' && <p>Logged on</p>}
              </UserDetails>
            </UserCard>
          </div>
        </UsersArea>
      </MainContent>
      <FooterBar>
        <FooterBtn>
          <button onClick={onInitiateShutdown} title="Turn off computer">
            <img src={offIcon} alt="Turn off" />
          </button>
          <p>Turn off computer</p>
        </FooterBtn>
        <FooterInfo>
          <p>After you log on, you can add or change accounts</p>
          <p>Just go to your Control Panel and click User Accounts</p>
        </FooterInfo>
      </FooterBar>
    </Container>
  );
};

export default LoginScreen;
