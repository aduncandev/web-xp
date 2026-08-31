import React from 'react';

import XPButton from 'components/XPButton';
import { EDITABLE_TAGS } from '../../context/tagOverrides';
import { SUMMARY_FIELDS } from './helpers';

import documentIcon from 'assets/windowsIcons/308(16x16).png';

/**
 * The Summary tab: the Advanced property/value listing when the file has
 * readable metadata, otherwise the Simple editable fields — document fields
 * for ordinary files, the media tag set for tagged media.
 */
export default function SummaryTab({
  metadata,
  summaryAdvanced,
  setSummaryAdvanced,
  isMediaFile,
  tagValues,
  setTagValues,
  summary,
  setSummary,
  touch,
}) {
  return (
    <>
      {summaryAdvanced && metadata ? (
        <div className="pr-props">
          <div className="pr-props-head">
            <span className="pr-props-col pr-props-col--name">Property</span>
            <span className="pr-props-col">Value</span>
          </div>
          <div className="pr-props-body">
            {metadata.sections.map(section => (
              <div key={section.label}>
                <div className="pr-props-section">{section.label}</div>
                {section.rows.map(([name, value]) => (
                  <div key={name} className="pr-props-row">
                    <span className="pr-props-col pr-props-col--name">
                      <img src={documentIcon} alt="" />
                      {name}
                    </span>
                    <span className="pr-props-col">{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="pr-summary">
          {(isMediaFile ? EDITABLE_TAGS : SUMMARY_FIELDS).map(f => (
            <div key={f.key} className="pr-row">
              <div className="pr-label">
                {isMediaFile ? `${f.label}:` : f.label}
              </div>
              <input
                className="pr-field"
                value={(isMediaFile ? tagValues : summary)[f.key] || ''}
                onChange={e => {
                  const { value } = e.target;
                  if (isMediaFile)
                    setTagValues(v => ({ ...v, [f.key]: value }));
                  else setSummary(v => ({ ...v, [f.key]: value }));
                  touch();
                }}
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      )}
      <div className="pr-btnrow">
        <XPButton
          disabled={!metadata}
          onClick={() => setSummaryAdvanced(v => !v)}
        >
          {summaryAdvanced ? '<< Simple' : 'Advanced >>'}
        </XPButton>
      </div>
    </>
  );
}

