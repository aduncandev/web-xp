import React, { useState } from 'react';
import styled from 'styled-components';

import placeholderLeftImage from 'assets/windowsIcons/tourimage.png';

function AboutMe({ onClose }) {
  const [activeSection, setActiveSection] = useState('initial');
  const [selectedOption, setSelectedOption] = useState(null);

  const sections = {
    skills: {
      id: 'skills',
      label: 'My Skills',
      title: 'My Skills',
      content: (
        <>
          <p>Here's a list of my skills:</p>
          <ul>
            <li>uhh...</li>
            <li>i dont really know yet</li>
          </ul>
        </>
      ),
    },
    projects: {
      id: 'projects',
      label: 'My Projects',
      title: 'My Projects',
      content: (
        <>
          <p>Check out some of my projects:</p>
          <ul>
            <li>
              <strong>Something or another:</strong> Maybe I'm working on
              something...
            </li>
          </ul>
        </>
      ),
    },
    contact: {
      id: 'contact',
      label: 'Contact Me',
      title: 'Contact Me',
      content: (
        <>
          <p>You can reach me through the following channels:</p>
          <ul>
            <li>Email: skillzdevs@proton.me</li>
            <li>Discord: skillzdev</li>
            <li>GitHub: github.com/skillz808</li>
          </ul>
        </>
      ),
    },
  };

  const handleOptionSelect = optionId => {
    setSelectedOption(optionId);
  };

  const handleNext = () => {
    if (selectedOption) {
      setActiveSection(selectedOption);
    }
  };

  const handleBack = () => {
    if (activeSection !== 'initial') {
      setActiveSection('initial');
    }
  };

  const renderRightPanelContent = () => {
    if (activeSection === 'initial') {
      return (
        <InitialSelectionView>
          <h2>Welcome to the About Me Section!</h2>
          <p>Please select an option below and click Next.</p>
          <OptionGroup>
            {Object.values(sections).map(option => (
              <RadioButtonLabel key={option.id}>
                <input
                  type="radio"
                  name="aboutMeOption"
                  value={option.id}
                  checked={selectedOption === option.id}
                  onChange={() => handleOptionSelect(option.id)}
                />
                <span className="radio-custom"></span>
                {option.label}
              </RadioButtonLabel>
            ))}
          </OptionGroup>
        </InitialSelectionView>
      );
    }

    const currentSectionDetails = sections[activeSection];
    if (currentSectionDetails) {
      return (
        <SectionDetailView>
          <HeaderBar>
            <h2>{currentSectionDetails.title}</h2>
          </HeaderBar>
          <ContentArea>{currentSectionDetails.content}</ContentArea>
        </SectionDetailView>
      );
    }
    return null;
  };

  return (
    <AppWindow>
      <MainContentArea>
        <LeftPanel>
          <img src={placeholderLeftImage} alt="About me visual" />
        </LeftPanel>
        <RightPanel>{renderRightPanelContent()}</RightPanel>
      </MainContentArea>
      <BottomControls>
        <DialogButton
          onClick={handleBack}
          disabled={activeSection === 'initial'}
        >
          &lt; Back
        </DialogButton>
        <DialogButton
          onClick={handleNext}
          disabled={!selectedOption || activeSection !== 'initial'}
        >
          Next &gt;
        </DialogButton>
        <DialogButton onClick={onClose}>Cancel</DialogButton>
      </BottomControls>
    </AppWindow>
  );
}

const AppWindow = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #ece9d8;
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  color: #000;
  overflow: hidden;
`;

const MainContentArea = styled.div`
  display: flex;
  flex-grow: 1;
  overflow: hidden;
`;

const LeftPanel = styled.div`
  width: 170px;
  background-color: #f0f0f0;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  border-right: 1px solid #aca899;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const RightPanel = styled.div`
  flex: 1;
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: #ece9d8;

  h2 {
    font-size: 1.1em;
    color: #000000;
    margin-top: 0;
    margin-bottom: 12px;
    font-weight: bold;
  }

  p {
    line-height: 1.5;
    margin-bottom: 10px;
  }

  ul {
    list-style-position: inside;
    padding-left: 5px;
    margin-bottom: 15px;
  }

  li {
    margin-bottom: 5px;
  }
`;

const InitialSelectionView = styled.div`
  text-align: left;
  width: 100%;
  padding-top: 10px;
  h2 {
    margin-bottom: 8px;
    font-size: 1.2em;
  }
  p {
    margin-bottom: 20px;
  }
`;

const OptionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RadioButtonLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 11px;
  padding: 5px 0;

  input[type='radio'] {
    opacity: 0;
    width: 0;
    height: 0;
    margin: 0;
  }

  .radio-custom {
    width: 13px;
    height: 13px;
    border: 1px solid #3f8f2e;
    border-radius: 50%;
    margin-right: 8px;
    display: inline-block;
    position: relative;
    background-color: #fff;
    box-shadow: inset 1px 1px 1px rgba(0, 0, 0, 0.1);
  }

  input[type='radio']:checked + .radio-custom::after {
    content: '';
    width: 7px;
    height: 7px;
    background-color: #3f8f2e;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  input[type='radio']:focus + .radio-custom {
    outline: 1px dotted #000;
    outline-offset: 1px;
  }
`;

const SectionDetailView = styled.div`
  width: 100%;
`;

const HeaderBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #aca899;
  h2 {
    margin-bottom: 0;
  }
`;

const ContentArea = styled.div``;

const BottomControls = styled.div`
  flex-shrink: 0;
  height: 45px;
  background-color: #ece9d8;
  border-top: 1px solid #aca899;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px;
  gap: 6px;
`;

const DialogButton = styled.button`
  font-family: 'Tahoma', sans-serif;
  font-size: 11px;
  min-width: 75px;
  height: 23px;
  padding: 0 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #000;
  background-color: #f0f0f0;
  box-shadow: inset 1px 1px 0px #ffffff, inset -1px -1px 0px #808080;
  color: #000;
  cursor: pointer;
  user-select: none;

  &:hover {
    border-color: #0078d7;
  }

  &:active {
    background-color: #e0e0e0;
    box-shadow: inset -1px -1px 0px #ffffff, inset 1px 1px 0px #808080;
    padding-top: 1px;
    padding-bottom: 0;
  }

  &:disabled {
    color: #808080;
    box-shadow: inset 1px 1px 0px #ffffff, inset -1px -1px 0px #b0b0b0;
    cursor: default;
    border-color: #a0a0a0;
  }

  &:focus {
    outline: 1px dotted #000000;
    outline-offset: -4px;
  }
`;
export default AboutMe;
