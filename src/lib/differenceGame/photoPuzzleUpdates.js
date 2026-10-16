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
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/27d89e6fc_generated_34271602.jpg',
    differences: [
      { id: 'fishing-photo-1', x: 0.114, y: 0.454, w: 0.182, h: 0.147, label: 'The fish drying rack has changed' },
      { id: 'fishing-photo-2', x: 0.254, y: 0.694, w: 0.105, h: 0.141, label: 'A cat has appeared' },
      { id: 'fishing-photo-3', x: 0.516, y: 0.653, w: 0.075, h: 0.178, label: 'A dog has appeared' },
      { id: 'fishing-photo-4', x: 0.709, y: 0.574, w: 0.038, h: 0.072, label: 'A fisherman’s clothing has changed' },
      { id: 'fishing-photo-5', x: 0.707, y: 0.562, w: 0.041, h: 0.087, label: 'A fisherman has changed' },
      { id: 'fishing-photo-6', x: 0.57, y: 0.305, w: 0.067, h: 0.033, label: 'Birds have appeared', extra: true },
      { id: 'fishing-photo-7', x: 0.741, y: 0.018, w: 0.256, h: 0.169, label: 'A cloud has gone from the sky', extra: true },
      { id: 'fishing-photo-8', x: 0.789, y: 0.605, w: 0.082, h: 0.065, label: 'A fisherman has changed', extra: true },
    ],
  },
  well: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/34edb3a8c_generated_dd8eb7e2.jpg',
    differences: [
      { id: 'well-photo-1', x: 0.084, y: 0.718, w: 0.086, h: 0.222, label: 'A dog has appeared' },
      { id: 'well-photo-2', x: 0.42, y: 0, w: 0.14, h: 0.145, label: 'Red flowers have appeared' },
      { id: 'well-photo-3', x: 0.903, y: 0.575, w: 0.079, h: 0.057, label: 'A cat has appeared' },
      { id: 'well-photo-4', x: 0, y: 0.487, w: 0.075, h: 0.169, label: 'A wooden fence has appeared' },
      { id: 'well-photo-5', x: 0.948, y: 0.409, w: 0.052, h: 0.047, label: 'A rock has appeared' },
      { id: 'well-photo-6', x: 0.471, y: 0.406, w: 0.133, h: 0.213, label: 'The bucket has changed colour', extra: true },
      { id: 'well-photo-7', x: 0.539, y: 0.58, w: 0.053, h: 0.105, label: 'A jerrycan has changed colour', extra: true },
      { id: 'well-photo-8', x: 0.641, y: 0.623, w: 0.065, h: 0.115, label: 'A jerrycan has changed colour', extra: true },
      { id: 'well-photo-9', x: 0.689, y: 0.703, w: 0.033, h: 0.036, label: 'A jerrycan has changed colour', extra: true },
      { id: 'well-photo-10', x: 0.78, y: 0.684, w: 0.067, h: 0.106, label: 'A jerrycan has changed colour', extra: true },
    ],
  },
  schoolyard: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/ffa6760a7_generated_3ad44c7c.jpg',
    differences: [
      { id: 'schoolyard-photo-1', x: 0.016, y: 0.625, w: 0.099, h: 0.075, label: 'A container stands by the wall' },
      { id: 'schoolyard-photo-2', x: 0.184, y: 0.686, w: 0.047, h: 0.078, label: 'A child’s jacket has changed colour' },
      { id: 'schoolyard-photo-3', x: 0.113, y: 0.653, w: 0.073, h: 0.046, label: 'A bench stands by the wall' },
      { id: 'schoolyard-photo-4', x: 0.517, y: 0.739, w: 0.02, h: 0.058, label: 'Something lies on the ground' },
      { id: 'schoolyard-photo-5', x: 0.618, y: 0.76, w: 0.049, h: 0.049, label: 'Something lies on the ground' },
      { id: 'schoolyard-photo-6', x: 0.767, y: 0.745, w: 0.079, h: 0.082, label: 'A dog stands in the yard', extra: true },
      { id: 'schoolyard-photo-7', x: 0.002, y: 0.855, w: 0.118, h: 0.1, label: 'A cat sits at the edge', extra: true },
    ],
  },
  kitchen: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/d4a2e931f_generated_b231cce7.jpg',
    differences: [
      { id: 'kitchen-photo-1', x: 0.32, y: 0.099, w: 0.072, h: 0.149, label: 'The moon has risen in the sky' },
      { id: 'kitchen-photo-2', x: 0.505, y: 0.139, w: 0.038, h: 0.046, label: 'A chimney stands on the roof' },
      { id: 'kitchen-photo-3', x: 0.016, y: 0.729, w: 0.077, h: 0.222, label: 'A cat sits in the corner' },
      { id: 'kitchen-photo-4', x: 0.607, y: 0.615, w: 0.15, h: 0.307, label: 'A dog stands beside the fire' },
      { id: 'kitchen-photo-5', x: 0.156, y: 0.807, w: 0.204, h: 0.15, label: 'Firewood lies beside the fire' },
      { id: 'kitchen-photo-6', x: 0.679, y: 0.651, w: 0.113, h: 0.07, label: 'The basket’s contents have changed', extra: true },
      { id: 'kitchen-photo-7', x: 0.506, y: 0.769, w: 0.435, h: 0.228, label: 'The mat’s pattern has changed', extra: true },
      { id: 'kitchen-photo-8', x: 0.274, y: 0.462, w: 0.052, h: 0.053, label: 'The ladle has changed', extra: true },
    ],
  },
  grove: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/31edbcdb3_generated_314f75cd.jpg',
    differences: [
      { id: 'grove-photo-1', x: 0.208, y: 0.284, w: 0.315, h: 0.582, label: 'The man cutting bananas has changed' },
      { id: 'grove-photo-2', x: 0.088, y: 0.809, w: 0.16, h: 0.169, label: 'A tabby cat sits on the ground' },
      { id: 'grove-photo-3', x: 0.348, y: 0.665, w: 0.458, h: 0.298, label: 'A dog stands among the plants' },
      { id: 'grove-photo-4', x: 0.515, y: 0.757, w: 0.209, h: 0.205, label: 'A basket of bananas stands on the ground' },
      { id: 'grove-photo-5', x: 0.829, y: 0.778, w: 0.159, h: 0.133, label: 'A wooden crate stands at the edge' },
      { id: 'grove-photo-6', x: 0.506, y: 0.313, w: 0.154, h: 0.11, label: 'A tarp lies over the roof', extra: true },
    ],
  },
  chapel: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/23cc922c6_generated_ba903844.jpg',
    differences: [
      { id: 'chapel-photo-1', x: 0.489, y: 0.133, w: 0.038, h: 0.072, label: 'The cross on the roof is now a weathervane' },
      { id: 'chapel-photo-2', x: 0.056, y: 0.08, w: 0.068, h: 0.149, label: 'A birdhouse hangs from the tree' },
      { id: 'chapel-photo-3', x: 0.033, y: 0.651, w: 0.158, h: 0.113, label: 'A cow stands on the path' },
      { id: 'chapel-photo-4', x: 0.435, y: 0.757, w: 0.128, h: 0.242, label: 'A golden retriever stands by the steps' },
      { id: 'chapel-photo-5', x: 0.637, y: 0.801, w: 0.079, h: 0.078, label: 'A brown handbag stands on the ground' },
      { id: 'chapel-photo-6', x: 0.651, y: 0.153, w: 0.313, h: 0.506, label: 'The leaves of the big tree have turned red', extra: true },
      { id: 'chapel-photo-7', x: 0.298, y: 0.65, w: 0.034, h: 0.182, label: 'The woman’s dress is bright pink', extra: true },
    ],
  },
  tailor: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/0a39d6c8a_generated_032e6087.jpg',
    differences: [
      { id: 'tailor-photo-1', x: 0, y: 0.074, w: 0.098, h: 0.072, label: 'A roll of cloth has gone from the top shelf' },
      { id: 'tailor-photo-2', x: 0.242, y: 0.372, w: 0.125, h: 0.571, label: 'A cat sits on the window sill' },
      { id: 'tailor-photo-3', x: 0.247, y: 0.149, w: 0.113, h: 0.361, label: 'The tree leaves have changed' },
      { id: 'tailor-photo-4', x: 0.51, y: 0.113, w: 0.133, h: 0.112, label: 'The house roof has changed colour' },
      { id: 'tailor-photo-5', x: 0.542, y: 0.362, w: 0.065, h: 0.076, label: 'The man wears a hat' },
      { id: 'tailor-photo-6', x: 0.439, y: 0.574, w: 0.141, h: 0.142, label: 'The sewing machine has changed', extra: true },
      { id: 'tailor-photo-7', x: 0.761, y: 0.218, w: 0.15, h: 0.381, label: 'The hanging shirt has changed colour', extra: true },
      { id: 'tailor-photo-8', x: 0.694, y: 0.718, w: 0.248, h: 0.282, label: 'A dog sits on the floor', extra: true },
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
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/d5abb09f1_generated_1e3e5a58.jpg',
    differences: [
      { id: 'palms-photo-1', x: 0, y: 0.57, w: 0.15, h: 0.36, label: 'A dog lies in the shade' },
      { id: 'palms-photo-2', x: 0.305, y: 0.535, w: 0.105, h: 0.26, label: 'A man’s shirt has changed colour' },
      { id: 'palms-photo-3', x: 0.505, y: 0.58, w: 0.115, h: 0.115, label: 'A gourd has become a watermelon' },
      { id: 'palms-photo-4', x: 0.57, y: 0.15, w: 0.065, h: 0.115, label: 'A toucan sits in the tree' },
      { id: 'palms-photo-5', x: 0.705, y: 0.115, w: 0.12, h: 0.19, label: 'Coconuts hang in the tree' },
      { id: 'palms-photo-6', x: 0.78, y: 0.71, w: 0.09, h: 0.2, label: 'A cat sits in the shade', extra: true },
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
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/f8f756f16_generated_fe2a6b3d.jpg',
    differences: [
      { id: 'rainclouds-photo-1', x: 0.745, y: 0.128, w: 0.061, h: 0.05, label: 'A bird flies in the sky' },
      { id: 'rainclouds-photo-2', x: 0.497, y: 0.791, w: 0.096, h: 0.105, label: 'A dog runs along the path' },
      { id: 'rainclouds-photo-3', x: 0.743, y: 0.718, w: 0.086, h: 0.061, label: 'A cow stands in the field' },
      { id: 'rainclouds-photo-4', x: 0.372, y: 0.756, w: 0.102, h: 0.046, label: 'Fallen logs lie across the ground' },
      { id: 'rainclouds-photo-5', x: 0.523, y: 0.717, w: 0.15, h: 0.058, label: 'A wooden fence stands along the path' },
      { id: 'rainclouds-photo-6', x: 0.864, y: 0.737, w: 0.135, h: 0.091, label: 'Purple flowers grow at the edge', extra: true },
      { id: 'rainclouds-photo-7', x: 0.194, y: 0.714, w: 0.02, h: 0.07, label: 'A person walking has changed', extra: true },
      { id: 'rainclouds-photo-8', x: 0.242, y: 0.712, w: 0.019, h: 0.067, label: 'A person walking has changed', extra: true },
    ],
  },
  boatyard: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/b3f4106f1_generated_bb22b0fb.jpg',
    differences: [
      { id: 'boatyard-photo-1', x: 0.12, y: 0.31, w: 0.098, h: 0.222, label: 'The man’s shirt has changed colour' },
      { id: 'boatyard-photo-2', x: 0.332, y: 0.384, w: 0.075, h: 0.14, label: 'A fire burns behind the canoe' },
      { id: 'boatyard-photo-3', x: 0.07, y: 0.435, w: 0.052, h: 0.073, label: 'A metal bucket stands at the side' },
      { id: 'boatyard-photo-4', x: 0.184, y: 0.724, w: 0.115, h: 0.148, label: 'A dog stands on the sand' },
      { id: 'boatyard-photo-5', x: 0.583, y: 0.357, w: 0.14, h: 0.269, label: 'A cow stands behind the canoe' },
      { id: 'boatyard-photo-6', x: 0.863, y: 0.42, w: 0.065, h: 0.053, label: 'A swan swims in the water', extra: true },
      { id: 'boatyard-photo-7', x: 0.302, y: 0.807, w: 0.252, h: 0.105, label: 'A log lies on the sand', extra: true },
      { id: 'boatyard-photo-8', x: 0.673, y: 0.838, w: 0.249, h: 0.099, label: 'Driftwood lies on the sand', extra: true },
    ],
  },
  festival: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/46d5603d7_generated_c7e5c8e1.jpg',
    differences: [
      { id: 'festival-photo-1', x: 0.472, y: 0.302, w: 0.056, h: 0.057, label: 'The big drum has gained a mark' },
      { id: 'festival-photo-2', x: 0.397, y: 0.574, w: 0.178, h: 0.115, label: 'The base of the big drum has changed' },
      { id: 'festival-photo-3', x: 0.387, y: 0.62, w: 0.047, h: 0.126, label: 'The woman’s dress has changed colour' },
      { id: 'festival-photo-4', x: 0.651, y: 0.64, w: 0.038, h: 0.036, label: 'A small animal stands on the table' },
      { id: 'festival-photo-5', x: 0.035, y: 0.725, w: 0.065, h: 0.12, label: 'A dog stands before the dancers' },
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
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/e4eafb6f7_generated_429e0df3.jpg',
    differences: [
      { id: 'mangotree-photo-1', x: 0.341, y: 0.133, w: 0.059, h: 0.128, label: 'The boy’s shirt has changed colour' },
      { id: 'mangotree-photo-2', x: 0, y: 0.625, w: 0.131, h: 0.361, label: 'An animal has appeared at the left' },
      { id: 'mangotree-photo-3', x: 0.688, y: 0.756, w: 0.074, h: 0.221, label: 'An animal has appeared at the right' },
      { id: 'mangotree-photo-4', x: 0.476, y: 0.558, w: 0.053, h: 0.061, label: 'The object in the hand has changed' },
      { id: 'mangotree-photo-5', x: 0.489, y: 0.749, w: 0.204, h: 0.194, label: 'A container stands on the ground' },
      { id: 'mangotree-photo-6', x: 0.605, y: 0.599, w: 0.061, h: 0.068, label: 'A hat has appeared', extra: true },
      { id: 'mangotree-photo-7', x: 0.648, y: 0, w: 0.352, h: 0.328, label: 'The flowers of the mango tree have changed', extra: true },
      { id: 'mangotree-photo-8', x: 0.164, y: 0.526, w: 0.096, h: 0.062, label: 'The basket has moved', extra: true },
    ],
  },
  schoolwalk: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/9a6e3ef55_generated_0a84b4ec.jpg',
    differences: [
      { id: 'schoolwalk-photo-1', x: 0.117, y: 0.669, w: 0.182, h: 0.242, label: 'A dog walks with the children' },
      { id: 'schoolwalk-photo-2', x: 0.323, y: 0.469, w: 0.169, h: 0.072, label: 'A red umbrella is carried along the path' },
      { id: 'schoolwalk-photo-3', x: 0.414, y: 0.718, w: 0.082, h: 0.082, label: 'A yellow backpack is carried' },
      { id: 'schoolwalk-photo-4', x: 0.703, y: 0.561, w: 0.079, h: 0.14, label: 'Sunflowers grow beside the path' },
      { id: 'schoolwalk-photo-5', x: 0.793, y: 0.064, w: 0.089, h: 0.224, label: 'A stork stands at the top of the path' },
      { id: 'schoolwalk-photo-6', x: 0.767, y: 0.813, w: 0.052, h: 0.057, label: 'A cat walks at the edge', extra: true },
      { id: 'schoolwalk-photo-7', x: 0.435, y: 0.105, w: 0.085, h: 0.041, label: 'A cloud has gone from the sky', extra: true },
    ],
  },
  // the episodes the game opens on, and the last of the drawn ones: their places were read off their
  // own drawn pairs one place at a time, so every place they ask for is one the picture truly holds
  village: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/20af1a6c6_generated_f2c7960d.jpg',
    differences: [
      { id: 'village-photo-1', x: 0.3182, y: 0.5218, w: 0.0901, h: 0.2203, label: 'The door of the house has turned bright red' },
      { id: 'village-photo-2', x: 0.7713, y: 0.7162, w: 0.1018, h: 0.1509, label: 'The flowers have turned bright purple' },
      { id: 'village-photo-3', x: 0.5526, y: 0.7579, w: 0.1643, h: 0.1787, label: 'The red bucket has gone from the yard' },
      { id: 'village-photo-4', x: 0.1893, y: 0.6954, w: 0.0745, h: 0.1023, label: 'The cooking pot has turned bright red' },
    ],
  },
  market: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/fc0ce8256_generated_c419d528.jpg',
    differences: [
      { id: 'market-photo-1', x: 0.3768, y: 0.7023, w: 0.0823, h: 0.1092, label: 'The cut watermelon has gone from the table' },
      { id: 'market-photo-2', x: 0.2792, y: 0.7301, w: 0.1097, h: 0.2064, label: 'The tomatoes have turned bright yellow' },
      { id: 'market-photo-3', x: 0.2635, y: 0.0912, w: 0.1253, h: 0.1023, label: 'A cloud has gone from the sky' },
    ],
  },
  classroom: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/3acac40e8_generated_dee93c19.jpg',
    differences: [
      { id: 'classroom-photo-1', x: 0.592, y: 0.1607, w: 0.07, h: 0.0884, label: 'A bird has gone from outside the window' },
      { id: 'classroom-photo-2', x: 0.2697, y: 0.0843, w: 0.07, h: 0.1092, label: 'The clock has turned bright yellow' },
      { id: 'classroom-photo-3', x: 0.2323, y: 0.8213, w: 0.1409, h: 0.1787, label: 'A shirt among the children has turned red' },
      { id: 'classroom-photo-4', x: 0.0292, y: 0.7168, w: 0.1018, h: 0.24, label: 'The school bag has gone from the floor' },
    ],
  },
  drumcircle: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/2b050089c_generated_cc10e154.jpg',
    differences: [
      { id: 'drumcircle-photo-1', x: 0, y: 0.6537, w: 0.1292, h: 0.1856, label: 'A wooden bench has appeared at the edge of the clearing' },
      { id: 'drumcircle-photo-2', x: 0.422, y: 0.4842, w: 0.07, h: 0.24, label: 'The dancer wears a green sari' },
      { id: 'drumcircle-photo-3', x: 0.3221, y: 0.7411, w: 0.1409, h: 0.24, label: 'A hen stands where the stool stood' },
      { id: 'drumcircle-photo-4', x: 0.1659, y: 0.6537, w: 0.1136, h: 0.1926, label: 'A drum has turned bright blue' },
    ],
  },
  riverwash: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/266db462a_generated_3bf76c61.jpg',
    differences: [
      { id: 'riverwash-photo-1', x: 0.2362, y: 0.6676, w: 0.0979, h: 0.1787, label: 'The white hen has gone from the water\u2019s edge' },
      { id: 'riverwash-photo-2', x: 0.0213, y: 0.689, w: 0.1409, h: 0.24, label: 'A wooden stool has appeared on the bank' },
      { id: 'riverwash-photo-3', x: 0.092, y: 0.4871, w: 0.07, h: 0.1023, label: 'Three mangoes have gone from the tree' },
    ],
  },
  goathill: {
    changed: 'https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/099d054f0_generated_f63c59b6.jpg',
    differences: [
      { id: 'goathill-photo-1', x: 0.1346, y: 0.6398, w: 0.1175, h: 0.1231, label: 'A black goat has appeared beside the herd' },
    ],
  },
};