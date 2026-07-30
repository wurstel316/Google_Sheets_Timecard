#!/usr/bin/env node

const confirmation = process.env.CONFIRM_LIVE;

if (confirmation !== 'YES') {
  console.error('Live release blocked. Set CONFIRM_LIVE=YES to continue.');
  console.error('Example: CONFIRM_LIVE=YES npm run release:patch');
  process.exit(1);
}

console.log('Live release confirmation accepted. Continuing...');