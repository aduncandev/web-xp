import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';

import { getIconForNode } from '../../../context/vfsConstants';
import { formatFileSize, getFileTypeDisplay, formatDate } from '../../../context/vfsUtils';

/**
 * XP-style Properties dialog for files and folders.
 * Shows filename, type, location, size, created/modified dates.
 */
export default function PropertiesDialog({ node, onClose }) {
  if (!node) return null;

  const icon = getIconForNode(node);
  const typeStr = getFileTypeDisplay(node);
  const location = node.path
    ? node.path.slice(0, node.path.lastIndexOf('/')) || 'C:/'
    : '';

  return ReactDOM.createPortal(
    <Overlay onClick={onClose}>
      <Dialog onClick={e => e.stopPropagation()}>
        <TitleBar>
          <span>{node.name} Properties</span>
          <CloseBtn onClick={onClose}>&times;</CloseBtn>
        </TitleBar>
        <TabBar>
          <Tab $active>General</Tab>
        </TabBar>
        <Body>
          <Row className="header-row">
            <img src={icon} alt="" className="prop-icon" />
            <span className="prop-filename">{node.name}</span>
          </Row>
          <Separator />
          <Row>
            <Label>Type of file:</Label>
            <Value>{typeStr}</Value>
          </Row>
          {node.type === 'shortcut' && node.target && (
            <Row>
              <Label>Target:</Label>
              <Value>{node.target}</Value>
            </Row>
          )}
          <Row>
            <Label>Location:</Label>
            <Value>{location}</Value>
          </Row>
          {node.type === 'file' && (
            <Row>
              <Label>Size:</Label>
              <Value>
                {formatFileSize(node.size || 0)}
                {node.size > 1024 && (
                  <span className="prop-bytes"> ({(node.size || 0).toLocaleString()} bytes)</span>
                )}
              </Value>
            </Row>
          )}
          <Separator />
          <Row>
            <Label>Created:</Label>
            <Value>{formatDate(node.createdAt)}</Value>
          </Row>
          <Row>
            <Label>Modified:</Label>
            <Value>{formatDate(node.modifiedAt)}</Value>
          </Row>
          {node.mimeType && (
            <>
              <Separator />
              <Row>
                <Label>MIME type:</Label>
                <Value>{node.mimeType}</Value>
              </Row>
            </>
          )}
        </Body>
        <Footer>
          <button className="prop-btn" onClick={onClose}>OK</button>
          <button className="prop-btn" onClick={onClose}>Cancel</button>
        </Footer>
      </Dialog>
    </Overlay>,
    document.body,
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: transparent;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Dialog = styled.div`
  background: #ece9d8;
  border: 2px solid #0054e3;
  border-radius: 4px;
  width: 370px;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
`;

const TitleBar = styled.div`
  background: linear-gradient(to right, #0058ee, #3593ff);
  color: white;
  font-weight: bold;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 2px 2px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  &:hover { background: rgba(255,255,255,0.2); border-radius: 2px; }
`;

const TabBar = styled.div`
  display: flex;
  padding: 4px 4px 0;
  border-bottom: 1px solid #aca899;
`;

const Tab = styled.div`
  padding: 3px 12px;
  border: 1px solid ${({ $active }) => $active ? '#aca899' : 'transparent'};
  border-bottom: ${({ $active }) => $active ? '1px solid #ece9d8' : '1px solid #aca899'};
  border-radius: 3px 3px 0 0;
  margin-bottom: -1px;
  background: ${({ $active }) => $active ? '#ece9d8' : 'transparent'};
  cursor: pointer;
  font-weight: ${({ $active }) => $active ? 'bold' : 'normal'};
`;

const Body = styled.div`
  padding: 12px 16px;

  .header-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .prop-icon {
    width: 32px;
    height: 32px;
  }
  .prop-filename {
    font-weight: bold;
    font-size: 12px;
    word-break: break-all;
  }
  .prop-bytes {
    color: #808080;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: baseline;
  margin-bottom: 4px;
  line-height: 1.5;
`;

const Label = styled.span`
  width: 90px;
  flex-shrink: 0;
  color: #000;
`;

const Value = styled.span`
  color: #000;
  word-break: break-all;
`;

const Separator = styled.hr`
  border: none;
  border-top: 1px solid #d3d3d3;
  margin: 8px 0;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px 12px;
  border-top: 1px solid #d3d3d3;

  .prop-btn {
    min-width: 75px;
    padding: 2px 12px;
    font-family: Tahoma, 'Noto Sans', sans-serif;
    font-size: 11px;
    background: #ece9d8;
    border: 1px solid #003c74;
    border-radius: 3px;
    cursor: pointer;
    &:hover { background: #d4d0c8; }
    &:active { background: #c0bcb0; }
    &:focus { outline: 1px dotted #000; outline-offset: -3px; }
  }
`;
