/**
 * GLOIRE AI — the pictures the examination's questions are studied on.
 *
 * Every scene below is a reference for the student's eyes only: it shows the place a question belongs
 * to, and it never names an answer. The scenes drawn for the words of every day are shared with the
 * mixed questions that carry the same meaning, so a greeting is studied on the very picture the same
 * greeting stands beside in the everyday list.
 */

const PICTURE = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

const shot = (file, scene, alt) => ({ url: `${PICTURE}${file}`, scene, alt });

/** The scenes already drawn for the words of every day, met again beside the mixed questions. */
export const LIFE_SCENES = {
  morning: shot(
    "b21343cb3_generated_image.png",
    "Morning at home",
    "A person waking and stretching on a low bed beside an open window, in warm morning light."
  ),
  arriving: shot(
    "17f2a5b78_generated_image.png",
    "Arriving back",
    "Two people greeting warmly at the door of a house, one arriving with a small bag and the other stepping out with open arms."
  ),
  again: shot(
    "feb0b7c5a_generated_image.png",
    "Asking to hear it again",
    "Two people talking, the listener leaning in with a hand cupped behind an ear and a friendly, puzzled face."
  ),
  night: shot(
    "99c9c2af7_generated_image.png",
    "Tucked in at night",
    "A parent tucking a sleeping child into a low bed by the light of a small oil lamp, a woven blanket drawn up."
  ),
  rested: shot(
    "4d575fbd5_generated_image.png",
    "Waking rested",
    "A person sitting on the edge of a low bed stretching and smiling after a good sleep, sunlight through the open window."
  ),
  welcoming: shot(
    "ac3c720d0_generated_image.png",
    "Welcoming someone home",
    "A family welcoming someone home in a compound at dusk, one arriving with a bag while two others step forward with open arms."
  ),
};

/**
 * The counting, drawn so a number question is studied on a scene of counting: the pictures carry no
 * count of their own, so nothing in them ever gives an answer away.
 */
export const NUMBER_SCENES = {
  coins: shot(
    "15a7e55de_generated_image.png",
    "Counting at the market",
    "A market seller and a customer counting coins and notes together on a cloth spread over a table, baskets of greens beside them."
  ),
  tally: shot(
    "9ff7d6cfd_generated_image.png",
    "Marking a count",
    "An elder marking a count in chalk on a small board resting on his knees, children seated on the ground watching him."
  ),
  herd: shot(
    "85b6ce3ff_generated_image.png",
    "Counting the herd",
    "A herd of goats moving across a green village field while a boy stands at the edge watching them."
  ),
};

/** The scenes drawn for the greetings and the phrases of every day. */
export const PHRASE_SCENES = {
  meeting: shot(
    "ca7745443_generated_image.png",
    "Meeting again",
    "Two friends meeting again after a long time on a village path, one arriving with a bundle and the other reaching out in delight."
  ),
  evening: shot(
    "4aac6a1ef_generated_image.png",
    "Talking at dusk",
    "Two people seated on low stools talking quietly in a compound at dusk, a small oil lamp between them."
  ),
  parting: shot(
    "4a44c8657_generated_image.png",
    "Parting on the path",
    "A person walking away along a village footpath turning back to wave, the other waving from the path's edge."
  ),
  celebration: shot(
    "d195c86bf_generated_image.png",
    "A celebration",
    "People clapping and raising their hands in joy around a low table in a village yard, one holding a small cake with a candle."
  ),
  agreement: shot(
    "da4e74431_generated_image.png",
    "Agreeing together",
    "Two people seated facing each other, one speaking with a raised finger and the other nodding in agreement."
  ),
  ready: shot(
    "da62557fe_generated_image.png",
    "Ready to set off",
    "A person standing ready at the doorway of a village house with a small shoulder bag, looking ahead."
  ),
};

/** The scenes drawn for the proverbs, each one the image the saying brings to mind. */
export const PROVERB_SCENES = {
  bird: shot(
    "6ce614bb3_generated_image.png",
    "A bird and its egg",
    "A small bird standing close to a single egg resting in a woven nest on a branch."
  ),
  flower: shot(
    "083d13433_generated_image.png",
    "A fading flower",
    "A fading flower beside a fresh one in a village garden, petals beginning to fall."
  ),
  granary: shot(
    "8867e674f_generated_image.png",
    "Gathering in the yard",
    "A full woven granary basket of grain beside an empty one in a village yard while people gather around."
  ),
  river: shot(
    "00790867a_generated_image.png",
    "On the river",
    "A wooden canoe on still water at the edge of a green river with tall reeds."
  ),
  monkeys: shot(
    "bec762989_generated_image.png",
    "Monkeys at play",
    "Several young monkeys playing together on the branches of a large tree."
  ),
  hands: shot(
    "51110300f_generated_image.png",
    "Washing together",
    "Two people washing their hands together from the same clay bowl of water in a village yard."
  ),
  children: shot(
    "1ab35c8a5_generated_image.png",
    "Children at play",
    "Children playing a running game in a village yard with two adults watching, a broken calabash lying at the edge."
  ),
  whispering: shot(
    "1ffaee5fc_generated_image.png",
    "Whispering",
    "Two people leaning close and whispering behind a mud wall while a third stands near a doorway listening."
  ),
  barber: shot(
    "cdfae3176_generated_image.png",
    "At the barber's",
    "A barber shaving a man's head with a razor while the man turns his head aside, seated on a wooden stool."
  ),
  helping: shot(
    "cdab46d87_generated_image.png",
    "Helping along the path",
    "A man with a walking stick being helped along a village path by a younger man holding his arm."
  ),
};