import React, { useRef } from 'react';
import {
  ColumnDivider,
  sumWidths,
  useColumns,
} from '../../../components/ListView';
import {
  displayPath,
  getParentPath,
  formatSize,
} from '../../../context/vfsUtils';
import { getTypeLabel } from './menus';
import { ItemIcon } from './styles';
import { ALL_DETAIL_COLUMNS, fmtDate } from './helpers';

/** One details cell's text, shared by every column set. */
export const detailCellValue = (id, node) => {
  switch (id) {
    case 'size':
      return node.type === 'file' ? formatSize(node.size) : '';
    case 'type':
      return getTypeLabel(node);
    case 'modified':
      return node.type !== 'drive' ? fmtDate(node.modifiedAt) : '';
    case 'location':
      return node.originalPath
        ? displayPath(getParentPath(node.originalPath))
        : '';
    case 'deleted':
      return fmtDate(node.deletedAt);
    case 'packed':
      return node.type === 'file' ? formatSize(node.packedSize || 0) : '';
    case 'password':
      // ZIPFLDR #10079-#10081: the column that shows a password took hold
      return node.type === 'file' ? (node.encrypted ? 'Yes' : 'No') : '';
    case 'ratio': {
      if (node.type !== 'file' || !node.size) return '';
      return `${Math.round((1 - (node.packedSize || 0) / node.size) * 100)}%`;
    }
    default:
      return '';
  }
};

function TilesView({
  items,
  onEmptyContextMenu,
  renderName,
  itemClass,
  itemHandlers,
}) {
  return (
    <div
      className="com__view com__view--tiles"
      onContextMenu={onEmptyContextMenu}
    >
      {items.map(node => (
        <div
          key={node.path}
          className={`com__view-tile${itemClass(node)}`}
          {...itemHandlers(node)}
        >
          <ItemIcon
            node={node}
            src={node.iconLarge || node.icon}
            className="com__view-tile__img"
          />
          <div className="com__view-tile__text">
            <div className="com__view-tile__name">{renderName(node)}</div>
            <div className="com__view-tile__type">{getTypeLabel(node)}</div>
            {node.type === 'file' && node.size != null && (
              <div className="com__view-tile__type">
                {formatSize(node.size)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IconsView({
  items,
  onEmptyContextMenu,
  renderName,
  itemClass,
  itemHandlers,
}) {
  return (
    <div
      className="com__view com__view--icons"
      onContextMenu={onEmptyContextMenu}
    >
      {items.map(node => (
        <div
          key={node.path}
          className={`com__view-icon${itemClass(node)}`}
          {...itemHandlers(node)}
        >
          <ItemIcon
            node={node}
            src={node.iconLarge || node.icon}
            className="com__view-icon__img"
          />
          <div className="com__view-icon__name">{renderName(node)}</div>
        </div>
      ))}
    </div>
  );
}

function ThumbnailsView({
  items,
  onEmptyContextMenu,
  renderName,
  itemClass,
  itemHandlers,
}) {
  return (
    <div
      className="com__view com__view--thumbs"
      onContextMenu={onEmptyContextMenu}
    >
      {items.map(node => (
        <div
          key={node.path}
          className={`com__view-thumb${itemClass(node)}`}
          {...itemHandlers(node)}
        >
          <div className="com__view-thumb__box">
            <ItemIcon node={node} src={node.iconLarge || node.icon} />
          </div>
          <div className="com__view-thumb__name">{renderName(node)}</div>
        </div>
      ))}
    </div>
  );
}

function ListView({
  items,
  onEmptyContextMenu,
  renderName,
  itemClass,
  itemHandlers,
}) {
  return (
    <div
      className="com__view com__view--list"
      onContextMenu={onEmptyContextMenu}
    >
      {items.map(node => (
        <div
          key={node.path}
          className={`com__view-listitem${itemClass(node)}`}
          {...itemHandlers(node)}
        >
          <ItemIcon
            node={node}
            src={node.icon}
            className="com__view-listitem__img"
          />
          {renderName(node)}
        </div>
      ))}
    </div>
  );
}

function DetailsView({
  items,
  columns,
  sortBy,
  sortAsc,
  onHeaderSort,
  onEmptyContextMenu,
  renderName,
  itemClass,
  itemHandlers,
}) {
  const ref = useRef(null);
  const cols = useColumns('explorer.details', ALL_DETAIL_COLUMNS);
  return (
    <div
      className="com__view com__view--details"
      onContextMenu={onEmptyContextMenu}
      ref={ref}
    >
      <table
        className="com__table"
        style={{ width: sumWidths(columns, cols.widths) }}
      >
        <colgroup>
          {columns.map(col => (
            <col key={col.id} style={{ width: cols.widths[col.id] }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.id}
                className={`com__th${col.num ? ' com__th--size' : ''}`}
                onClick={() => onHeaderSort(col.sort)}
              >
                {col.label}
                {sortBy === col.sort && (
                  <i className={`com__sort${sortAsc ? '' : ' com__sort--desc'}`} />
                )}
                <ColumnDivider
                  columnId={col.id}
                  onResize={cols.beginResize}
                  onAutoSize={id => cols.autoSize(id, ref.current)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(node => (
            <tr
              key={node.path}
              className={`com__tr${itemClass(node)}`}
              {...itemHandlers(node)}
            >
              {columns.map(col =>
                col.id === 'name' ? (
                  <td
                    key="name"
                    className={`com__td com__td--name${sortBy === col.sort ? ' com__td--sorted' : ''}`}
                    data-col="name"
                  >
                    <ItemIcon node={node} src={node.icon} />
                    {renderName(node)}
                  </td>
                ) : (
                  <td
                    key={col.id}
                    className={`com__td${col.num ? ' com__td--size' : ''}${sortBy === col.sort ? ' com__td--sorted' : ''}`}
                    data-col={col.id}
                  >
                    {detailCellValue(col.id, node)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VIEWS = {
  thumbnails: ThumbnailsView,
  icons: IconsView,
  list: ListView,
  details: DetailsView,
  tiles: TilesView,
};

/**
 * The folder's contents in the chosen view. `renderName` draws a name or
 * the rename box; `itemClass` and `itemHandlers` come from the window so
 * selection, drag and context menus behave the same in every view.
 */
export function FolderView({ viewMode, items, onEmptyContextMenu, ...rest }) {
  if (items.length === 0) {
    return (
      <div
        className="com__content__empty com__view"
        onContextMenu={onEmptyContextMenu}
      />
    );
  }
  const View = VIEWS[viewMode] || TilesView;
  return (
    <View items={items} onEmptyContextMenu={onEmptyContextMenu} {...rest} />
  );
}
