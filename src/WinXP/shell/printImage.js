/*
 * "Print" for a picture: the browser's print dialog, fed just the image.
 *
 * A hidden iframe gets a minimal page with the picture sized to the sheet
 * and prints itself once the image has decoded. The chrome that pops is the
 * host browser's — there is no faking a 2001 print dialog — but the verb
 * does what it says, which beats a dead menu item.
 */
export async function printImage(vfs, path) {
  const url = await vfs.readFileUrl(path);
  if (!url) throw new Error('The picture could not be read.');

  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  doc.open();
  doc.write(
    `<!doctype html><title>Print</title><style>
       body { margin: 0; }
       img { max-width: 100%; max-height: 100vh; }
     </style><img src="${url}">`,
  );
  doc.close();

  await new Promise((resolve, reject) => {
    const img = doc.querySelector('img');
    if (!img) {
      reject(new Error('The picture could not be read.'));
      return;
    }
    img.onload = resolve;
    img.onerror = () => reject(new Error('The picture could not be read.'));
    if (img.complete) resolve();
  });

  frame.contentWindow.focus();
  frame.contentWindow.print();
  // The dialog blocks in most browsers; a delayed removal covers the rest
  setTimeout(() => frame.remove(), 60000);
}
