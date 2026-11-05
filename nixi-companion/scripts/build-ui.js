'use strict';

const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');

esbuild.buildSync({
  entryPoints: [path.join(root, 'ui', 'border-card.jsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: path.join(root, 'ui', 'border-card.js'),
  define: { 'process.env.NODE_ENV': '"production"' },
  target: ['chrome120'],
  legalComments: 'none',
  logLevel: 'info'
});
