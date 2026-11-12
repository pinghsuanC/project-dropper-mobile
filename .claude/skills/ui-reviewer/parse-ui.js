// Turn a uiautomator XML dump into JSON for review.
//
// Usage: node parse-ui.js <dump.xml> <density-dpi>
//
// Prints { screen, nodes, problems }:
//   nodes    every node with text, label, role, state, and bounds/size in dp
//   problems accessibility issues found from the tree alone

const fs = require('fs');

const [file, dpiArg] = process.argv.slice(2);
const scale = Number(dpiArg || 160) / 160;
const xml = fs.readFileSync(file, 'utf8');

const MIN_TARGET_DP = 48;
const nodes = [];

for (const match of xml.matchAll(/<node\s([^>]*?)\/?>/g)) {
  const attrs = {};
  for (const [, key, value] of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
    attrs[key] = value
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
  const b = (attrs.bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!b) continue;
  const [x1, y1, x2, y2] = b.slice(1).map(Number);
  nodes.push({
    index: nodes.length,
    class: (attrs.class || '').replace(/^android\.(widget|view)\./, ''),
    package: attrs.package,
    text: attrs.text || '',
    label: attrs['content-desc'] || '',
    hint: attrs.hint || '',
    resourceId: attrs['resource-id'] || '',
    clickable: attrs.clickable === 'true',
    longClickable: attrs['long-clickable'] === 'true',
    focusable: attrs.focusable === 'true',
    enabled: attrs.enabled !== 'false',
    checkable: attrs.checkable === 'true',
    checked: attrs.checked === 'true',
    selected: attrs.selected === 'true',
    bounds: [x1, y1, x2, y2],
    widthDp: Math.round((x2 - x1) / scale),
    heightDp: Math.round((y2 - y1) / scale),
  });
}

// An element's accessible name may come from its own text/label or from text inside it.
function contains(outer, inner) {
  const [a1, b1, c1, d1] = outer.bounds;
  const [a2, b2, c2, d2] = inner.bounds;
  return a2 >= a1 && b2 >= b1 && c2 <= c1 && d2 <= d1;
}
function accessibleName(node) {
  if (node.label || node.text) return node.label || node.text;
  const inside = nodes.filter((n) => n !== node && contains(node, n) && (n.text || n.label));
  return inside.map((n) => n.label || n.text).join(' ');
}

const problems = [];
const interactive = nodes.filter((n) => n.clickable || n.longClickable || n.checkable);

for (const n of interactive) {
  const name = accessibleName(n);
  const where = `node ${n.index} (${n.class}${name ? ` "${name}"` : ''})`;
  if (!name) {
    problems.push({ node: n.index, issue: 'no-accessible-name', detail: `${where} can be tapped but has no text or label` });
  }
  if (n.widthDp < MIN_TARGET_DP || n.heightDp < MIN_TARGET_DP) {
    problems.push({
      node: n.index,
      issue: 'small-touch-target',
      detail: `${where} is ${n.widthDp}x${n.heightDp}dp, under ${MIN_TARGET_DP}x${MIN_TARGET_DP}dp`,
    });
  }
  if (n.class === 'ViewGroup' || n.class === 'View') {
    problems.push({
      node: n.index,
      issue: 'no-role',
      detail: `${where} is tappable but reports a plain ${n.class}, so screen readers won't call it a button`,
    });
  }
}

for (const n of nodes) {
  if (n.class === 'ImageView' && !n.label && (n.clickable || n.focusable)) {
    problems.push({ node: n.index, issue: 'image-without-label', detail: `node ${n.index} is a focusable image with no label` });
  }
  if (n.class === 'EditText' && !n.label && !n.hint) {
    problems.push({ node: n.index, issue: 'field-without-label', detail: `node ${n.index} is a text field with no label or hint` });
  }
}

const root = nodes[0];
console.log(
  JSON.stringify(
    {
      screen: root ? { widthPx: root.bounds[2], heightPx: root.bounds[3], scale } : null,
      nodes,
      problems,
    },
    null,
    2,
  ),
);
