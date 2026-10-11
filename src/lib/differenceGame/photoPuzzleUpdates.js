// GLOIRE AI — the picture levels whose places were read off the pair of photographs themselves.
//
// A level stands here once its two 4K photographs have been read against one another and every place it
// changes has been found in the pictures — never guessed at on a grid, and never taken on trust from the
// plan the pair was drawn from. A change that never came out in the picture is not listed at all, so a
// level asks only for the places its own picture truly holds: every place it asks for can be seen, and
// every touch area stands where the picture changes.
import firesidePhoto from '@/lib/differenceGame/firesidePhoto';

export const PHOTO_PUZZLE_UPDATES = {
  fireside: firesidePhoto,
  lake: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/a1d00c820_generated_e1962e69.png',
    differences: [
      { id: 'lake-photo-cat', x: 0.197, y: 0.756, w: 0.141, h: 0.219, label: 'A cat sits beside the baskets' },
      { id: 'lake-photo-dog', x: 0.417, y: 0.723, w: 0.106, h: 0.214, label: 'A dog sits on the shore' },
      { id: 'lake-photo-buoy', x: 0.2619, y: 0.5565, w: 0.07, h: 0.1439, label: 'A large buoy floats in the lake' },
      { id: 'lake-photo-tree', x: 0, y: 0.302, w: 0.103, h: 0.193, label: 'A large tree stands on the left shore' },
      { id: 'lake-photo-shirt', x: 0.613, y: 0.562, w: 0.039, h: 0.096, label: 'The middle fisherman wears blue' },
      { id: 'lake-photo-person', x: 0.7736, y: 0.5565, w: 0.07, h: 0.1231, label: 'The right-hand fisherman is missing', extra: true },
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
      { id: 'crossing-photo-boy', x: 0.0292, y: 0.4246, w: 0.0745, h: 0.1717, label: 'A boy sits on the left bank' },
      { id: 'crossing-photo-basket', x: 0.145, y: 0.49, w: 0.133, h: 0.143, label: 'A wicker basket stands on the left bank' },
      { id: 'crossing-photo-parrot', x: 0.662, y: 0.164, w: 0.059, h: 0.178, label: 'A parrot appears above the river' },
      { id: 'crossing-photo-dog', x: 0.707, y: 0.458, w: 0.117, h: 0.162, label: 'A dog sits on the right bank' },
      { id: 'crossing-photo-cow', x: 0.841, y: 0.366, w: 0.132, h: 0.108, label: 'A cow stands on the right bank' },
      { id: 'crossing-photo-hat', x: 0.01, y: 0.696, w: 0.153, h: 0.152, label: 'A straw hat lies in the foreground', extra: true },
      { id: 'crossing-photo-bucket', x: 0.409, y: 0.813, w: 0.104, h: 0.182, label: 'A blue bucket stands at the river edge', extra: true },
      { id: 'crossing-photo-jug', x: 0.815, y: 0.558, w: 0.124, h: 0.188, label: 'A red water jug stands on the right bank', extra: true },
      { id: 'crossing-photo-crate', x: 0.9099, y: 0.4871, w: 0.0901, h: 0.1231, label: 'A wooden crate appears on the right bank', extra: true },
      { id: 'crossing-photo-woman-left', x: 0.421, y: 0.307, w: 0.044, h: 0.213, label: 'The left woman is missing from the bridge', extra: true },
      { id: 'crossing-photo-woman-middle', x: 0.487, y: 0.313, w: 0.034, h: 0.204, label: 'The middle woman is missing from the bridge', extra: true },
    ],
  },
  fishing: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/dab829fc4_generated_59ca7a38.jpg',
    differences: [
      { id: 'fishing-photo-1', x: 0.1575, y: 0.454, w: 0.07, h: 0.07, label: 'One fish on the drying rack is bright yellow' },
      { id: 'fishing-photo-2', x: 0, y: 0.4801, w: 0.1409, h: 0.2203, label: 'A wooden paddle leans against the rock' },
      { id: 'fishing-photo-3', x: 0.6935, y: 0.5704, w: 0.07, h: 0.0814, label: 'The tallest fisherman wears a bright red shirt' },
      { id: 'fishing-photo-4', x: 0.707, y: 0.772, w: 0.107, h: 0.195, label: 'A brown dog sits on the sand' },
    ],
  },
  well: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/8d33f02bd_generated_75051566.jpg',
    differences: [
      { id: 'well-photo-1', x: 0.4628, y: 0.4037, w: 0.0784, h: 0.2134, label: 'The bucket on the rope is bright red' },
      { id: 'well-photo-2', x: 0.7596, y: 0.6369, w: 0.1018, h: 0.24, label: 'A jerrycan has turned bright green' },
      { id: 'well-photo-3', x: 0.0643, y: 0.6954, w: 0.0823, h: 0.1231, label: 'A second brown hen stands on the ground' },
    ],
  },
  schoolyard: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/8595c1f10_generated_6023baf4.jpg',
    differences: [
      { id: 'schoolyard-photo-1', x: 0.478, y: 0.0705, w: 0.07, h: 0.07, label: 'A yellow bird sits in the big tree' },
      { id: 'schoolyard-photo-2', x: 0.654, y: 0.6775, w: 0.07, h: 0.07, label: 'One uniform shirt is bright red' },
      { id: 'schoolyard-photo-3', x: 0.499, y: 0.7395, w: 0.07, h: 0.07, label: 'The football has gone from the ground' },
      { id: 'schoolyard-photo-4', x: 0.8849, y: 0.7093, w: 0.07, h: 0.1023, label: 'A wooden bench stands beside the wall' },
    ],
  },
  kitchen: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/a2ce38747_generated_e89e0e57.jpg',
    differences: [
      { id: 'kitchen-photo-1', x: 0.1698, y: 0.5496, w: 0.2112, h: 0.2064, label: 'The pot on the fire is silver' },
      { id: 'kitchen-photo-2', x: 0.22, y: 0.489, w: 0.07, h: 0.085, label: 'The wooden spoon is bright green' },
      { id: 'kitchen-photo-3', x: 0.6776, y: 0.8134, w: 0.1839, h: 0.1092, label: 'White plates stand on the mat' },
      { id: 'kitchen-photo-4', x: 0.93, y: 0.715, w: 0.07, h: 0.082, label: 'The clay water pot is missing' },
    ],
  },
  grove: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/6aceaf444_generated_25c251ab.jpg',
    differences: [
      { id: 'grove-photo-1', x: 0.4276, y: 0.2724, w: 0.1331, h: 0.24, label: 'A bunch of bananas has turned bright yellow' },
      { id: 'grove-photo-2', x: 0.217, y: 0.4645, w: 0.105, h: 0.34, label: 'The man wears a blue cloth wrapper' },
      { id: 'grove-photo-3', x: 0.101, y: 0.873, w: 0.109, h: 0.07, label: 'A second machete lies on the ground' },
      { id: 'grove-photo-4', x: 0.6424, y: 0.7926, w: 0.1253, h: 0.2064, label: 'A small red hen has appeared' },
    ],
  },
  chapel: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/f3da12893_generated_1ea61364.jpg',
    differences: [
      { id: 'chapel-photo-1', x: 0.465, y: 0.139, w: 0.07, h: 0.085, label: 'The cross on the roof is gold' },
      { id: 'chapel-photo-2', x: 0.673, y: 0.5405, w: 0.178, h: 0.07, label: 'A woman carries a green umbrella' },
      { id: 'chapel-photo-3', x: 0, y: 0.7585, w: 0.2347, h: 0.24, label: 'A small wooden stool stands on the path' },
    ],
  },
  tailor: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/2284bd21b_generated_f5f1a584.jpg',
    differences: [
      { id: 'tailor-photo-1', x: 0.7596, y: 0.2967, w: 0.1565, h: 0.24, label: 'The shirt on the hook is bright green' },
      { id: 'tailor-photo-2', x: 0.4237, y: 0.5704, w: 0.1331, h: 0.1787, label: 'The sewing machine is red' },
      { id: 'tailor-photo-3', x: 0.297, y: 0.8412, w: 0.07, h: 0.0814, label: 'Brown shoes stand under the table' },
    ],
  },
  washing: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/aaf82f0ac_generated_b7f55fda.jpg',
    differences: [
      { id: 'washing-photo-1', x: 0.2365, y: 0.3551, w: 0.07, h: 0.0814, label: 'The yellow cloth on the bush has turned brown' },
      { id: 'washing-photo-2', x: 0.3612, y: 0.6676, w: 0.1175, h: 0.0884, label: 'The basin on the stones is bright red' },
      { id: 'washing-photo-3', x: 0.4142, y: 0.3204, w: 0.07, h: 0.0884, label: 'A cloth on the bush is bright green' },
      { id: 'washing-photo-4', x: 0.1675, y: 0.805, w: 0.07, h: 0.07, label: 'A bar of soap lies on the stone' },
      { id: 'washing-photo-5', x: 0.8182, y: 0.7162, w: 0.0901, h: 0.0953, label: 'A white duck swims in the water' },
    ],
  },
  palms: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/45be89be8_generated_bbe9d38a.jpg',
    differences: [
      { id: 'palms-photo-1', x: 0.4471, y: 0.7023, w: 0.0823, h: 0.0814, label: 'A cup on the mat is bright blue' },
      { id: 'palms-photo-2', x: 0.133, y: 0.2195, w: 0.172, h: 0.34, label: 'The bamboo ladder is red' },
      { id: 'palms-photo-3', x: 0.147, y: 0.698, w: 0.182, h: 0.221, label: 'A second gourd stands beside the mat' },
    ],
  },
  taxistand: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/bc5b03e00_generated_73533f9d.jpg',
    differences: [
      { id: 'taxistand-photo-1', x: 0.2575, y: 0.125, w: 0.07, h: 0.07, label: 'A thin cloud has gone from the sky' },
      { id: 'taxistand-photo-2', x: 0.213, y: 0.668, w: 0.113, h: 0.149, label: 'The middle motorbike is bright green' },
      { id: 'taxistand-photo-3', x: 0.434, y: 0.581, w: 0.07, h: 0.07, label: 'A rider wears a yellow helmet' },
      { id: 'taxistand-photo-4', x: 0, y: 0.8699, w: 0.1253, h: 0.1301, label: 'A black tyre lies on the ground' },
      { id: 'taxistand-photo-5', x: 0.9025, y: 0.574, w: 0.07, h: 0.226, label: 'A wooden signpost stands by the road' },
    ],
  },
  rainclouds: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/e159b429d_generated_f6a4b14d.jpg',
    differences: [
      { id: 'rainclouds-photo-1', x: 0.376, y: 0.0625, w: 0.126, h: 0.34, label: 'Lightning stands in the sky' },
      { id: 'rainclouds-photo-2', x: 0.2167, y: 0.5773, w: 0.1526, h: 0.137, label: 'The cloth over her head is bright yellow' },
      { id: 'rainclouds-photo-3', x: 0.0526, y: 0.7857, w: 0.1292, h: 0.1717, label: 'A grey goat runs along the path' },
    ],
  },
  boatyard: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/07a818e96_generated_abc30fdc.jpg',
    differences: [
      { id: 'boatyard-photo-1', x: 0.655, y: 0.668, w: 0.34, h: 0.305, label: 'The bow of the canoe is painted bright blue' },
      { id: 'boatyard-photo-2', x: 0.147, y: 0.432, w: 0.072, h: 0.07, label: 'The adze handle is red' },
      { id: 'boatyard-photo-3', x: 0.0353, y: 0.6954, w: 0.07, h: 0.1023, label: 'A tin of paint stands on the sand' },
      { id: 'boatyard-photo-4', x: 0.7831, y: 0.5148, w: 0.1097, h: 0.137, label: 'A white egret stands in the water' },
    ],
  },
  festival: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/e92ed133d_generated_c65f8a3e.jpg',
    differences: [
      { id: 'festival-photo-1', x: 0.0465, y: 0.111, w: 0.34, h: 0.07, label: 'A string of small flags has gone' },
      { id: 'festival-photo-2', x: 0.4276, y: 0.2787, w: 0.1448, h: 0.1995, label: 'The big drum is bright yellow' },
      { id: 'festival-photo-3', x: 0.201, y: 0.7718, w: 0.0706, h: 0.1301, label: 'A small wooden stool stands before the dancers' },
    ],
  },
  sunrise: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/34b50c622_generated_2a7bb79b.jpg',
    differences: [
      { id: 'sunrise-photo-1', x: 0.472, y: 0.317, w: 0.07, h: 0.07, label: 'A bird flying has gone' },
      { id: 'sunrise-photo-2', x: 0.584, y: 0.384, w: 0.072, h: 0.085, label: 'The rising sun is bigger and deeper orange' },
      { id: 'sunrise-photo-3', x: 0, y: 0.1845, w: 0.182, h: 0.34, label: 'A tall tree in outline has gone from the side' },
      { id: 'sunrise-photo-4', x: 0.246, y: 0.7365, w: 0.07, h: 0.07, label: 'A second thatched roof has appeared' },
      { id: 'sunrise-photo-5', x: 0.6932, y: 0.6815, w: 0.0784, h: 0.1856, label: 'A wisp of cooking smoke has appeared' },
    ],
  },
  mangotree: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/702a18da8_generated_f133e510.jpg',
    differences: [
      { id: 'mangotree-photo-1', x: 0.4865, y: 0.1108, w: 0.07, h: 0.07, label: 'A branch of mangoes has gone from the tree' },
      { id: 'mangotree-photo-2', x: 0.3495, y: 0.8204, w: 0.0706, h: 0.0884, label: 'A mango on the ground is bright red' },
      { id: 'mangotree-photo-3', x: 0.089, y: 0.4015, w: 0.326, h: 0.34, label: 'The bicycle at the trunk is blue' },
      { id: 'mangotree-photo-4', x: 0.721, y: 0.6585, w: 0.07, h: 0.07, label: 'The white hen has gone from the post' },
    ],
  },
  schoolwalk: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/eb3485fed_generated_df02aa07.jpg',
    differences: [
      { id: 'schoolwalk-photo-1', x: 0.039, y: 0.048, w: 0.182, h: 0.314, label: 'A tall banana plant has gone from the path' },
      { id: 'schoolwalk-photo-2', x: 0.254, y: 0.5595, w: 0.07, h: 0.07, label: 'The school bag is bright yellow' },
      { id: 'schoolwalk-photo-3', x: 0.5615, y: 0.618, w: 0.07, h: 0.169, label: 'The bicycle is red' },
      { id: 'schoolwalk-photo-4', x: 0.2088, y: 0.6537, w: 0.1136, h: 0.1787, label: 'A white goat walks behind the children' },
    ],
  },
};