/**
 * @file utils/icon.ts
 * @description Inline-SVG renderer for Lucide icon nodes. Returns a string so
 *              icons can be interpolated into the same `Promise<string>` page
 *              templates the rest of the app uses. Tree-shakes per-icon
 *              imports, no runtime DOM, no font dependency.
 *
 * Usage:
 *   import { iconSvg } from '../utils/icon';
 *   import { Heart } from 'lucide';
 *   `<button>${iconSvg(Heart, { size: 16, strokeWidth: 2.4 })}</button>`
 */

import type { IconNode } from 'lucide';

const SVG_DEFAULTS: Record<string, string | number> = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

interface IconOpts {
  size?: number;
  strokeWidth?: number;
  class?: string;
  style?: string;
}

function attrsToString(
  attrs: Record<string, string | number | undefined>
): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

export function iconSvg(node: IconNode, opts: IconOpts = {}): string {
  const size = opts.size ?? 24;
  const attrs: Record<string, string | number> = {
    ...SVG_DEFAULTS,
    width: size,
    height: size,
    'stroke-width': opts.strokeWidth ?? 2,
    'aria-hidden': 'true',
    focusable: 'false',
  };
  if (opts.class) attrs.class = opts.class;
  if (opts.style) attrs.style = opts.style;

  const children = node
    .map(([tag, childAttrs]) => `<${tag} ${attrsToString(childAttrs)}/>`)
    .join('');

  return `<svg ${attrsToString(attrs)}>${children}</svg>`;
}
