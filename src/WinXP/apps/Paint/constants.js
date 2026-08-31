// Classic MS Paint 28-color palette, two rows of fourteen
export const DEFAULT_PALETTE = [
  '#000000',
  '#808080',
  '#800000',
  '#808000',
  '#008000',
  '#008080',
  '#000080',
  '#800080',
  '#808040',
  '#004040',
  '#0080FF',
  '#004080',
  '#8000FF',
  '#804000',
  '#FFFFFF',
  '#C0C0C0',
  '#FF0000',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#0000FF',
  '#FF00FF',
  '#FFFF80',
  '#00FF80',
  '#80FFFF',
  '#8080FF',
  '#FF0080',
  '#FF8040',
];

// Toolbox order matches the glyph strip (sixteen 16x16 glyphs left to right)
export const TOOLS = [
  { id: 'freeform', name: 'Free-Form Select' },
  { id: 'select', name: 'Select' },
  { id: 'eraser', name: 'Eraser/Color Eraser' },
  { id: 'fill', name: 'Fill With Color' },
  { id: 'picker', name: 'Pick Color' },
  { id: 'magnifier', name: 'Magnifier' },
  { id: 'pencil', name: 'Pencil' },
  { id: 'brush', name: 'Brush' },
  { id: 'airbrush', name: 'Airbrush' },
  { id: 'text', name: 'Text' },
  { id: 'line', name: 'Line' },
  { id: 'curve', name: 'Curve' },
  { id: 'rect', name: 'Rectangle' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'ellipse', name: 'Ellipse' },
  { id: 'rounded', name: 'Rounded Rectangle' },
];

export const DEFAULT_SIZE = { w: 512, h: 384 };
export const UNDO_LEVELS = 12;

export const OPEN_FILTERS = [
  {
    label: 'All Picture Files',
    extensions: ['.bmp', '.dib', '.png', '.jpg', '.jpeg', '.gif', '.ico'],
  },
  { label: 'Bitmap Files (*.bmp;*.dib)', extensions: ['.bmp', '.dib'] },
  { label: 'PNG (*.png)', extensions: ['.png'] },
  { label: 'All Files (*.*)', extensions: null },
];

export const SAVE_FILTERS = [
  { label: '24-bit Bitmap (*.bmp;*.dib)', extensions: ['.bmp', '.dib'] },
  { label: 'PNG (*.png)', extensions: ['.png'] },
];
