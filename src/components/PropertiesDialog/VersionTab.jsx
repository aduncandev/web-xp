import React from 'react';

/** The Version tab: fixed header rows plus the Item name / Value browser. */
export default function VersionTab({ versionInfo, versionItem, setVersionItem }) {
  return (
    <>
      <div className="pr-row">
        <div className="pr-label">File version:</div>
        <div className="pr-value">{versionInfo.fileVersion}</div>
      </div>
      <div className="pr-row">
        <div className="pr-label">Description:</div>
        <div className="pr-value">{versionInfo.description}</div>
      </div>
      <div className="pr-row">
        <div className="pr-label">Copyright:</div>
        <div className="pr-value">{versionInfo.copyright}</div>
      </div>
      <fieldset className="pr-vergroup">
        <legend>Other version information</legend>
        <div className="pr-vergroup__cols">
          <div className="pr-vercol">
            <div className="pr-vercol__label">Item name:</div>
            <div className="pr-verlist">
              {versionInfo.items.map(([name]) => (
                <div
                  key={name}
                  className={`pr-verlist__row${
                    versionItem === name ? ' selected' : ''
                  }`}
                  onClick={() => setVersionItem(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
          <div className="pr-vercol">
            <div className="pr-vercol__label">Value:</div>
            <div className="pr-vervalue">
              {(versionInfo.items.find(([name]) => name === versionItem) ||
                [])[1] || ''}
            </div>
          </div>
        </div>
      </fieldset>
    </>
  );
}

