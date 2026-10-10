const PIC = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

/**
 * GLOIRE AI — the drawn picture puzzles.
 *
 * Each one is a picture and its changed copy: the same scene, the same characters standing in the same
 * places, with five differences made in the second copy — a thing added, a thing taken away, a colour
 * turned, a face changed, a place altered. Nothing here names a picture twice: the two copies of a
 * puzzle are always drawn from one scene, so the lower copy is the upper one with the differences in it.
 *
 * `cells` are the five places the differences stand in, counted on the puzzle's own grid — five columns
 * across and four rows down, the left column nothing and the right column four — so every difference is
 * tapped where it truly stands.
 */
export const DIFF_PICTURES = [
  {
    id: "sewing-room",
    scene: "The sewing room",
    alt: "A woman with an orange ponytail and a young girl sewing together at a table in a warm illustrated room.",
    top: `${PIC}91a434f78_generated_image.png`,
    bottom: `${PIC}a231febdf_generated_image.png`,
    cells: [[0, 0], [4, 0], [1, 1], [4, 2], [2, 3]],
  },
  {
    id: "market-stall",
    scene: "The market stall",
    alt: "A market woman behind a stall of tomatoes, greens and maize in an illustrated village market.",
    top: `${PIC}8c7fb83f1_generated_image.png`,
    bottom: `${PIC}d3cb07de8_generated_image.png`,
    cells: [[0, 2], [4, 0], [2, 0], [4, 3], [2, 3]],
  },
  {
    id: "village-kitchen",
    scene: "The village kitchen",
    alt: "A woman stirring a pot on a fire in an illustrated village kitchen.",
    top: `${PIC}222ef87b8_generated_image.png`,
    bottom: `${PIC}338e5b4eb_generated_image.png`,
    cells: [[0, 0], [4, 0], [1, 1], [4, 2], [2, 3]],
  },
  {
    id: "schoolyard",
    scene: "The schoolyard",
    alt: "A teacher and four children playing in an illustrated village schoolyard.",
    top: `${PIC}af13dcf90_generated_image.png`,
    bottom: `${PIC}4422dcada_generated_image.png`,
    cells: [[0, 2], [4, 0], [0, 1], [3, 2], [2, 3]],
  },
  {
    id: "river-bank",
    scene: "The river bank",
    alt: "A fisherman with a net at the water's edge beside a canoe in an illustrated river scene.",
    top: `${PIC}50c5e3ec2_generated_image.png`,
    bottom: `${PIC}8f0016445_generated_image.png`,
    cells: [[0, 0], [4, 0], [1, 1], [4, 3], [2, 3]],
  },
  {
    id: "farm-field",
    scene: "The farm",
    alt: "A farmer with a hoe and white goats grazing in an illustrated farm field.",
    top: `${PIC}27a0737ed_generated_image.png`,
    bottom: `${PIC}5b4aaa55b_generated_image.png`,
    cells: [[4, 0], [0, 0], [3, 1], [0, 2], [2, 3]],
  },
  {
    id: "childs-bedroom",
    scene: "The bedroom",
    alt: "A child sleeping in a low bed under a blanket by lamplight in an illustrated room.",
    top: `${PIC}1203ee993_generated_image.png`,
    bottom: `${PIC}919f3d320_generated_image.png`,
    cells: [[4, 0], [0, 0], [4, 2], [0, 2], [2, 3]],
  },
  {
    id: "village-shop",
    scene: "The village shop",
    alt: "A shopkeeper behind a wooden counter stacked with tins in an illustrated village shop.",
    top: `${PIC}7645b868d_generated_image.png`,
    bottom: `${PIC}4d45dd539_generated_image.png`,
    cells: [[4, 0], [2, 0], [3, 1], [0, 2], [2, 3]],
  },
  {
    id: "hair-salon",
    scene: "The salon",
    alt: "A hairdresser standing behind a seated client in an illustrated salon.",
    top: `${PIC}5e8b99c32_generated_image.png`,
    bottom: `${PIC}3f380dbb5_generated_image.png`,
    cells: [[4, 0], [1, 0], [3, 1], [0, 2], [2, 0]],
  },
  {
    id: "celebration",
    scene: "The celebration",
    alt: "A bride and groom with clapping guests and a white cake in an illustrated village compound.",
    top: `${PIC}8a10d32ed_generated_image.png`,
    bottom: `${PIC}67f6d4fe6_generated_image.png`,
    cells: [[4, 0], [0, 0], [3, 2], [0, 3], [2, 3]],
  },
];