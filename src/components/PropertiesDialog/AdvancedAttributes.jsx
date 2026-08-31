import React, { useState } from 'react';

import XPDialogFrame from 'components/XPDialogFrame';
import XPButton from 'components/XPButton';
import { AdvBody } from './styles';

/** XP's Advanced Attributes sheet — the archive/index/compress/encrypt bits.
 *  Faithful but inert: the VFS has no archive bit and no compression flag. */
export default function AdvancedAttributes({ onClose }) {
  const [archive, setArchive] = useState(true);
  const [index, setIndex] = useState(true);
  const [compress, setCompress] = useState(false);
  const [encrypt, setEncrypt] = useState(false);

  return (
    <XPDialogFrame
      title="Advanced Attributes"
      width={330}
      onClose={onClose}
      zIndex={99990}
    >
      <AdvBody>
        <div className="adv-head">
          Choose the settings you want for this file.
        </div>
        <fieldset>
          <legend>Archive and Index attributes</legend>
          <label>
            <input
              type="checkbox"
              checked={archive}
              onChange={() => setArchive(v => !v)}
            />
            File is ready for archiving
          </label>
          <label>
            <input
              type="checkbox"
              checked={index}
              onChange={() => setIndex(v => !v)}
            />
            For fast searching, allow Indexing Service to index this file
          </label>
        </fieldset>
        <fieldset>
          <legend>Compress or Encrypt attributes</legend>
          <label>
            <input
              type="checkbox"
              checked={compress}
              onChange={() => setCompress(v => !v)}
            />
            Compress contents to save disk space
          </label>
          <label>
            <input
              type="checkbox"
              checked={encrypt}
              onChange={() => setEncrypt(v => !v)}
            />
            Encrypt contents to secure data
          </label>
        </fieldset>
        <div className="adv-footer">
          <XPButton onClick={onClose}>OK</XPButton>
          <XPButton onClick={onClose}>Cancel</XPButton>
        </div>
      </AdvBody>
    </XPDialogFrame>
  );
}

