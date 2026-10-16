import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import OpenAI from 'npm:openai@6.45.0';
import { photoPuzzle } from '../../shared/photoPuzzle.ts';
import { geminiText, geminiImage, DRAW_BIG } from '../../shared/gemini.ts';

/** The least side a prize photograph is accepted at: a true 4K photograph, or the app draws it itself. */
const LEAST_4K = 3000;

/**
 * The new picture scenes of GLOIRE AI — FIND THE DIFFERENCES, drawn as 4K pictures.
 *
 * A scene is drawn twice: the first picture stands as it is, and the second is drawn from it with only the
 * scene's own five changes made, so the two pictures are the same picture in every other line, colour and
 * detail — whichever the player looks at, the same five places differ.
 *
 * Every change is then found in the drawn pair by a vision reading of the two pictures: the reading is
 * asked where each change stands in nine equal parts of the picture — a kind of answer a picture reader
 * gives surely, unlike a box measured in pixels — and the change's own touch area is worked out from that
 * part and from where inside the part it stands. So a level's differences stand where the picture really
 * changes, and every touch area is a comfortable eighth of the picture across and a sixth of it down.
 *
 * The address of a drawn pair may be handed back in, and the places are then read again on that same pair
 * without drawing anything — which is what puts a scene's places right without paying for its pictures twice.
 *
 * The scenes are drawn once and their addresses and boxes are kept in
 * src/lib/differenceGame/scenePictures.js, so the game opens with every level's pictures already standing.
 */

/** The one look every scene is drawn in, so the whole game stands as one set of pictures. */
const LOOK =
  'photorealistic ultra-detailed 4K photograph, wide 16:9 view, rich natural colour, sharp focus, ' +
  'warm soft daylight, fine texture in the ground, the cloth and the leaves, no text, no letters, ' +
  'no numbers, no writing, no logos, no watermark, no border, no frame';

/** Each new level's own scene: its look, and the five places its second picture differs. */
const SCENES = {
  4: {
    name: 'lake',
    look:
      'Lake Tanganyika at dawn: three wooden pirogues with fishermen pulling in nets, calm water with soft ' +
      'mist, distant green hills, a warm rising sun low over the water, a small rocky shore at the left ' +
      'with two woven baskets, birds in the sky',
    changes: [
      'in the top-left of the sky, one grey cloud is gone',
      'on the right, the paddle in the front pirogue has changed colour to bright blue',
      'in the bottom-left of the shore, one woven basket has disappeared',
      'the fisherman in the middle of the picture now wears a bright red shirt',
      'in the bottom-right corner of the shore, a tall green papyrus plant has appeared',
    ],
  },
  5: {
    name: 'pitch',
    look:
      'A village football ground in Congo in the late afternoon: boys playing a kickabout, a white goal ' +
      'frame built of bamboo, red dust pitch, tall green palm trees and a low fence behind, a crowd of ' +
      'children watching along the right, blue sky with white clouds',
    changes: [
      'the football in the middle of the pitch has changed colour from white to orange',
      'in the top-left of the sky, one white cloud is gone',
      'on the left of the pitch, a low wooden bench has appeared',
      'the tallest child on the right of the crowd now wears a bright green shirt',
      'in the bottom-right corner, the metal bucket beside the goal post is gone',
    ],
  },
  6: {
    name: 'crossing',
    look:
      'A river crossing in a Kibembe village: a footbridge of wooden logs over a clear stream, women ' +
      'carrying basins and bundles on their heads walking across, clothes spread on flat stones to dry on ' +
      'the left bank, two goats grazing on the right bank, dense green vegetation, soft morning light',
    changes: [
      'the basin on the head of the woman in the middle is now bright yellow',
      'on the left bank, one blue shirt has gone from the stones',
      'on the right bank, one of the two goats has disappeared',
      'in the top-left corner, a tall palm tree has appeared',
      'in the bottom-right corner, a white bird stands at the edge of the water',
    ],
  },
  7: {
    name: 'feast',
    look:
      'A village wedding feast in a courtyard: a long table laid with white and orange cloth and plates of ' +
      'food, a big cooking pot over a fire at the right, drummers playing tall drums at the left, women ' +
      'dancing in bright wraps, strings of coloured cloth and balloons hung overhead, warm afternoon light',
    changes: [
      'the cloth wrapped round the tall drum on the left has changed from green to purple',
      'in the middle of the table, the tall jug of water has gone',
      'in the top-right, one string of coloured cloth is missing from the decorations',
      'in the bottom-left corner, a smiling child in a blue dress has appeared',
      'at the right, the big cooking pot is now silver instead of black',
      'in the top-left of the picture, one white balloon is gone from the decorations',
      'in the middle of the table, a plate of oranges has appeared',
      'on the left, a woman dancing now wears a bright yellow wrap',
      'in the bottom-right of the courtyard, a small brown dog stands beside the fire',
      'in the bottom-left of the courtyard, a small wooden stool carries three clay cups',
    ],
  },
  8: {
    name: 'fireside',
    look:
      'An evening storytelling gathering in a village: a bright fire in the middle, an old storyteller with ' +
      'a drum seated at the left, children sitting on the ground around the fire, a man playing a guitar at ' +
      'the right, mud houses and dark trees behind, a deep blue night sky full of stars and a big moon, warm ' +
      'firelight on every face',
    changes: [
      'the big moon in the top-right of the sky has gone',
      'a bright shooting star now crosses the top-left of the sky',
      'the storyteller’s drum on the left is now red',
      'the guitar player on the right now wears a yellow hat',
      'in the bottom-left corner, the clay pot beside the fire has gone',
      'in the top-left of the sky, one bright star is missing',
      'in the middle of the picture, a small child now holds a wooden bowl',
      'on the right of the fire, a grey cat sits beside the guitar player',
      'in the middle of the picture, a wooden stool stands between the children',
      'in the bottom-right corner, a clay water gourd lies on the ground',
    ],
  },
  9: {
    name: 'stage',
    look:
      'A village music show at night: a low stage of planks with a singer at a microphone, two drummers and ' +
      'a guitarist behind, two big black speakers at the sides, a crowd of dancing people in front, ' +
      'colourful stage lights, a banner of plain cloth hung above the stage with nothing written on it, a ' +
      'dark evening sky',
    changes: [
      'the microphone stand in the middle of the stage is now gold instead of silver',
      'the speaker on the left has changed colour to bright green',
      'the small flag on top of the left speaker has disappeared',
      'the drummer on the right now wears a red cap',
      'in the bottom-right corner, a water bottle stands on the stage floor',
      'in the top-right of the picture, one stage light is now bright pink',
      'on the right of the stage, the speaker has changed colour to bright blue',
      'on the left of the stage, the guitarist now wears a white hat',
      'in the bottom-left corner, a black guitar case lies on the ground',
      'on the left of the stage, a small metal tin stands beside the guitarist',
    ],
  },
  10: {
    name: 'fishing',
    look:
      'A fishing morning on the shore of a great lake: wooden pirogues pulled up on pale sand, long fishing ' +
      'nets spread out to dry, a wooden rack of small silver fish drying in the sun, fishermen mending nets, ' +
      'green reeds at the edge, calm blue water and a warm early sun',
    changes: [
      'in the top-left of the sky, one white cloud is gone',
      'in the middle of the picture, one fish on the drying rack is now bright yellow',
      'on the left of the shore, a wooden paddle now leans against a rock',
      'on the right of the picture, the tallest fisherman now wears a bright red shirt',
      'in the bottom-right corner, a brown dog now sits on the sand',
    ],
  },
  11: {
    name: 'garden',
    look:
      'A cassava and maize garden in a village: neat rows of tall green cassava plants and young maize, ' +
      'red-brown soil between the rows, a woman hoeing at the left, a scarecrow of cloth strips in the ' +
      'middle, banana plants and tall trees behind, bright midday light',
    changes: [
      'in the top-right of the picture, one tall palm tree is gone from the trees behind',
      'in the middle of the garden, the cloth of the scarecrow is now bright blue',
      'on the left, the hoe of the woman is now red instead of brown',
      'in the bottom-left, a woven basket full of cassava has appeared',
      'in the bottom-right corner, a grey goat has disappeared from the edge of the garden',
    ],
  },
  12: {
    name: 'well',
    look:
      'A village water well of stones with a wooden frame, a rope and a bucket: women filling yellow ' +
      'jerrycans, children waiting with small buckets, a low wall of cement around the well, tall green ' +
      'trees behind, a path of red earth leading away, warm afternoon light',
    changes: [
      'in the top-left, one green tree behind the well is gone',
      'in the middle of the picture, the bucket on the rope is now bright red',
      'on the right, one of the yellow jerrycans has turned bright green',
      'in the bottom-left, a second brown hen has appeared on the ground',
      'in the bottom-right corner, a white cloth spread on the wall is gone',
    ],
  },
  13: {
    name: 'drummakers',
    look:
      'Drum makers at work in a village yard: tall carved wooden drums of different sizes standing on the ' +
      'ground, one drum half covered with a stretched skin, a man tuning a drum at the left, wood shavings ' +
      'and hand tools on the ground, a low wooden shed behind, warm afternoon light',
    changes: [
      'in the top-right of the picture, one drum standing on a shelf is gone',
      'in the middle of the picture, the drum skin being stretched is now bright yellow',
      'on the left, the man tuning the drum now wears a green cap',
      'in the bottom-left, a wooden mallet has appeared on the ground',
      'in the bottom-right corner, an orange cloth hanging on the shed is gone',
    ],
  },
  14: {
    name: 'schoolyard',
    look:
      'A village schoolyard at break time: children in blue and white uniforms playing, a low school ' +
      'building of painted bricks with open windows behind, a big shady tree in the middle, a football on ' +
      'the ground, a water drum at the side, bright morning light',
    changes: [
      'in the top-left of the picture, one open window of the school is closed',
      'in the middle of the picture, a yellow bird now sits in the big tree',
      'on the right, one shirt of the uniforms is now bright red',
      'in the bottom-left, the football has gone from the ground',
      'in the bottom-right corner, a wooden bench has appeared beside the wall',
    ],
  },
  15: {
    name: 'harvest',
    look:
      'Bringing in the harvest in a village: women carrying baskets and bundles of maize on their heads ' +
      'along a red earth path, stacked sacks and a wooden cart at the side, tall green banana plants along ' +
      'the path, a bright blue sky with soft clouds, late afternoon light',
    changes: [
      'in the top-left of the sky, one grey cloud is gone',
      'in the middle of the picture, one bundle of maize is now bright yellow',
      'on the right, the wooden cart now has a red wheel',
      'in the bottom-left, a woven mat spread on the ground has disappeared',
      'in the bottom-right corner, a brown hen has appeared beside the sacks',
    ],
  },
  16: {
    name: 'kitchen',
    look:
      'An outdoor village kitchen in the evening: three stones holding a big black pot over a glowing fire, ' +
      'a woman stirring with a long wooden spoon, smoke rising softly, a low mud kitchen hut behind, plates ' +
      'and a basket of vegetables on a mat, warm firelight',
    changes: [
      'in the top-left of the picture, one hanging bunch of dried herbs is gone',
      'in the middle of the picture, the pot on the fire is now silver instead of black',
      'on the right, the wooden spoon held by the woman is now bright green',
      'in the bottom-left, a white plate has appeared on the mat',
      'in the bottom-right corner, a clay water pot has disappeared',
    ],
  },
  17: {
    name: 'canoes',
    look:
      'Two long wooden canoes on a wide calm river, a boy paddling the front canoe with a long paddle, ' +
      'fishing nets folded in the middle of the canoes, green reeds and tall papyrus on both banks, soft ' +
      'morning mist over the water, warm early light',
    changes: [
      'in the top-right of the picture, a tall papyrus stalk has been added on the bank',
      'in the middle of the picture, the pile of nets in the canoe is now bright blue',
      'on the left, the paddle held by the boy is now yellow',
      'in the bottom-left, a fish has appeared in the water beside the canoe',
      'in the bottom-right corner, the second canoe is gone from the water',
    ],
  },
  18: {
    name: 'grove',
    look:
      'A banana grove beside a village house: broad green banana leaves heavy with bunches of green bananas, ' +
      'a man cutting a bunch with a machete at the left, dry banana leaves lying on the ground, a mud house ' +
      'with a thatched roof behind, bright dappled light through the leaves',
    changes: [
      'in the top-left of the picture, one bunch of bananas is gone from the plant',
      'in the middle of the picture, a bunch of bananas has turned bright yellow',
      'on the right, the man now wears a blue cloth wrapper instead of brown',
      'in the bottom-left, a second machete lies on the ground',
      'in the bottom-right corner, a small red hen has appeared',
    ],
  },
  19: {
    name: 'herders',
    look:
      'Goat herders with a small herd on a grassy hillside: six brown, white and black goats grazing, a ' +
      'young boy with a long stick in the middle, a low thorn fence behind, scattered acacia trees, a ' +
      'bright blue sky with white clouds, warm afternoon light',
    changes: [
      'in the top-left of the sky, one big white cloud is gone',
      'in the middle of the picture, the stick held by the boy is now bright red',
      'on the left, one white goat has disappeared from the herd',
      'in the bottom-left, a small kid goat has appeared beside a bush',
      'in the bottom-right corner, a blue plastic jerrycan now stands on the grass',
    ],
  },
  20: {
    name: 'chapel',
    look:
      'Sunday morning outside a small village chapel: a plain white and blue chapel with a simple cross on ' +
      'the roof, people in bright Sunday clothes greeting outside the door, children on the steps, tall ' +
      'trees at the sides, a beaten earth path, clear morning light',
    changes: [
      'in the top-left of the picture, one tall tree beside the chapel is gone',
      'in the middle of the picture, the cross on the chapel roof is now gold instead of white',
      'on the right, a woman now carries a bright green umbrella',
      'in the bottom-left, a small wooden stool has appeared on the path',
      'in the bottom-right corner, a white goat standing by the path has disappeared',
    ],
  },
  21: {
    name: 'pottery',
    look:
      'A pottery yard in a village: rows of clay pots and bowls drying in the shade, a woman shaping a pot ' +
      'on a low wheel at the left, wet clay on a wooden board, a shallow pit of stacked pots behind, tall ' +
      'green trees, soft early afternoon light',
    changes: [
      'in the top-right of the picture, one large pot on the shelf is gone',
      'in the middle of the picture, the bowl shaped by the woman is now bright blue',
      'on the left, the wooden board of wet clay is now covered with a red cloth',
      'in the bottom-left, a bucket of water has appeared beside the wheel',
      'in the bottom-right corner, a small clay cup has been added',
    ],
  },
  22: {
    name: 'tailor',
    look:
      'A village tailor shop: a man at a treadle sewing machine beside an open window, rolls of bright cloth ' +
      'stacked on shelves, a wooden table with scissors and a tape measure, a shirt hanging on a hook at the ' +
      'right, bright daylight through the window, a bare earth street outside',
    changes: [
      'in the top-left of the picture, one roll of cloth is missing from the shelf',
      'in the middle of the picture, the shirt hanging on the hook is now bright green',
      'on the right, the sewing machine is now red instead of black',
      'in the bottom-left, a pair of brown shoes has appeared under the table',
      'in the bottom-right corner, a blue plastic chair has disappeared',
    ],
  },
  23: {
    name: 'carpenter',
    look:
      'A carpenter yard in a village: a rough wooden workbench with hand tools, a man planing a long plank ' +
      'at the left, neat stacks of timber against a fence, sawdust on the ground, a low workshop shed with ' +
      'an open door behind, bright afternoon light',
    changes: [
      'in the top-right of the picture, one plank of timber standing against the fence is gone',
      'in the middle of the picture, the stool under the bench is now bright yellow',
      'on the left, the cap of the man is now blue instead of black',
      'in the bottom-left, a coiled rope has appeared on the ground',
      'in the bottom-right corner, a red hand saw lies on the timber',
    ],
  },
  24: {
    name: 'washing',
    look:
      'Washing day at the river: women kneeling at the water edge scrubbing clothes on flat stones, brightly ' +
      'coloured cloths and shirts spread over the bushes to dry, a bar of soap and a basin on the stones, ' +
      'clear shallow water, green trees along the far bank, warm morning light',
    changes: [
      'in the top-left of the picture, one yellow cloth drying on the bush is gone',
      'in the middle of the picture, the basin on the stones is now bright red',
      'on the right, one shirt drying on the bush has turned bright green',
      'in the bottom-left, a small bar of soap has appeared on the stone',
      'in the bottom-right corner, a white duck now swims in the shallow water',
    ],
  },
  25: {
    name: 'weddingdance',
    look:
      'A wedding dance in the evening: a line of women dancing in bright patterned wraps with arms raised, ' +
      'drummers with a tall hand drum at the right, onlookers clapping behind, a fire and hanging lanterns ' +
      'lighting the yard, a dark blue evening sky, warm firelight on the dancers',
    changes: [
      'in the top-left of the picture, one hanging lantern is gone',
      'in the middle of the picture, the wrap of the middle dancer is now bright green instead of red',
      'on the left, a second drummer with a small drum has appeared',
      'in the bottom-left, a white cloth on the ground is gone',
      'in the bottom-right corner, a wooden bench with two children now stands on the empty ground',
    ],
  },
  26: {
    name: 'palms',
    look:
      'A group of men sitting under tall palm trees in the afternoon: a gourd and two cups on a mat between ' +
      'them, a long bamboo ladder leaning against one palm, a small fire with a kettle, green palm fronds ' +
      'overhead, warm shafts of sunlight through the leaves',
    changes: [
      'in the top-right of the picture, one bunch of palm fronds is missing from the tree',
      'in the middle of the picture, one of the cups on the mat is now bright blue',
      'on the left, the bamboo ladder is now red',
      'in the bottom-left, a second gourd has appeared beside the mat',
      'in the bottom-right corner, a brown dog lying in the shade has disappeared',
    ],
  },
  27: {
    name: 'weavers',
    look:
      'Weavers at work under a shady tree: long strips of palm and reed laid out on a mat, three finished ' +
      'baskets of different sizes standing beside them, a woman weaving at the left, a half-woven basket in ' +
      'her hands, a low fence and green plants behind, soft dappled light',
    changes: [
      'in the top-left of the picture, one finished basket standing on the mat is gone',
      'in the middle of the picture, the basket woven by the woman is now bright purple',
      'on the right, a bundle of reed strips has turned bright yellow',
      'in the bottom-left, a small pair of scissors has appeared on the mat',
      'in the bottom-right corner, a green plastic bucket now stands by the mat',
    ],
  },
  28: {
    name: 'taxistand',
    look:
      'A motorbike taxi stand at a village crossroads: three motorbikes parked in a line with their riders ' +
      'waiting, a red earth road with palm trees on both sides, a small wooden kiosk with a bench behind, ' +
      'blue sky with high clouds, warm afternoon light',
    changes: [
      'in the top-left of the sky, one thin cloud is gone',
      'in the middle of the picture, the middle motorbike is now bright green instead of red',
      'on the right, one rider now wears a yellow helmet',
      'in the bottom-left, a black tyre lies on the ground',
      'in the bottom-right corner, a wooden signpost has appeared by the road',
    ],
  },
  29: {
    name: 'honey',
    look:
      'A honey harvest beside a big tree: a man on a low wooden ladder smoking a hive with a bundle of dry ' +
      'grass, three log hives hanging in the branches, two buckets of honey on the ground, a swarm of bees ' +
      'around one hive, green leaves overhead, warm afternoon light',
    changes: [
      'in the top-right of the picture, one log hive hanging in the branches is gone',
      'in the middle of the picture, the bucket of honey on the ground is now bright blue',
      'on the left, the shirt of the man is now red instead of brown',
      'in the bottom-left, a white cloth has appeared on the ground under the ladder',
      'in the bottom-right corner, a small grey cat now sits watching',
    ],
  },
  30: {
    name: 'rainclouds',
    look:
      'Rain coming to a village in the afternoon: dark grey clouds rolling in over the hills, rain falling ' +
      'in the distance over the trees, people hurrying along a red earth path carrying baskets, a woman ' +
      'holding a bright cloth over her head, palm trees bending in the wind',
    changes: [
      'in the top-left of the sky, one large dark cloud is gone',
      'in the middle of the picture, a flash of lightning now stands in the sky over the hills',
      'on the right, the cloth held over the head of the woman is now bright yellow',
      'in the bottom-left, a grey goat now runs along the path',
      'in the bottom-right corner, a brown hen sheltering under the palm tree has disappeared',
    ],
  },
  31: {
    name: 'eveningclass',
    look:
      'Evening lessons in a village classroom: children in blue uniforms sitting on wooden benches at low ' +
      'desks, an oil lamp and two candles on the table of the teacher, a blackboard with simple chalk ' +
      'drawings of fruit and no letters, wooden shutters open to the dark, warm lamplight',
    changes: [
      'in the top-left of the picture, one of the two candles on the table has gone',
      'in the middle of the picture, the oil lamp is now bright green instead of brass',
      'on the right, one shirt of the uniforms is now bright red',
      'in the bottom-left, a school bag has appeared on the floor beside a bench',
      'in the bottom-right corner, one empty wooden bench now stands there',
    ],
  },
  32: {
    name: 'boatyard',
    look:
      'Building a pirogue on the lake shore: a long half-finished wooden canoe lying on wooden supports, a ' +
      'man shaping the hull with an adze at the left, curled wood shavings on the sand, hand tools and a ' +
      'small fire for bending wood behind, calm water and green reeds at the edge, warm morning light',
    changes: [
      'in the top-right of the picture, the pile of long planks is gone',
      'in the middle of the picture, the bow of the half-finished canoe is now painted bright blue',
      'on the left, the handle of the adze is now red instead of brown',
      'in the bottom-left, a small tin of paint has appeared on the sand',
      'in the bottom-right corner, a white egret now stands in the shallow water',
    ],
  },
  33: {
    name: 'festival',
    look:
      'A village festival in the late afternoon: a crowd in bright clothes gathered on an open ground, a big ' +
      'drum on a stand in the middle, dancers with feathered headdresses at the left, long tables with food ' +
      'and drink at the right, strings of small flags hung overhead, warm golden light',
    changes: [
      'in the top-left of the picture, one string of small flags is missing',
      'in the middle of the picture, the big drum on its stand is now bright yellow',
      'on the right, one jug on the table is now bright green instead of white',
      'in the bottom-left, a small wooden stool has appeared in front of the dancers',
      'in the bottom-right corner, a grey cat sitting on the table has disappeared',
    ],
  },
  34: {
    name: 'sunrise',
    look:
      'Sunrise over the hills above a village: the sun rising golden behind green hills, mist lying in the ' +
      'valleys, a village of thatched roofs below, a few birds flying in the bright sky, tall trees in dark ' +
      'outline at the sides, warm glowing light',
    changes: [
      'in the top-right of the sky, one bird flying is gone',
      'in the middle of the picture, the rising sun is now bigger and deeper orange',
      'on the left, one tall tree in outline is missing from the side',
      'in the bottom-left, a second thatched roof has appeared in the village',
      'in the bottom-right corner, a thin wisp of cooking smoke has appeared',
    ],
  },
  35: {
    name: 'mangotree',
    look:
      'Under a big mango tree in a village yard: a boy up the tree with a long stick knocking down ripe ' +
      'mangoes, three children on the ground catching the fruit in a basket, a bicycle leaning against the ' +
      'trunk, a goat tied to a post at the side, dry grass and a low fence behind, bright afternoon light',
    changes: [
      'in the top-left of the picture, one branch of the mango tree heavy with fruit is gone',
      'in the middle of the picture, one mango lying on the ground is now bright red',
      'on the right, the bicycle leaning against the trunk is now blue instead of black',
      'in the bottom-left, a woven basket full of mangoes has appeared',
      'in the bottom-right corner, a white hen has disappeared from beside the post',
    ],
  },
  36: {
    name: 'schoolwalk',
    look:
      'Children walking to school along a village path in the morning: six children with books and small ' +
      'bags in blue and white uniforms, a boy pushing a bicycle beside them, tall banana plants and green ' +
      'bushes along both sides of the path, scattered stones on the red earth, warm early light',
    changes: [
      'in the top-left of the picture, one tall banana plant is gone from the side of the path',
      'in the middle of the picture, the bag carried by the tallest child is now bright yellow',
      'on the right, the bicycle pushed by the boy is now red instead of black',
      'in the bottom-left, a white goat has been added walking behind the children',
      'in the bottom-right corner, a grey stone on the path has disappeared',
    ],
  },
  1: {
    name: 'village',
    look:
      'A family compound in a Kibembe village in warm morning light: a round mud house with a thatched ' +
      'roof and a bright blue painted wooden door, a cooking fire with a black pot on it outside, a mango ' +
      'tree heavy with orange fruit beside the swept yard, a wooden bench with a red plastic bucket and a ' +
      'woven mat beside it, a small clay pot of yellow flowers, clothes drying on a line, tall palms and ' +
      'green bush behind, a wide bright sky with a few white clouds and a warm sun with a gentle smiling face',
    changes: [
      'in the top-left of the sky, the smiling face on the warm sun has gone, leaving a plain round sun',
      'in the middle of the yard, the steam rising from the black cooking pot has gone',
      'the wooden door of the house has changed colour from bright blue to bright red',
      'on the right, the orange fruit has disappeared from the branches of the mango tree',
      'in the bottom-left of the yard, the red plastic bucket beside the wooden bench has gone',
    ],
  },
  2: {
    name: 'market',
    look:
      'A busy village market day in a Kibembe village: wooden stalls with bright printed cloth awnings, ' +
      'baskets of red tomatoes and green vegetables, a big watermelon cut open on a table, a trader woman ' +
      'in a bright wrap behind the middle stall, wooden crates and woven baskets on the swept ground, other ' +
      'people shopping, tall trees and mud houses behind, warm late-morning light and a wide blue sky with ' +
      'a few white clouds',
    changes: [
      'the striped band on the cloth hanging at the left stall has changed colour from green to bright purple',
      'in the middle of the stall table, the big cut watermelon has gone',
      'the tomatoes in the basket at the left of the stall have changed colour from bright red to bright yellow',
      'the trader woman behind the middle stall now wears a bright green blouse instead of a blue one',
      'in the bottom-right of the ground beside the stall, the wooden crate has gone',
    ],
  },
  3: {
    name: 'classroom',
    look:
      'A village primary school classroom in the afternoon: rows of wooden benches and desks with children, ' +
      'a blackboard on the cream wall with letters written in white chalk, a round wall clock above it, open ' +
      'windows with green trees outside and two birds flying past, a globe and a stack of books on the ' +
      "teacher's table, a school backpack on the floor beside the front bench, a potted plant in the corner, " +
      'a green band along the lower wall and bright warm light through the windows',
    changes: [
      'on the blackboard in the middle of the wall, one letter has been rubbed off so the words read differently',
      'the hands of the round wall clock above the blackboard now show a different time',
      'outside the window on the right, the two birds flying past have gone from the sky',
      "on the teacher's table, the top book in the stack has changed colour from bright blue to bright red",
      'in the bottom-left of the classroom, the school backpack on the floor beside the front bench has gone',
    ],
  },
  37: {
    name: 'drumcircle',
    look:
      'A village drum circle at golden hour: five tall hand-carved wooden drums of different sizes standing ' +
      'in a ring on swept earth, drummers in bright cloth with their sticks raised, a carved wooden stool ' +
      'beside the drums, a woman dancing in a bright wrap with her arms out, onlookers clapping, a cooking ' +
      'fire with a black pot at the right, mud houses and tall green trees behind, a wide sunset sky with a ' +
      'warm sun carrying a gentle smiling face and a few soft clouds',
    changes: [
      'the cloth wrapped around the tallest drum on the left has changed colour from green to bright purple',
      'in the bottom-left of the circle, the carved wooden stool beside the drums has gone',
      'in the sky, the smiling face on the warm sun has gone, leaving a plain round sun',
      'the front drummer in the middle now wears a bright yellow hat on his head',
      "the dancing woman's wrap on the right has changed to bright yellow",
    ],
  },
  38: {
    name: 'riverwash',
    look:
      "Washing day at the river in a Kibembe village in the middle of the morning: two women kneeling on " +
      'flat stones at the water\u2019s edge scrubbing clothes, a line of bright cloths hung to dry on a rope ' +
      'between two poles, a woven basket of clothes beside the stones, a metal bucket on the bank, a white ' +
      'hen pecking at the water\u2019s edge, a mango tree carrying orange fruit on the bank at the left, the ' +
      'wide slow river and a green far bank behind, a wide sky with a few white clouds',
    changes: [
      'one cloth hanging on the drying line has changed colour from white to bright blue',
      'the washerwoman on the left now wears a bright green blouse instead of a yellow one',
      'the basin on the flat stones beside the women has changed colour from grey to bright red',
      'the woven basket of clothes standing beside the stones has gone',
      'in the middle of the picture, a white hen stands at the edge of the water',
      'in the top-right of the sky, one white cloud has gone',
      'on the left bank, the orange fruit has disappeared from the branches of the mango tree',
    ],
  },
  39: {
    name: 'goathill',
    look:
      'A green hillside above a Kibembe village in the late afternoon: a young herder with a wooden staff ' +
      'standing beside a small herd of goats with two kids, tall grass and a few flat rocks, a flowering ' +
      'bush with bright yellow flowers, a mango tree carrying orange fruit on the right of the slope, the ' +
      'village roofs far below in the valley, distant blue hills and a wide sky with a few white clouds',
    changes: [
      'one of the goats in the middle of the herd has disappeared from the hillside',
      'the young herder now wears a bright red shirt instead of a white one',
      "in the herder's hand, the wooden staff has changed colour to bright red",
      'on the right of the slope, the orange fruit has disappeared from the branches of the mango tree',
      'in the top-left of the sky, one white cloud has gone',
    ],
  },
};

/** A share of the picture, kept to four places. */
const share = (n) => Math.round(Math.max(0, Math.min(1, n)) * 10000) / 10000;

/**
 * The parts a picture is read in when a change is looked for: seven across its width, five down its
 * height. A reader names one of each in words — left or right, high or low — which is far more dependable
 * than a share of the picture worked out by itself, and the words are turned into the part they mean here.
 */
const ACROSS = ['far left', 'left', 'middle left', 'the middle', 'middle right', 'right', 'far right'];
const DOWN = ['very top', 'top', 'the middle', 'bottom', 'very bottom'];

/**
 * How much of the picture one touch area covers: a little wider than one part and a little taller than
 * one, so that wherever inside the part it was read into the change really stands, the touch that lands
 * on it falls inside the area laid over it.
 */
const SPAN_X = 0.18;
const SPAN_Y = 0.25;

/** A change with the words naming a place taken off its front, so the reading is made from the pictures. */
const bare = (change) => String(change || '').replace(/^(in|on|at)\b[^,]*,\s*/i, '').trim();

/** Whether two readings of one place say the same thing. A place that changed must not read alike. */
const alike = (one, two) => {
  const words = (text) => String(text || '').toLowerCase().match(/[a-z]+/g) || [];
  const held = new Set(words(one));
  const said = words(two);
  if (!held.size || !said.length) return false;
  return said.filter((word) => held.has(word)).length / Math.max(held.size, said.length) >= 0.6;
};

export default async function differenceScenes(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Only an admin may draw the scenes.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const level = Number(body?.level);
    const scene = SCENES[level];
    if (!scene) return Response.json({ error: 'No scene was named.' }, { status: 400 });
    if (body.refresh === true) {
      const result = await photoPuzzle(base44, scene, body);
      return Response.json({ level, ...result }, { status: result.error ? 422 : 200 });
    }

    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    const client = new OpenAI({ baseURL, apiKey: token, defaultHeaders: headers, maxRetries: 0 });

    const listed = scene.changes.map((change, i) => `(${i + 1}) ${change}`).join(' ');
    const compact = body?.compact === true;
    const only = Array.isArray(body?.only) ? body.only.map(Number) : null;
    let baseUrl = typeof body?.base === 'string' ? body.base : '';
    let changedUrl = typeof body?.changed === 'string' ? body.changed : '';
    let credits = 0;

    // a pair already drawn is read again as it stands; only a scene without one is drawn here
    if (!baseUrl || !changedUrl) {
      // Each photograph of a pair stands on an account of its own; a picture that comes back smaller than
      // a true 4K photograph is refused, and the app's own 4K picture service draws it exactly as before.
      let drawnCredits = 0;
      try {
        baseUrl = await geminiImage({
          base44,
          group: 'sceneone',
          model: DRAW_BIG,
          prompt: `${scene.look}. ${LOOK}`,
          aspect: '16:9',
          imageSize: '4K',
          least: LEAST_4K,
        });
      } catch (error: any) {
        console.error('The first photograph was not drawn on its own account:', error?.message);
      }
      if (!baseUrl) {
        const first = await client.images.generate({
          model: 'seedream_5_0_lite',
          prompt: `${scene.look}. ${LOOK}`,
          n: 1,
          response_format: 'url',
          aspect_ratio: '16:9',
          resolution: '4K',
          output_format: 'jpeg',
          quality: 'auto',
        });
        baseUrl = first.data?.[0]?.url || '';
        drawnCredits += first.usage?.base44_credits || 0;
      }
      if (!baseUrl) throw new Error('The first picture could not be drawn.');

      const changedPrompt =
        'Keep this picture exactly as it is — the same scene, the same people, the same animals, the same ' +
        'ground, the same sky, the same light, the same framing and the same detail — and change only these ' +
        `five places: ${listed} Everything else must stay identical, so the two pictures differ in exactly ` +
        'those five places and in nothing else.';
      try {
        changedUrl = await geminiImage({
          base44,
          group: 'scenetwo',
          model: DRAW_BIG,
          prompt: changedPrompt,
          reference_urls: [baseUrl],
          aspect: '16:9',
          imageSize: '4K',
          least: LEAST_4K,
        });
      } catch (error: any) {
        console.error('The changed photograph was not drawn on its own account:', error?.message);
      }
      if (!changedUrl) {
        const second = await client.images.generate({
          model: 'seedream_5_0_lite',
          prompt: changedPrompt,
          reference_image_urls: [baseUrl],
          n: 1,
          response_format: 'url',
          aspect_ratio: '16:9',
          resolution: '4K',
          output_format: 'jpeg',
          quality: 'auto',
        });
        changedUrl = second.data?.[0]?.url || '';
        drawnCredits += second.usage?.base44_credits || 0;
      }
      if (!changedUrl) throw new Error('The second picture could not be drawn.');

      credits = drawnCredits;
    }

    // Every change is looked for on its own, and all five at once: one question about one place is what a
    // reader answers most truly, where five at once is where a place gets mislaid. Each answer comes back
    // with what stood at that place in either picture and with how alike the two readings are, so a
    // reading that did not stand on the change is seen for what it is instead of being laid down blind.
    const readings = [];
    for (let i = 0; i < scene.changes.length; i += 1) {
      const change = scene.changes[i];
      if (only && !only.includes(i + 1)) continue;
      {
        const said = await geminiText({
          base44,
          group: "pictures",
          prompt:
            'Two pictures of the same scene stand here: the first, and the second drawn from it with exactly ' +
            `one place changed in it. The change is this: ${bare(change)} Look at both pictures and find the ` +
            'very place where that change stands. Read only what you see in the pictures, and pay no ' +
            'attention to any words that name a place. Answer: what stands at that place in the first ' +
            'picture, in three or four words; what stands at that place in the second picture, in three or ' +
            'four words; which seventh of the picture across that place stands in — far left, left, middle ' +
            'left, the middle, middle right, right, far right; and which fifth down it stands in — very top, ' +
            'top, the middle, bottom, very bottom.',
          file_urls: [baseUrl, changedUrl],
          response_json_schema: {
            type: 'object',
            properties: {
              first: { type: 'string' },
              second: { type: 'string' },
              across: { type: 'string', enum: ACROSS },
              down: { type: 'string', enum: DOWN },
            },
            required: ['first', 'second', 'across', 'down'],
          },
        });

        const colAt = ACROSS.indexOf(String(said?.across || '').trim().toLowerCase());
        const rowAt = DOWN.indexOf(String(said?.down || '').trim().toLowerCase());
        const first = String(said?.first || '');
        const second = String(said?.second || '');
        readings.push({
          id: `${scene.name}-${i + 1}`,
          change: bare(change) || change,
          colAt: colAt >= 0 ? colAt : 3,
          rowAt: rowAt >= 0 ? rowAt : 2,
          first,
          second,
          same: alike(first, second),
        });
      }
    }

    // Where two changes were read into one and the same part, each is asked about again inside that part
    // alone — left, middle or right of it, top, middle or bottom — so two places standing close together
    // are told apart instead of lying over one another. Two that still stand in the very same spot are tied
    // together, and the one touch that lands there finds both.
    const parts = new Map();
    readings.forEach((reading) => {
      const key = `${reading.colAt}:${reading.rowAt}`;
      parts.set(key, [...(parts.get(key) || []), reading]);
    });

    const crowded = [...parts.values()].filter((group) => group.length > 1).flat();
    for (const reading of crowded) {
      {
        const within = await geminiText({
            base44,
            group: "pictures",
            prompt:
              'Two pictures of the same scene stand here: the first, and the second drawn from it with a few ' +
              `places changed in it. One of those changes is this: ${reading.change} Its place stands inside ` +
              `the part of the picture that is ${ACROSS[reading.colAt]} across and ${DOWN[reading.rowAt]} ` +
              'down. Say where inside that one part it stands: in the left of it, its middle or its right; ' +
              'and in the top of it, its middle or its bottom. Read only what you see in the pictures.',
            file_urls: [baseUrl, changedUrl],
            response_json_schema: {
              type: 'object',
              properties: {
                across: { type: 'string', enum: ['left', 'the middle', 'right'] },
                down: { type: 'string', enum: ['top', 'the middle', 'bottom'] },
              },
              required: ['across', 'down'],
            },
          });
          const third = ['left', 'the middle', 'right'];
          const band = ['top', 'the middle', 'bottom'];
          const inX = third.indexOf(String(within?.across || '').trim().toLowerCase());
          const inY = band.indexOf(String(within?.down || '').trim().toLowerCase());
        reading.inX = inX >= 0 ? inX : 1;
        reading.inY = inY >= 0 ? inY : 1;
      }
    }

    // the middle of the part a change was read into, and, where it was read again, the middle of the third
    // of that part it was read into — with the touch area laid over the place the change truly stands
    const held = readings.map((reading) => ({
      ...reading,
      middleX: reading.colAt / ACROSS.length + (reading.inX === undefined ? 1.5 : reading.inX + 0.5) / ACROSS.length / 3,
      middleY: reading.rowAt / DOWN.length + (reading.inY === undefined ? 1.5 : reading.inY + 0.5) / DOWN.length / 3,
    }));

    // Changes read into one and the same part of the picture are found together: where a reading could not
    // tell two places apart, one touch answers for the whole part — so a place read a little to the side of
    // where it truly stands can never leave a level that cannot be finished.
    held.forEach((one) => {
      const mates = held.filter(
        (other) => other !== one && other.colAt === one.colAt && other.rowAt === one.rowAt
      );
      if (mates.length) one.group = `${one.colAt}:${one.rowAt}`;
    });

    const differences = held.map((reading) => ({
      id: reading.id,
      x: share(Math.min(reading.middleX - SPAN_X / 2, 1 - SPAN_X)),
      y: share(Math.min(reading.middleY - SPAN_Y / 2, 1 - SPAN_Y)),
      w: share(SPAN_X),
      h: share(SPAN_Y),
      label: reading.change,
      part: `${ACROSS[reading.colAt]} · ${DOWN[reading.rowAt]}`,
      first: reading.first,
      second: reading.second,
      same: reading.same,
      ...(reading.group ? { group: reading.group } : {}),
    }));

    return Response.json({
      level,
      scene: scene.name,
      base: baseUrl,
      changed: changedUrl,
      differences,
      found: differences.length,
      credits,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}