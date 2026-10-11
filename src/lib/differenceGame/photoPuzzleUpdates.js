// GLOIRE AI — the picture levels that have been carried over to a true 4K photographic edit.
//
// A level appears here once its pair of photographs has been read back and every place it changes stands
// where the picture really changes — no drawn overlay, no place guessed at on a grid. The pair's own
// addresses and the places read off them are kept here, so the level is ready the moment it opens.
export const PHOTO_PUZZLE_UPDATES = {
  lake: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/a1d00c820_generated_e1962e69.png',
    differences: [
      { id: 'lake-photo-cat', x: 0.197, y: 0.756, w: 0.141, h: 0.219, label: 'A cat sits beside the baskets' },
      { id: 'lake-photo-dog', x: 0.417, y: 0.723, w: 0.106, h: 0.214, label: 'A dog sits on the shore' },
      { id: 'lake-photo-buoy', x: 0.269, y: 0.557, w: 0.058, h: 0.097, label: 'A large buoy floats in the lake' },
      { id: 'lake-photo-tree', x: 0, y: 0.302, w: 0.103, h: 0.193, label: 'A large tree stands on the left shore' },
      { id: 'lake-photo-shirt', x: 0.613, y: 0.562, w: 0.039, h: 0.096, label: 'The middle fisherman wears blue' },
      { id: 'lake-photo-person', x: 0.786, y: 0.555, w: 0.055, h: 0.132, label: 'The right-hand fisherman is missing', extra: true },
      { id: 'lake-photo-birds', x: 0.82, y: 0.317, w: 0.07, h: 0.059, label: 'A flock of birds appears in the right-hand sky', extra: true },
    ],
  },
  pitch: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/2efad9bf6_generated_8e81e2d3.jpg',
    differences: [
      { id: 'pitch-photo-net', x: 0.204, y: 0.427, w: 0.218, h: 0.328, label: 'A net appears in the football goal' },
      { id: 'pitch-photo-palm', x: 0.212, y: 0.001, w: 0.052, h: 0.357, label: 'A palm branch hangs from the top' },
      { id: 'pitch-photo-cloud', x: 0.353, y: 0.08, w: 0.578, h: 0.339, label: 'A dark storm cloud appears in the sky' },
      { id: 'pitch-photo-bottle', x: 0.416, y: 0.796, w: 0.043, h: 0.022, label: 'A water bottle lies on the ground' },
      { id: 'pitch-photo-dog', x: 0.574, y: 0.68, w: 0.067, h: 0.105, label: 'A dog stands on the pitch' },
      { id: 'pitch-photo-cat', x: 0.767, y: 0.686, w: 0.034, h: 0.026, label: 'A cat sits on the pitch' },
      { id: 'pitch-photo-rocks', x: 0.242, y: 0.904, w: 0.228, h: 0.085, label: 'A pile of rocks appears in the foreground' },
      { id: 'pitch-photo-player', x: 0.352, y: 0.564, w: 0.033, h: 0.113, label: 'The boy in red is missing', extra: true },
      { id: 'pitch-photo-tree', x: 0.454, y: 0.045, w: 0.182, h: 0.461, label: 'A large leafy tree appears behind the fence', extra: true },
    ],
  },
  crossing: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/14c8ed284_generated_df87da6e.jpg',
    differences: [
      { id: 'crossing-photo-towel', x: 0.262, y: 0.048, w: 0.07, h: 0.265, label: 'A blue towel hangs from the tree' },
      { id: 'crossing-photo-flower', x: 0.035, y: 0.213, w: 0.117, h: 0.128, label: 'A red flower appears on the left' },
      { id: 'crossing-photo-boy', x: 0.032, y: 0.441, w: 0.091, h: 0.145, label: 'A boy sits on the left bank' },
      { id: 'crossing-photo-basket', x: 0.145, y: 0.49, w: 0.133, h: 0.143, label: 'A wicker basket stands on the left bank' },
      { id: 'crossing-photo-parrot', x: 0.662, y: 0.164, w: 0.059, h: 0.178, label: 'A parrot appears above the river' },
      { id: 'crossing-photo-dog', x: 0.707, y: 0.458, w: 0.117, h: 0.162, label: 'A dog sits on the right bank' },
      { id: 'crossing-photo-cow', x: 0.841, y: 0.366, w: 0.132, h: 0.108, label: 'A cow stands on the right bank' },
      { id: 'crossing-photo-hat', x: 0.01, y: 0.696, w: 0.153, h: 0.152, label: 'A straw hat lies in the foreground', extra: true },
      { id: 'crossing-photo-bucket', x: 0.409, y: 0.813, w: 0.104, h: 0.182, label: 'A blue bucket stands at the river edge', extra: true },
      { id: 'crossing-photo-jug', x: 0.815, y: 0.558, w: 0.124, h: 0.188, label: 'A red water jug stands on the right bank', extra: true },
      { id: 'crossing-photo-crate', x: 0.926, y: 0.506, w: 0.073, h: 0.065, label: 'A wooden crate appears on the right bank', extra: true },
      { id: 'crossing-photo-woman-left', x: 0.421, y: 0.307, w: 0.044, h: 0.213, label: 'The left woman is missing from the bridge', extra: true },
      { id: 'crossing-photo-woman-middle', x: 0.487, y: 0.313, w: 0.034, h: 0.204, label: 'The middle woman is missing from the bridge', extra: true },
    ],
  },
};