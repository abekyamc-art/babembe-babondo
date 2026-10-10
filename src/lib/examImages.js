/**
 * GLOIRE AI — one picture of its own for everything the challenges ask about.
 *
 * Every word of every day, every number, every greeting, every phrase, every proverb, every body term,
 * every calculation scene and every person stands here with a picture drawn for it alone, so no two
 * things the examination asks about are ever studied on the same picture.
 *
 * The people's pictures are real photographs, kept at their own public addresses and credited where
 * they stand. A person whose photograph the owner has not yet given stands without one until it comes.
 */

const PICTURE = "https://media.base44.com/images/public/6ac0821625ce2ff98ccb0871/";

const shot = (file, scene, alt) => ({ url: `${PICTURE}${file}`, scene, alt });

/** The counting, one scene of its own for every number — none of them shows how many. */
export const NUMBER_PICTURES = {
  "y-imo": shot("dc35180ce_generated_image.png", "Counting pebbles", "A child dropping pebbles into a clay bowl while an elder watches."),
  bobele: shot("a55afb63c_generated_image.png", "Weighing at the market", "A market seller weighing grain on a hanging balance scale."),
  busatu: shot("c593aea1e_generated_image.png", "Marking a count on a slate", "An elder marking counts with chalk on a blank slate while children watch."),
  bonachi: shot("c23bc4dff_generated_image.png", "Coins in the tin box", "A shopkeeper at a wooden stall counting coins into a tin box."),
  botano: shot("74408e417_generated_image.png", "Tallying maize cobs", "A woman tallying maize cobs into a wide basket at a roadside stall."),
  mtoba: shot("fc935cbd6_generated_image.png", "Learning with a counting frame", "A father teaching his child with a wooden counting frame of beads."),
  Mwenji: shot("49675c37c_generated_image.png", "Counting the herd", "A large herd of goats crossing a field while a boy counts them."),
  "E-nane": shot("91255fdcb_generated_image.png", "Counting the catch", "A fisherman laying his catch into a woven basket at the water's edge."),
  ienda: shot("76b4f7ec7_generated_image.png", "Measuring cloth", "A tailor measuring patterned cloth with a tape across a wooden table."),
  iomi: shot("f94e6ae38_generated_image.png", "Counting sacks of grain", "Two women counting full sacks of grain in a mud-walled store."),
  "iomi na y-imo": shot("51c18f4e0_generated_image.png", "Fares on the minibus", "A driver collecting fares from passengers on a crowded minibus."),
  "iomi na bobele": shot("8083f3c0d_generated_image.png", "Measuring a plank", "A carpenter measuring a long plank with a folding rule."),
  "iomi na busatu": shot("1e6cdeb9d_generated_image.png", "Counting medicine at the clinic", "A nurse counting paper wraps of medicine onto a tray."),
  "iomi na bonachi": shot("4ec3c0f06_generated_image.png", "Counting stones in a game", "Children counting small stones in a circle game while an adult claps."),
  "iomi na botano": shot("cc9282efb_generated_image.png", "Counting bottles on the shelf", "A shopkeeper counting bottles along a shelf, a blank pad on the counter."),
  "iomi na mtoba": shot("a57825662_generated_image.png", "Counting eggs into a tray", "A woman counting eggs into a shallow wooden tray at her stall."),
  "iomi na Mwenji": shot("b5bcbcb99_generated_image.png", "Counting bundles of firewood", "Two men counting bundles of firewood stacked beside a footpath."),
  "iomi na E-nane": shot("92cf01e8a_generated_image.png", "Counting loaves at the bakery", "A baker lifting loaves onto a counter from a wide wooden board."),
  "iomi na ienda": shot("c4b150c35_generated_image.png", "Loading a bicycle in the market", "Porters loading sacks onto a bicycle while a market woman counts the load."),
  "Mo ma bele": shot("399c6581c_generated_image.png", "The teacher at the board", "A teacher at a completely blank blackboard with children raising their hands."),
  "Mo ma sato": shot("b92f9ce67_generated_image.png", "Counting bunches of bananas", "Two sellers counting bunches of green bananas into a pile."),
  "Mo maa nachi": shot("acdc1eb60_generated_image.png", "Counting seed into a gourd", "An elderly farmer counting seed grains into a small gourd before sowing."),
  "Mo ma tano": shot("00fc4dc7b_generated_image.png", "Counting fish at the rack", "A woman counting fish laid across a bamboo smoking rack."),
  "Ma omi mtoba": shot("06295c453_generated_image.png", "Counting shells into a box", "An elder counting white cowrie shells into a carved wooden box."),
  "Ma omi e nane": shot("bf4654c7c_generated_image.png", "Counting coins by lamplight", "A man counting coins at a table beside a small kerosene lamp."),
  "Ma omi ienda": shot("de977595a_generated_image.png", "Counting tins on the shelves", "A shopkeeper counting tins of cooking oil along wooden shelves."),
  Ikana: shot("41be0df14_generated_image.png", "Counting baskets at the harvest", "A village chief among rows of woven baskets of grain in a courtyard."),
  Elufu: shot("499974a6a_generated_image.png", "The great market", "A vast market square filled with traders while a crier raises both hands."),
};

/** One scene of its own for every greeting of the day. */
export const GREETING_PICTURES = {
  "Walo lala bile?": shot("0dc59af0d_generated_image.png", "Greeting at dawn", "A woman greeting a man at the doorway of a house at dawn."),
  "Na lo lalabia ngeni.": shot("37f1ab313_generated_image.png", "Waking rested", "A person stretching in the doorway after a good night's sleep."),
  "Karibu lo nge.": shot("5150e0ca7_generated_image.png", "Welcomed back", "A traveller arriving while a woman steps out to meet them with open arms."),
  "Karibu umboka.": shot("2f0244214_generated_image.png", "Welcomed home", "A family gathering around someone just home, children running forward."),
  "Nasoa Kilwa Iomona.": shot("74cdd2928_generated_image.png", "Meeting on the path", "Two people shaking hands warmly on a village footpath."),
  "Twa i-ana mda wa lea bila i-monana.": shot("3b928633c_generated_image.png", "Old friends at the market", "Two old friends gripping each other's forearms in delighted surprise."),
  "Ole bile lunoru suku?": shot("5c39c4742_generated_image.png", "Talking at dusk", "Two people on low stools talking quietly at dusk beside a small lamp."),
  "Obe na lu suku luwa ngene.": shot("85e8b5a58_generated_image.png", "Waving goodbye", "A woman waving from the doorway as a man sets off with a light bag."),
  "O lale byangene.": shot("e55b60d36_generated_image.png", "Tucked in at night", "A parent drawing a blanket over a sleeping child by lamplight."),
  "Tomo nane badae.": shot("af41c1bb6_generated_image.png", "Parting at the crossroads", "Two people parting, one turning back to wave beside a tall tree."),
  "Hongera.": shot("4a9b74092_generated_image.png", "Clapping in celebration", "People clapping joyfully in a circle around a smiling seated elder."),
  "Soa kelwa ya lu suku lui bo chwa.": shot("37dc1cb3d_generated_image.png", "A birthday", "A small cake with lit candles and a family clapping around the table."),
};

/** One scene of its own for every phrase of every day. */
export const PHRASE_PICTURES = {
  "Oto ela": shot("812cba348_generated_image.png", "Asking to hear it again", "A speaker repeating patiently while the listener cups a hand behind one ear."),
  "Ya wa chibwa.": shot("17c39840f_generated_image.png", "Agreeing firmly", "Two elders sealing an agreement with a handshake, one finger raised."),
  "E-nywa.": shot("868c5a79a_generated_image.png", "One word spoken", "An elder speaking one clear word with a raised finger to an attentive listener."),
  "Ole tayari iendelea.": shot("75bcf8887_generated_image.png", "Ready to set off", "A person ready at the doorway with a shoulder bag, looking ahead."),
};

/** One picture of its own for every proverb — the image the saying brings to mind. */
export const PROVERB_PICTURES = {
  "Ikyi laanine anyonyi.": shot("60020483b_generated_image.png", "A bird and its egg", "A small bird perched beside a single egg resting in a woven nest."),
  "Yangéne taé lamaka.": shot("b442f95d7_generated_image.png", "A fading flower", "A fading flower beside a freshly opened one in a village garden."),
  "Mlébinge imwikyúfacwa binge.": shot("6f34ea068_generated_image.png", "A full granary and a small bowl", "An overflowing granary basket beside a small bowl holding a handful."),
  "Bwato bwikye ú nyata mwake ú’mkongo.": shot("e62d847ff_generated_image.png", "A boat seen from behind", "A wooden canoe seen from directly behind gliding across still water."),
  "A’amba chikyúmina cilingye.": shot("5f6e91a11_generated_image.png", "Monkeys at play", "Several young monkeys of the same size playing on broad branches."),
  "Búakwe lile cala.": shot("63ba21af9_generated_image.png", "In-laws arriving", "A group of in-laws arriving at a compound carrying bundles."),
  "Úaboo úakyúsaa úange.": shot("9c7068b5a_generated_image.png", "Washing together", "Two people washing their hands in turn from the same clay bowl."),
  "Búakúamba étonde.": shot("789f00623_generated_image.png", "A quiet courtyard", "A swept courtyard with a single stool, a folded baby wrap and a cradle."),
  "Lúsúabila ta lúakye.": shot("073be7281_generated_image.png", "Still water", "A stagnant green pool beside a clear stream rushing over stones."),
  "Tú yake eléma ‘yobe.": shot("310178a82_generated_image.png", "Helping along the path", "A younger man steadying a limping older companion on a path."),
  "Mwanúae takyomanya lwango tana bela ndea.": shot("4d910a039_generated_image.png", "A broken calabash", "A child beside a broken calabash while an adult crouches to explain."),
  "Bikye úayana baana i pala ca baúlú.": shot("6cfd841df_generated_image.png", "Children at play, adults at work", "Children playing while two adults pound grain and weave nearby."),
  "Cécécé hikyúbangya.": shot("7aa8b4ac5_generated_image.png", "Speaking behind the wall", "Two people whispering behind a mud wall while a third listens."),
  "Aya m’nda i obe.": shot("10fb19ac1_generated_image.png", "Food in the bowl", "A man eating while a child holds out a bowl to be filled."),
  "Úanga obe a mnobe alé na malinga.": shot("4d752bf26_generated_image.png", "Keeping what is yours", "A woman carrying her grain basket inside while a man lifts his bicycle up."),
  "Asúfngile taâniaka.": shot("4dbc508ba_generated_image.png", "Crossing the river", "A strong swimmer striking out across open water, a canoe watching from the bank."),
  "Hitú likyúahúfangwa na léshi lyake.": shot("fae2948a6_generated_image.png", "An ear at the wall", "Two women with heads turned toward a low wall, one hand cupped to an ear."),
  "Wa chimbya mchwe aema ibekwa.": shot("1d6333625_generated_image.png", "At the barber's", "A barber with a razor beside a seated man turning his head away."),
};

/**
 * One study illustration of its own for every confirmed body term. None of them names the structure it
 * shows, so the picture is a study aid and never the answer.
 */
export const BODY_PICTURES = {
  "Blood vessel": shot("bbfd4b335_generated_image.png", "Study illustration — blood vessels", "A cut-away showing branching blood vessels in a limb."),
  Uterus: shot("ef09bc730_generated_image.png", "Study illustration — female system", "The uterus from the front with the fallopian tubes and vaginal canal."),
  Ovary: shot("8e7bcb71b_generated_image.png", "Study illustration — female system", "A single ovary in close-up with its follicles."),
  "Fallopian tube": shot("276f62407_generated_image.png", "Study illustration — female system", "A slender curved tube with fringed fimbriae beside the ovary."),
  Cervix: shot("ee1e96fc4_generated_image.png", "Study illustration — female system", "A section through the pelvis showing the canal below the uterus."),
  Vagina: shot("94faae921_generated_image.png", "Study illustration — female system", "A section showing the muscular canal within the pelvis."),
  Vulva: shot("9897d47f3_generated_image.png", "Study illustration — female system", "An abstract clinical schematic of the pelvic floor."),
  Clitoris: shot("d73a77373_generated_image.png", "Study illustration — female system", "A clinical diagram of the internal structure with its paired crura."),
  Labia: shot("b18cf3eee_generated_image.png", "Study illustration — female system", "A simple clinical diagram of the outer and inner folds."),
  Penis: shot("8ee33cf91_generated_image.png", "Study illustration — male system", "A side section showing the paired erectile bodies and the urethra."),
  "Glans penis": shot("a80ce89f4_generated_image.png", "Study illustration — male system", "A close clinical diagram of the tip with its collar of skin in section."),
  Scrotum: shot("d84b63f3b_generated_image.png", "Study illustration — male system", "A simple clinical diagram of the outer pouch with its midline seam."),
  Testicle: shot("eea3093dd_generated_image.png", "Study illustration — male system", "A cut-away of the testis showing its lobules and coiled tubules."),
  Sperm: shot("8c05c8bbd_generated_image.png", "Study illustration — under the microscope", "A few cells seen under a microscope with heads and tails."),
  Semen: shot("6b2ad41cf_generated_image.png", "Study illustration — under the microscope", "A microscopic field of pale fluid with simple cells drifting in it."),
  "Prostate gland": shot("5ce67bd03_generated_image.png", "Study illustration — male system", "A gland seated beneath the bladder with a tube passing through."),
  Bladder: shot("91d4aee72_generated_image.png", "Study illustration — urinary system", "A section of the bladder with its muscular wall and two tubes entering above."),
  Urethra: shot("6665358af_generated_image.png", "Study illustration — urinary system", "A section showing a tube running from the bladder to its opening."),
  "Anus (woman)": shot("3f9e1ebba_generated_image.png", "Study illustration — lower bowel", "A section outline showing the lower bowel and its ending."),
  "Anus (man)": shot("975d02710_generated_image.png", "Study illustration — lower bowel", "A section outline showing the lower bowel and its ending."),
  Rectum: shot("bf824334b_generated_image.png", "Study illustration — lower bowel", "A cut-away of the lowest part of the bowel and its folded lining."),
};

/** The scenes the calculation and problem-solving challenges are studied on. */
export const MATHS_PICTURES = [
  shot("7daa81f3a_generated_image.png", "Working out the price", "A customer and seller working out a price over coins on a cloth."),
  shot("1099bd5f1_generated_image.png", "Weighing produce", "A hanging balance weighing cassava against a stone weight."),
  shot("50502e809_generated_image.png", "The market tray", "A tray of tomatoes and green leaves with a folded price cloth."),
  shot("34a929704_generated_image.png", "Measuring cloth", "Two pieces of cloth measured and cut on a tailor's table."),
  shot("863cebade_generated_image.png", "Sighting along the plank", "A carpenter sighting along a long plank on two trestles."),
  shot("d717c710e_generated_image.png", "Buying groundnuts", "A boy buying roasted groundnuts folded into a paper cone."),
  shot("081631966_generated_image.png", "Serving the evening meal", "A woman ladling stew from a pot into bowls along a bench."),
  shot("46d2428fb_generated_image.png", "Sharing bananas", "Two friends sharing out a bunch of bananas on a mat."),
  shot("58d2cece6_generated_image.png", "Learning with stones", "A father moving small stones between hollows with his child."),
  shot("eaa2133d2_generated_image.png", "Filling the egg tray", "A woman lifting eggs from a basket into a shallow tray."),
  shot("a47ee169a_generated_image.png", "Fares at the taxi stop", "A conductor collecting folded notes from passengers."),
  shot("45c7f44a1_generated_image.png", "Counting spare parts", "A bicycle repairer counting small spare parts laid out on a mat."),
  shot("fa901f5a0_generated_image.png", "The village water point", "Women and children queuing with basins at a standpipe."),
  shot("709a4c6ef_generated_image.png", "Marking out the field", "A farmer stretching a long plain rope between two pegs."),
  shot("c03e07e95_generated_image.png", "Water for the journey", "Calabashes of water laid out in the shade of a wall."),
  shot("44cedb58f_generated_image.png", "Counting on his fingers", "A child on the step counting on his fingers while an adult smiles."),
  shot("3e3e48a24_generated_image.png", "The shopkeeper's notebook", "A shopkeeper at a solar calculator beside a blank notebook."),
  shot("488965ef3_generated_image.png", "Filling the grain store", "Two men stacking sacks of maize while a third chalks notches on the wall."),
  shot("ff71d04ba_generated_image.png", "Counting yams", "A trader counting yams from a wheelbarrow onto a mound."),
  shot("16a5a6c49_generated_image.png", "Measuring grain", "A grain seller measuring maize with a carved calabash scoop."),
  shot("ff21f68ab_generated_image.png", "Loading the charcoal", "Workers loading charcoal sacks onto a lorry."),
  shot("a3e91bc85_generated_image.png", "Sorting the catch", "A fisherman laying his catch into two baskets on the sand."),
  shot("c3712b414_generated_image.png", "Writing on slates", "Children writing with chalk on blank slates propped on their knees."),
  shot("c286f969e_generated_image.png", "Counting the beads", "An elder counting along a string of dark beads with his thumb."),
];

/** The three pictures drawn for the words of every day that stood twice on one scene. */
export const WORD_FIX_PICTURES = {
  money: shot("d90051f66_generated_image.png", "Coins and notes", "Coins and plain folded notes laid out on a printed cloth beside a purse."),
  pay: shot("5cffad1cd_generated_image.png", "Paying at the counter", "A customer's hand passing plain coins across a counter to a seller."),
  unknown: shot("25ad6e4fb_generated_image.png", "Not knowing", "A person with shoulders raised and open palms beside a questioning neighbour."),
};

const CREDIT = "Photograph from Wikimedia Commons";

/**
 * The people the examination asks about, each with their own real photograph at its own address. A
 * person whose photograph has not been given stands with an empty address, and no picture is shown for
 * them until it arrives.
 */
export const PEOPLE_PICTURES = {
  "Diamond Platnumz": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Diamond_Platnumz.jpg/800px-Diamond_Platnumz.jpg", scene: "Diamond Platnumz", alt: "Photograph of Diamond Platnumz", credit: CREDIT },
  "Gloire Sadiki": { url: "", scene: "Gloire Sadiki", alt: "", credit: "" },
  "Koffi Olomide": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Koffi_Olomd%C3%A9_%C3%A0_la_c%C3%A9l%C3%A9bration_du_Vodoun_Days_2024_%C3%A0_Ouidah_au_B%C3%A9nin01_37.png/800px-Koffi_Olomd%C3%A9_%C3%A0_la_c%C3%A9l%C3%A9bration_du_Vodoun_Days_2024_%C3%A0_Ouidah_au_B%C3%A9nin01_37.png", scene: "Koffi Olomide", alt: "Photograph of Koffi Olomide", credit: CREDIT },
  "Fally Ipupa": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Fally_Ipupa_a_Paris%2C_en_France.jpg/800px-Fally_Ipupa_a_Paris%2C_en_France.jpg", scene: "Fally Ipupa", alt: "Photograph of Fally Ipupa", credit: CREDIT },
  "Papa Wemba": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Papa_Wemba.jpg/800px-Papa_Wemba.jpg", scene: "Papa Wemba", alt: "Photograph of Papa Wemba", credit: CREDIT },
  Wizkid: { url: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Wizkid_at_Iyanya%27s_album_launch_concert%2C_2013_%28cropped%29.jpg", scene: "Wizkid", alt: "Photograph of Wizkid performing", credit: CREDIT },
  "Burna Boy": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Untold_2024_-Burna_Boy_%2853926047977%29_%28cropped%29.jpg/800px-Untold_2024_-Burna_Boy_%2853926047977%29_%28cropped%29.jpg", scene: "Burna Boy", alt: "Photograph of Burna Boy", credit: CREDIT },
  Davido: { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Davido_2024_%28cropped%29.jpg/800px-Davido_2024_%28cropped%29.jpg", scene: "Davido", alt: "Photograph of Davido", credit: CREDIT },
  "Miriam Makeba": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Miriam_makeba_01.jpg/800px-Miriam_makeba_01.jpg", scene: "Miriam Makeba", alt: "Photograph of Miriam Makeba", credit: CREDIT },
  "Angelique Kidjo": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Ang%C3%A9lique_Kidjo_Gershwin_2023.jpg/800px-Ang%C3%A9lique_Kidjo_Gershwin_2023.jpg", scene: "Angélique Kidjo", alt: "Photograph of Angélique Kidjo", credit: CREDIT },
  "Bob Marley": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Bob_Marley_circa_1976_%28cropped%29.jpg/800px-Bob_Marley_circa_1976_%28cropped%29.jpg", scene: "Bob Marley", alt: "Photograph of Bob Marley", credit: CREDIT },
  "Michael Jackson": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Michael_Jackson_1983_%283x4_cropped%29_%28contrast%29.jpg/800px-Michael_Jackson_1983_%283x4_cropped%29_%28contrast%29.jpg", scene: "Michael Jackson", alt: "Photograph of Michael Jackson", credit: CREDIT },
  "Whitney Houston": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Whitney_Houston_%28cropped3%29.JPEG/800px-Whitney_Houston_%28cropped3%29.JPEG", scene: "Whitney Houston", alt: "Photograph of Whitney Houston", credit: CREDIT },
  "Celine Dion": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/C%C3%A9line_Dion_2012.jpg/800px-C%C3%A9line_Dion_2012.jpg", scene: "Celine Dion", alt: "Photograph of Celine Dion", credit: CREDIT },
  "Lupita Nyong’o": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/LupitaNyongo-byPhilipRomano3.jpg/800px-LupitaNyongo-byPhilipRomano3.jpg", scene: "Lupita Nyong’o", alt: "Photograph of Lupita Nyong’o", credit: CREDIT },
  "Denzel Washington": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Denzel_Washington_at_the_2025_Cannes_Film_Festival.jpg/800px-Denzel_Washington_at_the_2025_Cannes_Film_Festival.jpg", scene: "Denzel Washington", alt: "Photograph of Denzel Washington", credit: CREDIT },
  "Charlie Chaplin": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Charlie_Chaplin_portrait_Getty_1739411952.jpg/800px-Charlie_Chaplin_portrait_Getty_1739411952.jpg", scene: "Charlie Chaplin", alt: "Photograph of Charlie Chaplin", credit: CREDIT },
  "Trevor Noah": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Trevor_Noah_%2853554114243%29_%28portrait_crop%29.jpg/800px-Trevor_Noah_%2853554114243%29_%28portrait_crop%29.jpg", scene: "Trevor Noah", alt: "Photograph of Trevor Noah", credit: CREDIT },
  "Lionel Messi": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Leo_Messi_Argentina_v_Egypt_7_July_2026-1.jpg/800px-Leo_Messi_Argentina_v_Egypt_7_July_2026-1.jpg", scene: "Lionel Messi", alt: "Photograph of Lionel Messi", credit: CREDIT },
  "Cristiano Ronaldo": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Cristiano_Ronaldo_Croatia_v_Portugal_2_July_2026-075_%28cropped%29.jpg/800px-Cristiano_Ronaldo_Croatia_v_Portugal_2_July_2026-075_%28cropped%29.jpg", scene: "Cristiano Ronaldo", alt: "Photograph of Cristiano Ronaldo", credit: CREDIT },
  "Didier Drogba": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Didier_Drogba_%282019%29_%28cropped2%29.jpg/800px-Didier_Drogba_%282019%29_%28cropped2%29.jpg", scene: "Didier Drogba", alt: "Photograph of Didier Drogba", credit: CREDIT },
  "Samuel Eto’o": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Sammuel_Eto%27o_Fils_02.jpg/800px-Sammuel_Eto%27o_Fils_02.jpg", scene: "Samuel Eto’o", alt: "Photograph of Samuel Eto’o", credit: CREDIT },
  "Serena Williams": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Serena-Smiling-2020.png/800px-Serena-Smiling-2020.png", scene: "Serena Williams", alt: "Photograph of Serena Williams", credit: CREDIT },
  "Usain Bolt": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Usain_Bolt_smiling_Berlin_2009.JPG/800px-Usain_Bolt_smiling_Berlin_2009.JPG", scene: "Usain Bolt", alt: "Photograph of Usain Bolt", credit: CREDIT },
  "Michael Jordan": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Michael_jordan_admad_rashad_%2851276390562%29_%28cropped%29.jpg/800px-Michael_jordan_admad_rashad_%2851276390562%29_%28cropped%29.jpg", scene: "Michael Jordan", alt: "Photograph of Michael Jordan", credit: CREDIT },
  "Albert Einstein": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Albert_Einstein_Head_cleaned.jpg/800px-Albert_Einstein_Head_cleaned.jpg", scene: "Albert Einstein", alt: "Photograph of Albert Einstein", credit: CREDIT },
  "Marie Curie": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Marie_Curie_c._1920s.jpg/800px-Marie_Curie_c._1920s.jpg", scene: "Marie Curie", alt: "Photograph of Marie Curie", credit: CREDIT },
  "Neil Armstrong": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Neil_Armstrong_pose.jpg/800px-Neil_Armstrong_pose.jpg", scene: "Neil Armstrong", alt: "Photograph of Neil Armstrong", credit: CREDIT },
  "Nelson Mandela": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Nelson_Mandela_1994.jpg/800px-Nelson_Mandela_1994.jpg", scene: "Nelson Mandela", alt: "Photograph of Nelson Mandela", credit: CREDIT },
  "Wangari Maathai": { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Wangari_Maathai_in_2001.jpg/800px-Wangari_Maathai_in_2001.jpg", scene: "Wangari Maathai", alt: "Photograph of Wangari Maathai", credit: CREDIT },
};

/** One scene of the calculation pool: two questions of one paper never share one. */
export function mathsPictureFor(index) {
  const at = ((index % MATHS_PICTURES.length) + MATHS_PICTURES.length) % MATHS_PICTURES.length;
  return MATHS_PICTURES[at];
}