import { challengeQuestion } from "./challengeQuestions";
import { shuffled } from "./examSeries";

/**
 * GLOIRE AI — THE EXAMINATION: the bank the newest episodes of the season of people are asked from.
 *
 * Three things stand in this file, and every one of them is a plain fact of the world: the people the
 * episodes ask about — who they are, the work they are known for, and the country they come from — the
 * leaders of the nations with the office each one held, the countries with their capital cities, and
 * the facts of every day. Nothing is invented and nothing is guessed at: a name, a work, a country and
 * a capital stand here as they really are, and the two other choices put beside a right one are always
 * of another kind, so no choice but the right one can be true.
 *
 * Four kinds of question are cut from that record: the work a person is known for, the country a person
 * comes from, the piece that is turned round — which of these is known for such a work, or comes from
 * such a country — the country a leader held office in, the capital city of a country, and a fact of
 * every day. Every question carries the one thing it turns on apart from the rest of its line, so the
 * card can stand it in its own colour.
 *
 * A paper is drawn nine questions wide, one episode after another: the people are walked at a stride
 * that no stride of another kind shares, so a paper never asks about the same person twice and no
 * question of this season is ever handed to a student a second time. The tenth place of every paper is
 * the picture puzzle's, and the examination itself stands it there.
 */

/** How many questions one paper of this bank asks: the tenth place is the picture puzzle's. */
export const BANK_PER_PAPER = 9;

/**
 * The people of the world: their name, the work they are best known for, the country they come from —
 * left out where the owner alone could say it — the two other works put beside theirs, and, where a
 * person needs a word of their own, the line said of them.
 *
 * A work is written the way it is said of a person: “a singer”, “an actor”, “a president”.
 */
const PEOPLE = [
  // ——— Tanzania
  ["Ali Kiba", "singer", "Tanzania", ["professional wrestler", "astronaut"]],
  ["Harmonize", "singer", "Tanzania", ["referee", "soldier"]],
  ["Rayvanny", "singer", "Tanzania", ["pilot", "farmer"]],
  ["Zuchu", "singer", "Tanzania", ["boxer", "dentist"]],
  ["Nandy", "singer", "Tanzania", ["cyclist", "fisherman"]],
  ["Mbosso", "singer", "Tanzania", ["carpenter", "sailor"]],
  ["Juma Jux", "singer", "Tanzania", ["mason", "astronaut"]],
  ["Lady Jaydee", "singer", "Tanzania", ["referee", "nurse"]],
  ["Vanessa Mdee", "singer", "Tanzania", ["soldier", "farmer"]],
  ["Professor Jay", "rapper", "Tanzania", ["chef", "sailor"]],
  ["Fid Q", "rapper", "Tanzania", ["dentist", "farmer"]],
  ["Joh Makini", "rapper", "Tanzania", ["gardener", "sailor"]],
  ["Idris Sultan", "comedian", "Tanzania", ["astronaut", "referee"]],
  ["Bi Kidude", "singer", "Tanzania", ["pilot", "boxer"]],
  ["Siti binti Saad", "singer", "Tanzania", ["chef", "soldier"]],
  ["Khadija Kopa", "singer", "Tanzania", ["dentist", "pilot"]],
  ["Filbert Bayi", "runner", "Tanzania", ["chef", "pilot"]],
  ["Mbwana Samatta", "footballer", "Tanzania", ["astronaut", "chef"]],
  ["Hasheem Thabeet", "basketball player", "Tanzania", ["chef", "cyclist"]],
  ["Julius Nyerere", "president", "Tanzania", ["astronaut", "comedian"], "Julius Nyerere was the first president of Tanzania."],
  ["Samia Suluhu Hassan", "president", "Tanzania", ["astronaut", "comedian"]],
  ["Jakaya Kikwete", "president", "Tanzania", ["comic actor", "pilot"]],
  ["Benjamin Mkapa", "president", "Tanzania", ["chef", "sailor"]],
  ["John Magufuli", "president", "Tanzania", ["astronaut", "tennis player"]],
  ["Rashidi Kawawa", "prime minister", "Tanzania", ["astronaut", "comedian"]],
  ["Edward Sokoine", "prime minister", "Tanzania", ["astronaut", "chef"]],
  ["Frederick Sumaye", "prime minister", "Tanzania", ["comedian", "sailor"]],
  ["Mizengo Pinda", "prime minister", "Tanzania", ["astronaut", "comedian"]],
  ["Kassim Majaliwa", "prime minister", "Tanzania", ["chef", "astronaut"]],
  ["Bibi Titi Mohamed", "politician", "Tanzania", ["astronaut", "chef"]],
  ["Freddie Mercury", "singer", "", ["astronaut", "footballer"], "Freddie Mercury was the singer of the band Queen."],
  // ——— Kenya, Uganda, Rwanda and the Horn
  ["Eliud Kipchoge", "marathon runner", "Kenya", ["chef", "comedian"]],
  ["Jomo Kenyatta", "president", "Kenya", ["astronaut", "comedian"], "Jomo Kenyatta was the first president of Kenya."],
  ["Uhuru Kenyatta", "president", "Kenya", ["astronaut", "chef"]],
  ["Mwai Kibaki", "president", "Kenya", ["comedian", "sailor"]],
  ["Daniel arap Moi", "president", "Kenya", ["chef", "pilot"]],
  ["Ngũgĩ wa Thiong’o", "novelist", "Kenya", ["astronaut", "footballer"]],
  ["Yoweri Museveni", "president", "Uganda", ["astronaut", "comedian"]],
  ["Milton Obote", "president", "Uganda", ["chef", "sailor"]],
  ["Joshua Cheptegei", "runner", "Uganda", ["chef", "comedian"]],
  ["Paul Kagame", "president", "Rwanda", ["astronaut", "comedian"]],
  ["Pierre Nkurunziza", "president", "Burundi", ["chef", "astronaut"]],
  ["Salva Kiir", "president", "South Sudan", ["comedian", "chef"]],
  ["Haile Gebrselassie", "long-distance runner", "Ethiopia", ["chef", "comedian"]],
  ["Haile Selassie", "emperor", "Ethiopia", ["comedian", "footballer"]],
  ["Abiy Ahmed", "prime minister", "Ethiopia", ["astronaut", "comedian"]],
  ["Meles Zenawi", "prime minister", "Ethiopia", ["chef", "sailor"]],
  ["Mohamed Farah", "long-distance runner", "", ["chef", "pilot"]],
  ["Mohamed Salah", "footballer", "Egypt", ["astronaut", "chef"]],
  ["Gamal Abdel Nasser", "president", "Egypt", ["comedian", "chef"]],
  ["Anwar Sadat", "president", "Egypt", ["astronaut", "sailor"]],
  ["Hosni Mubarak", "president", "Egypt", ["chef", "comedian"]],
  // ——— The Congo
  ["Werrason", "singer", "the DR Congo", ["professional wrestler", "astronaut"]],
  ["JB Mpiana", "singer", "the DR Congo", ["chef", "sailor"]],
  ["Ferré Gola", "singer", "the DR Congo", ["referee", "farmer"]],
  ["Héritier Watanabe", "singer", "the DR Congo", ["pilot", "mason"]],
  ["Awilo Longomba", "singer", "the DR Congo", ["astronaut", "dentist"]],
  ["Kanda Bongo Man", "singer", "the DR Congo", ["chef", "soldier"]],
  ["Tshala Muana", "singer", "the DR Congo", ["cyclist", "pilot"]],
  ["M’bilia Bel", "singer", "the DR Congo", ["chef", "astronaut"]],
  ["Abeti Masikini", "singer", "the DR Congo", ["farmer", "pilot"]],
  ["Pepe Kalle", "singer", "the DR Congo", ["mason", "comedian"]],
  ["Franco Luambo", "guitarist", "the DR Congo", ["astronaut", "chef"]],
  ["Wendo Kolosoy", "musician", "the DR Congo", ["referee", "farmer"]],
  ["Simaro Lutumba", "guitarist", "the DR Congo", ["sailor", "pilot"]],
  ["Nyoka Longo", "musician", "the DR Congo", ["chef", "astronaut"]],
  ["Lokua Kanza", "singer", "the DR Congo", ["boxer", "farmer"]],
  ["Patrice Lumumba", "prime minister", "the DR Congo", ["astronaut", "comedian"], "Patrice Lumumba was the first prime minister of the Democratic Republic of the Congo."],
  ["Joseph Kasa-Vubu", "president", "the DR Congo", ["astronaut", "comedian"], "Joseph Kasa-Vubu was the first president of the Democratic Republic of the Congo."],
  ["Mobutu Sese Seko", "president", "the DR Congo", ["chef", "sailor"]],
  ["Laurent-Désiré Kabila", "president", "the DR Congo", ["comedian", "chef"]],
  ["Joseph Kabila", "president", "the DR Congo", ["astronaut", "sailor"]],
  ["Félix Tshisekedi", "president", "the DR Congo", ["chef", "comedian"]],
  ["Étienne Tshisekedi", "politician", "the DR Congo", ["astronaut", "chef"]],
  ["Dikembe Mutombo", "basketball player", "the DR Congo", ["chef", "pilot"]],
  ["Cédric Bakambu", "footballer", "the DR Congo", ["astronaut", "chef"]],
  ["Youssouf Mulumbu", "footballer", "the DR Congo", ["sailor", "dentist"]],
  ["Shabani Nonda", "footballer", "the DR Congo", ["chef", "cyclist"]],
  ["Denis Sassou Nguesso", "president", "the Republic of the Congo", ["astronaut", "comedian"]],
  ["Omar Bongo", "president", "Gabon", ["chef", "comedian"]],
  ["Pierre-Emerick Aubameyang", "footballer", "Gabon", ["astronaut", "chef"]],
  ["Paul Biya", "president", "Cameroon", ["astronaut", "comedian"]],
  ["Ahmadou Ahidjo", "president", "Cameroon", ["chef", "sailor"]],
  ["Manu Dibango", "musician", "Cameroon", ["astronaut", "chef"]],
  ["Idriss Déby", "president", "Chad", ["comedian", "chef"]],
  // ——— West Africa
  ["Fela Kuti", "musician", "Nigeria", ["astronaut", "chef"]],
  ["Chinua Achebe", "novelist", "Nigeria", ["astronaut", "footballer"]],
  ["Wole Soyinka", "playwright", "Nigeria", ["chef", "sailor"]],
  ["Chimamanda Ngozi Adichie", "novelist", "Nigeria", ["astronaut", "chef"]],
  ["Aliko Dangote", "businessman", "Nigeria", ["astronaut", "footballer"]],
  ["Tiwa Savage", "singer", "Nigeria", ["referee", "farmer"]],
  ["Yemi Alade", "singer", "Nigeria", ["chef", "pilot"]],
  ["2Baba", "singer", "Nigeria", ["boxer", "farmer"]],
  ["Don Jazzy", "music producer", "Nigeria", ["astronaut", "farmer"]],
  ["Genevieve Nnaji", "actor", "Nigeria", ["astronaut", "chef"]],
  ["Nnamdi Azikiwe", "president", "Nigeria", ["comedian", "chef"], "Nnamdi Azikiwe was the first president of Nigeria."],
  ["Olusegun Obasanjo", "president", "Nigeria", ["chef", "astronaut"]],
  ["Muhammadu Buhari", "president", "Nigeria", ["comedian", "sailor"]],
  ["Kwame Nkrumah", "president", "Ghana", ["astronaut", "comedian"], "Kwame Nkrumah led Ghana to independence and was its first president."],
  ["Jerry Rawlings", "president", "Ghana", ["chef", "sailor"]],
  ["John Kufuor", "president", "Ghana", ["comedian", "astronaut"]],
  ["Nana Akufo-Addo", "president", "Ghana", ["chef", "pilot"]],
  ["Kofi Annan", "diplomat", "Ghana", ["astronaut", "chef"], "Kofi Annan was Secretary-General of the United Nations."],
  ["Sarkodie", "rapper", "Ghana", ["astronaut", "chef"]],
  ["Stonebwoy", "singer", "Ghana", ["farmer", "pilot"]],
  ["Youssou N’Dour", "singer", "Senegal", ["astronaut", "chef"]],
  ["Sadio Mané", "footballer", "Senegal", ["astronaut", "chef"]],
  ["Baaba Maal", "singer", "Senegal", ["pilot", "farmer"]],
  ["Léopold Sédar Senghor", "president", "Senegal", ["astronaut", "comedian"]],
  ["Salif Keita", "singer", "Mali", ["astronaut", "chef"]],
  ["Ali Farka Touré", "guitarist", "Mali", ["astronaut", "chef"]],
  ["Modibo Keïta", "president", "Mali", ["comedian", "sailor"]],
  ["Félix Houphouët-Boigny", "president", "the Ivory Coast", ["astronaut", "comedian"]],
  ["Alassane Ouattara", "president", "the Ivory Coast", ["comedian", "chef"]],
  ["Yaya Touré", "footballer", "the Ivory Coast", ["astronaut", "chef"]],
  ["Ahmed Sékou Touré", "president", "Guinea", ["astronaut", "comedian"]],
  ["Mory Kanté", "musician", "Guinea", ["astronaut", "chef"]],
  // ——— Southern and Central Africa
  ["Agostinho Neto", "president", "Angola", ["comedian", "chef"], "Agostinho Neto was the first president of Angola."],
  ["José Eduardo dos Santos", "president", "Angola", ["astronaut", "sailor"]],
  ["João Lourenço", "president", "Angola", ["chef", "comedian"]],
  ["Kenneth Kaunda", "president", "Zambia", ["comedian", "chef"], "Kenneth Kaunda was the first president of Zambia."],
  ["Hakainde Hichilema", "president", "Zambia", ["astronaut", "sailor"]],
  ["Robert Mugabe", "president", "Zimbabwe", ["comedian", "chef"]],
  ["Emmerson Mnangagwa", "president", "Zimbabwe", ["astronaut", "sailor"]],
  ["Samora Machel", "president", "Mozambique", ["comedian", "chef"], "Samora Machel was the first president of Mozambique."],
  ["Joaquim Chissano", "president", "Mozambique", ["chef", "pilot"]],
  ["Sam Nujoma", "president", "Namibia", ["comedian", "astronaut"], "Sam Nujoma was the first president of Namibia."],
  ["Seretse Khama", "president", "Botswana", ["astronaut", "comedian"], "Seretse Khama was the first president of Botswana."],
  ["Hugh Masekela", "trumpeter", "South Africa", ["astronaut", "chef"]],
  ["Brenda Fassie", "singer", "South Africa", ["referee", "farmer"]],
  ["Yvonne Chaka Chaka", "singer", "South Africa", ["chef", "pilot"]],
  ["Lucky Dube", "reggae musician", "South Africa", ["astronaut", "chef"]],
  ["Desmond Tutu", "archbishop", "South Africa", ["astronaut", "footballer"]],
  ["Charlize Theron", "actor", "South Africa", ["astronaut", "chef"]],
  ["Thabo Mbeki", "president", "South Africa", ["comedian", "chef"]],
  ["Jacob Zuma", "president", "South Africa", ["astronaut", "sailor"]],
  ["Cyril Ramaphosa", "president", "South Africa", ["chef", "comedian"]],
  // ——— Europe, the Americas and Asia
  ["Elvis Presley", "singer", "the United States", ["astronaut", "footballer"]],
  ["Madonna", "singer", "the United States", ["chef", "referee"]],
  ["Beyoncé", "singer", "the United States", ["astronaut", "pilot"]],
  ["Rihanna", "singer", "Barbados", ["astronaut", "chef"]],
  ["Adele", "singer", "the United Kingdom", ["referee", "farmer"]],
  ["Ed Sheeran", "singer", "the United Kingdom", ["chef", "sailor"]],
  ["Taylor Swift", "singer", "the United States", ["astronaut", "farmer"]],
  ["Paul McCartney", "singer", "the United Kingdom", ["chef", "soldier"]],
  ["John Lennon", "singer", "the United Kingdom", ["astronaut", "sailor"], "John Lennon was a singer of the band The Beatles."],
  ["Elton John", "singer", "the United Kingdom", ["referee", "farmer"]],
  ["Drake", "rapper", "Canada", ["astronaut", "chef"]],
  ["Jay-Z", "rapper", "the United States", ["chef", "pilot"]],
  ["Tupac Shakur", "rapper", "the United States", ["astronaut", "farmer"]],
  ["Eminem", "rapper", "the United States", ["chef", "sailor"]],
  ["Snoop Dogg", "rapper", "the United States", ["farmer", "pilot"]],
  ["50 Cent", "rapper", "the United States", ["astronaut", "chef"]],
  ["Kanye West", "rapper", "the United States", ["chef", "cyclist"]],
  ["Cardi B", "rapper", "the United States", ["astronaut", "farmer"]],
  ["Kendrick Lamar", "rapper", "the United States", ["chef", "sailor"]],
  ["Nicki Minaj", "rapper", "", ["astronaut", "chef"]],
  ["Will Smith", "actor", "the United States", ["astronaut", "chef"]],
  ["Leonardo DiCaprio", "actor", "the United States", ["chef", "sailor"]],
  ["Tom Cruise", "actor", "the United States", ["astronaut", "farmer"]],
  ["Morgan Freeman", "actor", "the United States", ["chef", "cyclist"]],
  ["Samuel L. Jackson", "actor", "the United States", ["astronaut", "chef"]],
  ["Robert Downey Jr.", "actor", "the United States", ["farmer", "pilot"]],
  ["Jackie Chan", "actor", "China", ["astronaut", "chef"]],
  ["Bruce Lee", "martial artist", "", ["astronaut", "chef"]],
  ["Jet Li", "martial artist", "", ["chef", "sailor"]],
  ["Sylvester Stallone", "actor", "the United States", ["chef", "sailor"], "Sylvester Stallone is an actor, best known for Rocky and John Rambo."],
  ["Arnold Schwarzenegger", "actor", "", ["chef", "sailor"]],
  ["John Cena", "professional wrestler", "the United States", ["comedian", "president"]],
  ["The Undertaker", "professional wrestler", "the United States", ["chef", "pilot"]],
  ["Hulk Hogan", "professional wrestler", "the United States", ["astronaut", "chef"]],
  ["Mike Tyson", "boxer", "the United States", ["astronaut", "chef"]],
  ["Muhammad Ali", "boxer", "the United States", ["chef", "sailor"]],
  ["Floyd Mayweather", "boxer", "the United States", ["astronaut", "farmer"]],
  ["Manny Pacquiao", "boxer", "the Philippines", ["chef", "pilot"]],
  ["Eddie Murphy", "comedian", "the United States", ["astronaut", "footballer"]],
  ["Jim Carrey", "comedian", "Canada", ["chef", "sailor"]],
  ["Rowan Atkinson", "comedian", "the United Kingdom", ["astronaut", "farmer"]],
  ["Kevin Hart", "comedian", "the United States", ["chef", "cyclist"]],
  ["Chris Rock", "comedian", "the United States", ["astronaut", "farmer"]],
  ["Dave Chappelle", "comedian", "the United States", ["chef", "sailor"]],
  ["Ellen DeGeneres", "television host", "the United States", ["astronaut", "chef"]],
  ["Steve Harvey", "television host", "the United States", ["farmer", "pilot"]],
  ["Oprah Winfrey", "television host", "the United States", ["astronaut", "chef"]],
  ["Amitabh Bachchan", "actor", "India", ["astronaut", "chef"]],
  ["Shah Rukh Khan", "actor", "India", ["chef", "farmer"]],
  ["Priyanka Chopra", "actor", "India", ["astronaut", "sailor"]],
  ["A. R. Rahman", "music composer", "India", ["astronaut", "chef"]],
  ["Sachin Tendulkar", "cricketer", "India", ["astronaut", "chef"]],
  ["Virat Kohli", "cricketer", "India", ["chef", "farmer"]],
  ["Mahatma Gandhi", "freedom leader", "India", ["astronaut", "chef"], "Mahatma Gandhi led India to independence."],
  ["Jawaharlal Nehru", "prime minister", "India", ["astronaut", "comedian"], "Jawaharlal Nehru was the first prime minister of India."],
  ["Indira Gandhi", "prime minister", "India", ["chef", "sailor"]],
  ["Narendra Modi", "prime minister", "India", ["astronaut", "comedian"]],
  ["Jack Ma", "businessman", "China", ["astronaut", "chef"]],
  ["Yao Ming", "basketball player", "China", ["chef", "sailor"]],
  ["Yuri Gagarin", "astronaut", "Russia", ["chef", "comedian"], "Yuri Gagarin was the first person to travel into space."],
  ["Buzz Aldrin", "astronaut", "the United States", ["chef", "comedian"]],
  ["Mae Jemison", "astronaut", "the United States", ["chef", "sailor"]],
  ["Valentina Tereshkova", "astronaut", "Russia", ["chef", "comedian"], "Valentina Tereshkova was the first woman to travel into space."],
  ["Isaac Newton", "physicist", "the United Kingdom", ["astronaut", "chef"]],
  ["Charles Darwin", "naturalist", "the United Kingdom", ["astronaut", "chef"]],
  ["Nikola Tesla", "inventor", "", ["astronaut", "chef"]],
  ["Galileo Galilei", "astronomer", "Italy", ["astronaut", "chef"]],
  ["Alexander Fleming", "scientist", "the United Kingdom", ["astronaut", "comic actor"], "Alexander Fleming discovered penicillin."],
  ["Louis Pasteur", "scientist", "France", ["astronaut", "chef"]],
  ["Stephen Hawking", "physicist", "the United Kingdom", ["astronaut", "chef"]],
  ["Rosalind Franklin", "scientist", "the United Kingdom", ["astronaut", "chef"]],
  ["Bill Gates", "businessman", "the United States", ["astronaut", "chef"]],
  ["Mark Zuckerberg", "businessman", "the United States", ["astronaut", "chef"]],
  ["Elon Musk", "businessman", "", ["astronaut", "chef"]],
  ["Roger Federer", "tennis player", "Switzerland", ["astronaut", "chef"]],
  ["Rafael Nadal", "tennis player", "Spain", ["astronaut", "chef"]],
  ["Novak Djokovic", "tennis player", "Serbia", ["astronaut", "chef"]],
  ["Venus Williams", "tennis player", "the United States", ["astronaut", "chef"]],
  ["Neymar", "footballer", "Brazil", ["astronaut", "chef"]],
  ["Kylian Mbappé", "footballer", "France", ["astronaut", "chef"]],
  ["Kaká", "footballer", "Brazil", ["astronaut", "chef"]],
  ["Ronaldinho", "footballer", "Brazil", ["astronaut", "chef"]],
  ["Zinédine Zidane", "footballer", "France", ["astronaut", "chef"]],
  ["David Beckham", "footballer", "the United Kingdom", ["astronaut", "chef"]],
  ["Pelé", "footballer", "Brazil", ["astronaut", "chef"]],
  ["Diego Maradona", "footballer", "Argentina", ["astronaut", "chef"]],
  ["LeBron James", "basketball player", "the United States", ["astronaut", "chef"]],
  ["Kobe Bryant", "basketball player", "the United States", ["astronaut", "chef"]],
  ["Magic Johnson", "basketball player", "the United States", ["astronaut", "chef"]],
  ["Shaquille O’Neal", "basketball player", "the United States", ["astronaut", "chef"]],
  ["Stephen Curry", "basketball player", "the United States", ["astronaut", "chef"]],
  ["Giannis Antetokounmpo", "basketball player", "Greece", ["astronaut", "chef"]],
  ["Carl Lewis", "sprinter", "the United States", ["astronaut", "chef"]],
  ["Jesse Owens", "sprinter", "the United States", ["astronaut", "chef"]],
  ["Barack Obama", "president", "the United States", ["astronaut", "comedian"], "Barack Obama was the first Black president of the United States."],
  ["Abraham Lincoln", "president", "the United States", ["astronaut", "comedian"]],
  ["George Washington", "president", "the United States", ["astronaut", "comedian"], "George Washington was the first president of the United States."],
  ["John F. Kennedy", "president", "the United States", ["astronaut", "comedian"]],
  ["Donald Trump", "president", "the United States", ["astronaut", "comedian"]],
  ["Joe Biden", "president", "the United States", ["astronaut", "comedian"]],
  ["Martin Luther King Jr.", "civil rights leader", "the United States", ["astronaut", "chef"]],
  ["Rosa Parks", "civil rights activist", "the United States", ["astronaut", "chef"]],
  ["Winston Churchill", "prime minister", "the United Kingdom", ["astronaut", "comedian"]],
  ["Margaret Thatcher", "prime minister", "the United Kingdom", ["astronaut", "comedian"]],
  ["Tony Blair", "prime minister", "the United Kingdom", ["astronaut", "chef"]],
  ["Angela Merkel", "chancellor", "Germany", ["astronaut", "comedian"]],
  ["Emmanuel Macron", "president", "France", ["astronaut", "comedian"]],
  ["Charles de Gaulle", "president", "France", ["astronaut", "comedian"]],
  ["Vladimir Putin", "president", "Russia", ["astronaut", "comedian"]],
  ["Xi Jinping", "president", "China", ["astronaut", "comedian"]],
  ["Fidel Castro", "president", "Cuba", ["astronaut", "comedian"]],
  ["Che Guevara", "revolutionary", "Argentina", ["astronaut", "chef"]],
  ["Mikhail Gorbachev", "president", "Russia", ["astronaut", "chef"]],
  ["Luiz Inácio Lula da Silva", "president", "Brazil", ["astronaut", "comedian"]],
  ["Jair Bolsonaro", "president", "Brazil", ["astronaut", "chef"]],
  ["Justin Trudeau", "prime minister", "Canada", ["astronaut", "comedian"]],
  ["Jacinda Ardern", "prime minister", "New Zealand", ["astronaut", "chef"]],
];

/**
 * The people who really carry a country, in their own order. A line asking where a person comes from is
 * only ever laid on one of them, so a country left out of the record is never asked about as though it
 * were known, and the lines that ask it are walked without a step being wasted on one of those.
 */
const HOMES = PEOPLE.filter((row) => !!row[2]);

/**
 * The works and the family each one belongs to. A wrong choice is never of the same family as the work
 * the question turns on, so no line of this bank ever puts two works of one kind beside each other.
 */
const FAMILY = {
  singer: "music",
  rapper: "music",
  musician: "music",
  guitarist: "music",
  trumpeter: "music",
  "reggae musician": "music",
  "music composer": "music",
  "music producer": "music",
  footballer: "sport",
  "basketball player": "sport",
  "tennis player": "sport",
  runner: "sport",
  "marathon runner": "sport",
  "long-distance runner": "sport",
  sprinter: "sport",
  boxer: "sport",
  "professional wrestler": "sport",
  cricketer: "sport",
  actor: "screen",
  comedian: "screen",
  "comic actor": "screen",
  "television host": "screen",
  president: "politics",
  "prime minister": "politics",
  chancellor: "politics",
  emperor: "politics",
  politician: "politics",
  "freedom leader": "politics",
  scientist: "science",
  physicist: "science",
  naturalist: "science",
  inventor: "science",
  astronomer: "science",
  astronaut: "science",
  novelist: "letters",
  playwright: "letters",
  businessman: "business",
};

const familyOf = (work) => FAMILY[work] || work;

/** “an artist”, “a singer” — a work said the way it is said. */
function said(work) {
  return /^[aeiou]/i.test(work) ? `an ${work}` : `a ${work}`;
}

/**
 * Two other answers to stand beside the right one: walked at a stride through the whole list, so the
 * same pair is never put up twice, and kept to what the line can use — never the answer the question
 * turns on, and never an answer already standing in the line.
 */
function beside(from, length, want) {
  const out = [];
  for (let step = 1; out.length < 2 && step <= length; step += 1) {
    const value = want((from + step * 17) % length);
    if (value == null || value === "" || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

/** One person's work asked: what they are best known for. */
function roleQuestion(row, id) {
  const [name, work, , wrong, note] = row;
  return challengeQuestion(
    `people:work:${id}`,
    "People & culture",
    "What is ",
    name,
    " best known for?",
    work,
    wrong,
    note || `${name} is best known as ${said(work)}.`
  );
}

/** One person's country asked: where they come from, with two other countries beside it. */
function homeQuestion(row, id) {
  const [name, , country] = row;
  const from = HOMES.indexOf(row);
  const wrong = beside(from, HOMES.length, (at) => {
    const one = HOMES[at];
    if (!one || one === row || one[2] === country) return "";
    return one[2];
  });
  return challengeQuestion(
    `people:home:${id}`,
    "People & culture",
    "Which country does ",
    name,
    " come from?",
    country,
    wrong,
    `${name} comes from ${country}.`
  );
}

/** One work turned round: which of these is known for it — with two other people beside the right one. */
function workTurnedQuestion(row, id) {
  const [name, work] = row;
  const from = PEOPLE.indexOf(row);
  const wrong = beside(from, PEOPLE.length, (at) => {
    const one = PEOPLE[at];
    if (!one || one === row || familyOf(one[1]) === familyOf(work)) return "";
    return one[0];
  });
  // an office is never “best known as”: a line about one reads as it is said — which of these held it
  const office = familyOf(work) === "politics";
  return challengeQuestion(
    `people:turned:${id}`,
    "People & culture",
    office ? "Which of these was " : "Which of these is best known as ",
    said(work),
    "?",
    name,
    wrong,
    `${name} is best known as ${said(work)}.`
  );
}

/** One country turned round: which of these comes from it. */
function homeTurnedQuestion(row, id) {
  const [name, , country] = row;
  const from = HOMES.indexOf(row);
  const wrong = beside(from, HOMES.length, (at) => {
    const one = HOMES[at];
    if (!one || one === row || one[2] === country) return "";
    return one[0];
  });
  return challengeQuestion(
    `people:from:${id}`,
    "People & culture",
    "Which of these comes from ",
    country,
    "?",
    name,
    wrong,
    `${name} comes from ${country}.`
  );
}

/**
 * The leaders of the nations, with the office each one held and the country they held it in. An office
 * is written the way it is said: “a president”, “a prime minister”, “a chancellor”.
 */
const LEADERS = [
  ["Julius Nyerere", "Tanzania", "president"],
  ["Benjamin Mkapa", "Tanzania", "president"],
  ["Jakaya Kikwete", "Tanzania", "president"],
  ["John Magufuli", "Tanzania", "president"],
  ["Samia Suluhu Hassan", "Tanzania", "president"],
  ["Rashidi Kawawa", "Tanzania", "prime minister"],
  ["Edward Sokoine", "Tanzania", "prime minister"],
  ["Cleopa Msuya", "Tanzania", "prime minister"],
  ["Frederick Sumaye", "Tanzania", "prime minister"],
  ["Mizengo Pinda", "Tanzania", "prime minister"],
  ["Kassim Majaliwa", "Tanzania", "prime minister"],
  ["Jomo Kenyatta", "Kenya", "president"],
  ["Daniel arap Moi", "Kenya", "president"],
  ["Mwai Kibaki", "Kenya", "president"],
  ["Uhuru Kenyatta", "Kenya", "president"],
  ["Milton Obote", "Uganda", "president"],
  ["Yoweri Museveni", "Uganda", "president"],
  ["Paul Kagame", "Rwanda", "president"],
  ["Pierre Nkurunziza", "Burundi", "president"],
  ["Salva Kiir", "South Sudan", "president"],
  ["Abiy Ahmed", "Ethiopia", "prime minister"],
  ["Meles Zenawi", "Ethiopia", "prime minister"],
  ["Gamal Abdel Nasser", "Egypt", "president"],
  ["Anwar Sadat", "Egypt", "president"],
  ["Hosni Mubarak", "Egypt", "president"],
  ["Abdel Fattah el-Sisi", "Egypt", "president"],
  ["Kwame Nkrumah", "Ghana", "president"],
  ["Jerry Rawlings", "Ghana", "president"],
  ["John Kufuor", "Ghana", "president"],
  ["Nana Akufo-Addo", "Ghana", "president"],
  ["Nnamdi Azikiwe", "Nigeria", "president"],
  ["Olusegun Obasanjo", "Nigeria", "president"],
  ["Goodluck Jonathan", "Nigeria", "president"],
  ["Muhammadu Buhari", "Nigeria", "president"],
  ["Léopold Sédar Senghor", "Senegal", "president"],
  ["Modibo Keïta", "Mali", "president"],
  ["Félix Houphouët-Boigny", "the Ivory Coast", "president"],
  ["Alassane Ouattara", "the Ivory Coast", "president"],
  ["Ahmed Sékou Touré", "Guinea", "president"],
  ["Ahmadou Ahidjo", "Cameroon", "president"],
  ["Paul Biya", "Cameroon", "president"],
  ["Omar Bongo", "Gabon", "president"],
  ["Denis Sassou Nguesso", "the Republic of the Congo", "president"],
  ["Patrice Lumumba", "the DR Congo", "prime minister"],
  ["Joseph Kasa-Vubu", "the DR Congo", "president"],
  ["Mobutu Sese Seko", "the DR Congo", "president"],
  ["Laurent-Désiré Kabila", "the DR Congo", "president"],
  ["Joseph Kabila", "the DR Congo", "president"],
  ["Félix Tshisekedi", "the DR Congo", "president"],
  ["Agostinho Neto", "Angola", "president"],
  ["José Eduardo dos Santos", "Angola", "president"],
  ["João Lourenço", "Angola", "president"],
  ["Kenneth Kaunda", "Zambia", "president"],
  ["Hakainde Hichilema", "Zambia", "president"],
  ["Robert Mugabe", "Zimbabwe", "president"],
  ["Emmerson Mnangagwa", "Zimbabwe", "president"],
  ["Samora Machel", "Mozambique", "president"],
  ["Joaquim Chissano", "Mozambique", "president"],
  ["Sam Nujoma", "Namibia", "president"],
  ["Seretse Khama", "Botswana", "president"],
  ["Thabo Mbeki", "South Africa", "president"],
  ["Jacob Zuma", "South Africa", "president"],
  ["Cyril Ramaphosa", "South Africa", "president"],
  ["George Washington", "the United States", "president"],
  ["Abraham Lincoln", "the United States", "president"],
  ["Franklin D. Roosevelt", "the United States", "president"],
  ["John F. Kennedy", "the United States", "president"],
  ["Barack Obama", "the United States", "president"],
  ["Donald Trump", "the United States", "president"],
  ["Joe Biden", "the United States", "president"],
  ["Winston Churchill", "the United Kingdom", "prime minister"],
  ["Margaret Thatcher", "the United Kingdom", "prime minister"],
  ["Tony Blair", "the United Kingdom", "prime minister"],
  ["Boris Johnson", "the United Kingdom", "prime minister"],
  ["Charles de Gaulle", "France", "president"],
  ["Emmanuel Macron", "France", "president"],
  ["Angela Merkel", "Germany", "chancellor"],
  ["Olaf Scholz", "Germany", "chancellor"],
  ["Mikhail Gorbachev", "Russia", "president"],
  ["Vladimir Putin", "Russia", "president"],
  ["Xi Jinping", "China", "president"],
  ["Jawaharlal Nehru", "India", "prime minister"],
  ["Indira Gandhi", "India", "prime minister"],
  ["Narendra Modi", "India", "prime minister"],
  ["Fidel Castro", "Cuba", "president"],
  ["Luiz Inácio Lula da Silva", "Brazil", "president"],
  ["Jair Bolsonaro", "Brazil", "president"],
  ["Justin Trudeau", "Canada", "prime minister"],
  ["Jacinda Ardern", "New Zealand", "prime minister"],
];

/** One leader's country asked: which country the office was held in. */
function officeQuestion(row, id) {
  const [name, country, office] = row;
  const from = LEADERS.indexOf(row);
  const wrong = beside(from, LEADERS.length, (at) => {
    const one = LEADERS[at];
    if (!one || one === row || one[1] === country) return "";
    return one[1];
  });
  return challengeQuestion(
    `leaders:of:${id}`,
    "Leaders & nations",
    "Which country was ",
    name,
    ` the ${office} of?`,
    country,
    wrong,
    `${name} was the ${office} of ${country}.`
  );
}

/** One country turned round: which of these held an office in it. */
function whoLedQuestion(row, id) {
  const [name, country, office] = row;
  const from = LEADERS.indexOf(row);
  const wrong = beside(from, LEADERS.length, (at) => {
    const one = LEADERS[at];
    if (!one || one === row || one[1] === country) return "";
    return one[0];
  });
  return challengeQuestion(
    `leaders:who:${id}`,
    "Leaders & nations",
    "Which of these was ",
    said(office),
    ` of ${country}?`,
    name,
    wrong,
    `${name} was ${said(office)} of ${country}.`
  );
}

/** The countries and their capital cities: [the country, its capital city]. */
const CAPITALS = [
  ["Tanzania", "Dodoma"],
  ["Kenya", "Nairobi"],
  ["Uganda", "Kampala"],
  ["Rwanda", "Kigali"],
  ["Ethiopia", "Addis Ababa"],
  ["Somalia", "Mogadishu"],
  ["South Sudan", "Juba"],
  ["Sudan", "Khartoum"],
  ["Egypt", "Cairo"],
  ["Libya", "Tripoli"],
  ["Tunisia", "Tunis"],
  ["Algeria", "Algiers"],
  ["Morocco", "Rabat"],
  ["Nigeria", "Abuja"],
  ["Ghana", "Accra"],
  ["Senegal", "Dakar"],
  ["Mali", "Bamako"],
  ["Guinea", "Conakry"],
  ["Sierra Leone", "Freetown"],
  ["Liberia", "Monrovia"],
  ["Burkina Faso", "Ouagadougou"],
  ["Niger", "Niamey"],
  ["Chad", "N’Djamena"],
  ["Cameroon", "Yaoundé"],
  ["Gabon", "Libreville"],
  ["the Republic of the Congo", "Brazzaville"],
  ["the DR Congo", "Kinshasa"],
  ["the Central African Republic", "Bangui"],
  ["Angola", "Luanda"],
  ["Zambia", "Lusaka"],
  ["Zimbabwe", "Harare"],
  ["Mozambique", "Maputo"],
  ["Malawi", "Lilongwe"],
  ["Botswana", "Gaborone"],
  ["Namibia", "Windhoek"],
  ["Lesotho", "Maseru"],
  ["Madagascar", "Antananarivo"],
  ["Mauritius", "Port Louis"],
  ["the Seychelles", "Victoria"],
  ["the Comoros", "Moroni"],
  ["Djibouti", "Djibouti City"],
  ["Eritrea", "Asmara"],
  ["the United States", "Washington, D.C."],
  ["Canada", "Ottawa"],
  ["Mexico", "Mexico City"],
  ["Brazil", "Brasília"],
  ["Argentina", "Buenos Aires"],
  ["Chile", "Santiago"],
  ["Peru", "Lima"],
  ["Colombia", "Bogotá"],
  ["Venezuela", "Caracas"],
  ["Ecuador", "Quito"],
  ["Paraguay", "Asunción"],
  ["Uruguay", "Montevideo"],
  ["Cuba", "Havana"],
  ["Jamaica", "Kingston"],
  ["the United Kingdom", "London"],
  ["France", "Paris"],
  ["Germany", "Berlin"],
  ["Italy", "Rome"],
  ["Spain", "Madrid"],
  ["Portugal", "Lisbon"],
  ["the Netherlands", "Amsterdam"],
  ["Belgium", "Brussels"],
  ["Switzerland", "Bern"],
  ["Sweden", "Stockholm"],
  ["Norway", "Oslo"],
  ["Denmark", "Copenhagen"],
  ["Finland", "Helsinki"],
  ["Poland", "Warsaw"],
  ["Austria", "Vienna"],
  ["Greece", "Athens"],
  ["Ireland", "Dublin"],
  ["Iceland", "Reykjavík"],
  ["Russia", "Moscow"],
  ["Ukraine", "Kyiv"],
  ["Turkey", "Ankara"],
  ["India", "New Delhi"],
  ["China", "Beijing"],
  ["Japan", "Tokyo"],
  ["South Korea", "Seoul"],
  ["Indonesia", "Jakarta"],
  ["Malaysia", "Kuala Lumpur"],
  ["Thailand", "Bangkok"],
  ["Vietnam", "Hanoi"],
  ["the Philippines", "Manila"],
  ["Pakistan", "Islamabad"],
  ["Bangladesh", "Dhaka"],
  ["Nepal", "Kathmandu"],
  ["Iran", "Tehran"],
  ["Iraq", "Baghdad"],
  ["Saudi Arabia", "Riyadh"],
  ["the United Arab Emirates", "Abu Dhabi"],
  ["Qatar", "Doha"],
  ["Kuwait", "Kuwait City"],
  ["Jordan", "Amman"],
  ["Lebanon", "Beirut"],
  ["Australia", "Canberra"],
  ["New Zealand", "Wellington"],
  ["Fiji", "Suva"],
  ["Papua New Guinea", "Port Moresby"],
];

/** One country's capital asked. */
function capitalQuestion(row, id) {
  const [country, capital] = row;
  const from = CAPITALS.indexOf(row);
  const wrong = beside(from, CAPITALS.length, (at) => {
    const one = CAPITALS[at];
    if (!one || one === row || one[1] === capital) return "";
    return one[1];
  });
  return challengeQuestion(
    `capitals:${id}`,
    "Countries & capitals",
    "What is the capital city of ",
    country,
    "?",
    capital,
    wrong,
    `${capital} is the capital city of ${country}.`
  );
}

/**
 * The facts of every day: the line asked, the one thing it turns on, and the answer — with two other
 * answers beside it that are plainly not it. Written as [the line before the key, the key, the line
 * after it, the right answer, the two wrong ones, what is said of it].
 */
const FACTS = [
  ["What is ", "the longest river in Africa", "?", "The Nile", ["The Congo", "The Zambezi"], "The Nile is the longest river in Africa."],
  ["What is ", "the largest lake in Africa", "?", "Lake Victoria", ["Lake Tanganyika", "Lake Malawi"], "Lake Victoria is the largest lake in Africa."],
  ["What is ", "the deepest lake in Africa", "?", "Lake Tanganyika", ["Lake Victoria", "Lake Chad"], "Lake Tanganyika is the deepest lake in Africa."],
  ["What is ", "the highest mountain in Africa", "?", "Mount Kilimanjaro", ["Mount Kenya", "Mount Elgon"], "Mount Kilimanjaro is the highest mountain in Africa."],
  ["Which country is ", "Mount Kilimanjaro", " in?", "Tanzania", ["Kenya", "Uganda"], "Mount Kilimanjaro stands in Tanzania."],
  ["Which ocean lies ", "along the coast of Tanzania", "?", "The Indian Ocean", ["The Atlantic Ocean", "The Pacific Ocean"], "Tanzania lies on the Indian Ocean."],
  ["Which country ", "shares a border with Tanzania to the north", "?", "Kenya", ["Zambia", "Angola"], "Kenya stands to the north of Tanzania."],
  ["Which country ", "is Zanzibar a part of", "?", "Tanzania", ["Kenya", "Mozambique"], "Zanzibar is part of Tanzania."],
  ["What is ", "the largest city in Tanzania", "?", "Dar es Salaam", ["Dodoma", "Mwanza"], "Dar es Salaam is the largest city in Tanzania."],
  ["What is ", "the official capital of Tanzania", "?", "Dodoma", ["Dar es Salaam", "Arusha"], "Dodoma is the official capital of Tanzania."],
  ["What is ", "the most widely spoken language in Tanzania", "?", "Kiswahili", ["French", "Arabic"], "Kiswahili is the most widely spoken language in Tanzania."],
  ["What is ", "the official language of the Democratic Republic of the Congo", "?", "French", ["Portuguese", "English"], "French is the official language of the Democratic Republic of the Congo."],
  ["What is ", "the largest city in the Democratic Republic of the Congo", "?", "Kinshasa", ["Lubumbashi", "Kisangani"], "Kinshasa is the largest city of the Democratic Republic of the Congo."],
  ["What is ", "the currency of Tanzania", "?", "The Tanzanian shilling", ["The Kenyan shilling", "The Congolese franc"], "Tanzania uses the Tanzanian shilling."],
  ["What is ", "the currency of the Democratic Republic of the Congo", "?", "The Congolese franc", ["The Tanzanian shilling", "The euro"], "The Democratic Republic of the Congo uses the Congolese franc."],
  ["Which country ", "has the city of Goma", "?", "The Democratic Republic of the Congo", ["Rwanda", "Uganda"], "Goma stands in the east of the Democratic Republic of the Congo."],
  ["Which country ", "has the city of Lubumbashi", "?", "The Democratic Republic of the Congo", ["Zambia", "Angola"], "Lubumbashi stands in the Democratic Republic of the Congo."],
  ["Which music ", "and dance style grew up in the Congo", "?", "Rumba", ["Flamenco", "Bluegrass"], "Rumba grew up in the Congo."],
  ["Which of these ", "is a music style of Tanzania", "?", "Bongo Flava", ["Salsa", "K-pop"], "Bongo Flava is a music style of Tanzania."],
  ["Which of these ", "is a dance music style of the Congo", "?", "Soukous", ["Reggaeton", "Polka"], "Soukous is a dance music style of the Congo."],
  ["Which of these ", "is a percussion instrument", "?", "The drum", ["The flute", "The violin"], "A drum is played by striking it."],
  ["Which of these ", "is a string instrument", "?", "The guitar", ["The trumpet", "The drum"], "A guitar is played on strings."],
  ["Which of these ", "is a wind instrument", "?", "The flute", ["The guitar", "The drum"], "A flute is played with the breath."],
  ["Which of these ", "is a keyboard instrument", "?", "The piano", ["The trumpet", "The drum"], "A piano is played with keys."],
  ["Which of these ", "is a large drum played in many African ceremonies", "?", "The djembe", ["The harp", "The saxophone"], "The djembe is a large hand drum."],
  ["How many ", "players of one football team stand on the pitch", "?", "Eleven", ["Nine", "Thirteen"], "A football team plays with eleven players."],
  ["In which sport ", "do players use a racket and a shuttlecock", "?", "Badminton", ["Football", "Swimming"], "Badminton uses a racket and a shuttlecock."],
  ["Which of these ", "is a board game of skill", "?", "Chess", ["Football", "Cycling"], "Chess is a board game of skill."],
  ["Which of these ", "is played with a hoop and a ball", "?", "Basketball", ["Cricket", "Boxing"], "Basketball is played with a hoop and a ball."],
  ["In which sport ", "does a runner finish a long race on the road", "?", "The marathon", ["The relay sprint", "The high jump"], "A marathon is a long race on the road."],
  ["What is ", "the largest planet", "?", "Jupiter", ["Mars", "Venus"], "Jupiter is the largest planet."],
  ["What is ", "the planet we live on", "?", "Earth", ["Mars", "Saturn"], "We live on Earth."],
  ["What is ", "the closest star to the Earth", "?", "The Sun", ["Mars", "The Moon"], "The Sun is the closest star to us."],
  ["Which of these ", "is a mammal", "?", "The elephant", ["The crocodile", "The eagle"], "An elephant is a mammal."],
  ["Which of these ", "is a bird that cannot fly", "?", "The ostrich", ["The eagle", "The dove"], "The ostrich cannot fly."],
  ["Which of these ", "is the fastest land animal", "?", "The cheetah", ["The elephant", "The cow"], "The cheetah is the fastest land animal."],
  ["Which of these ", "is the largest land animal", "?", "The African elephant", ["The giraffe", "The zebra"], "The African elephant is the largest land animal."],
  ["Which of these ", "is the tallest animal", "?", "The giraffe", ["The zebra", "The lion"], "The giraffe is the tallest animal."],
  ["Which of these ", "is the largest animal in the ocean", "?", "The blue whale", ["The shark", "The dolphin"], "The blue whale is the largest animal in the ocean."],
  ["Which of these ", "is a big cat found in Africa", "?", "The lion", ["The tiger", "The panda"], "The lion lives in Africa."],
  ["Which of these ", "gives us milk on the farm", "?", "The cow", ["The hen", "The bee"], "A cow gives milk."],
  ["Which of these ", "is a crop grown in Tanzania", "?", "Cassava", ["Olives", "Dates"], "Cassava is grown in Tanzania."],
  ["Which of these ", "is used to pound grain", "?", "The mortar and pestle", ["The needle", "The razor"], "Grain is pounded with a mortar and pestle."],
  ["Which of these ", "is a tool of the farm", "?", "The hoe", ["The kettle", "The mirror"], "A hoe is a tool of the farm."],
  ["Which of these ", "is a means of transport on water", "?", "The boat", ["The bicycle", "The train"], "A boat travels on water."],
  ["Which of these ", "is a means of transport in the air", "?", "The aeroplane", ["The canoe", "The lorry"], "An aeroplane travels in the air."],
  ["Which of these ", "is used to write on a blackboard", "?", "Chalk", ["A needle", "A spoon"], "A blackboard is written on with chalk."],
  ["Which of these ", "is used to cut cloth", "?", "Scissors", ["A hammer", "A spoon"], "Cloth is cut with scissors."],
  ["Which of these ", "is a source of light in the night", "?", "The lamp", ["The mirror", "The pillow"], "A lamp gives light in the night."],
  ["How many ", "days stand in one week", "?", "Seven", ["Five", "Ten"], "A week has seven days."],
  ["How many ", "months stand in one year", "?", "Twelve", ["Ten", "Twenty"], "A year has twelve months."],
  ["How many ", "minutes stand in one hour", "?", "Sixty", ["Thirty", "One hundred"], "An hour has sixty minutes."],
  ["How many ", "sides has a triangle", "?", "Three", ["Four", "Five"], "A triangle has three sides."],
  ["How many ", "legs has a spider", "?", "Eight", ["Six", "Four"], "A spider has eight legs."],
  ["How many ", "continents stand on Earth", "?", "Seven", ["Five", "Ten"], "The Earth has seven continents."],
  ["Which continent ", "is the coldest", "?", "Antarctica", ["Africa", "South America"], "Antarctica is the coldest continent."],
  ["Which continent ", "is the largest", "?", "Asia", ["Africa", "Europe"], "Asia is the largest continent."],
  ["Which ocean ", "is the largest", "?", "The Pacific Ocean", ["The Indian Ocean", "The Arctic Ocean"], "The Pacific is the largest ocean."],
  ["Which country ", "has the largest population in Africa", "?", "Nigeria", ["Egypt", "South Africa"], "Nigeria has the largest population in Africa."],
  ["Which country ", "is the largest in Africa by area", "?", "Algeria", ["Nigeria", "Kenya"], "Algeria is the largest country in Africa by area."],
  ["Which of these ", "countries is in East Africa", "?", "Uganda", ["Ghana", "Morocco"], "Uganda is a country of East Africa."],
  ["Which of these ", "countries is in West Africa", "?", "Ghana", ["Kenya", "Zambia"], "Ghana is a country of West Africa."],
  ["Which of these ", "countries is in North Africa", "?", "Egypt", ["Angola", "Botswana"], "Egypt is a country of North Africa."],
  ["Which of these ", "countries is in Southern Africa", "?", "Zambia", ["Senegal", "Egypt"], "Zambia is a country of Southern Africa."],
  ["Which of these ", "countries is in Central Africa", "?", "Cameroon", ["Kenya", "Tunisia"], "Cameroon is a country of Central Africa."],
  ["Which of these ", "countries is in Europe", "?", "Italy", ["Thailand", "Peru"], "Italy is a country of Europe."],
  ["Which of these ", "countries is in Asia", "?", "Japan", ["Brazil", "Spain"], "Japan is a country of Asia."],
  ["Which of these ", "countries is in South America", "?", "Brazil", ["Canada", "India"], "Brazil is a country of South America."],
  ["Which of these ", "countries is in North America", "?", "Canada", ["Egypt", "Nepal"], "Canada is a country of North America."],
  ["Which of these ", "is the largest desert in Africa", "?", "The Sahara", ["The Kalahari", "The Namib"], "The Sahara is the largest desert in Africa."],
  ["Which of these ", "is a river that flows through the Congo", "?", "The Congo River", ["The Nile", "The Limpopo"], "The Congo River flows through the Congo."],
  ["Which of these ", "is a rainforest of the Congo", "?", "The Congo Basin forest", ["The Amazon rainforest", "The taiga"], "The Congo Basin holds a vast rainforest."],
  ["Which of these ", "animals lives in the Congo River", "?", "The hippopotamus", ["The polar bear", "The camel"], "Hippopotamuses live in the Congo River."],
  ["Which of these ", "is a lake in Africa", "?", "Lake Malawi", ["Lake Baikal", "Lake Como"], "Lake Malawi stands in Africa."],
  ["Which of these ", "is a waterfall on the Zambezi", "?", "Victoria Falls", ["Niagara Falls", "The Blue Nile Falls"], "Victoria Falls stands on the Zambezi."],
  ["Which of these ", "is a mountain range in South America", "?", "The Andes", ["The Alps", "The Himalayas"], "The Andes stand in South America."],
  ["Which of these ", "is a mountain range in Europe", "?", "The Alps", ["The Andes", "The Atlas"], "The Alps stand in Europe."],
  ["Which of these ", "is a desert in Asia", "?", "The Gobi", ["The Sahara", "The Kalahari"], "The Gobi stands in Asia."],
  ["Which of these ", "is the highest mountain in the world", "?", "Mount Everest", ["Mount Kilimanjaro", "Mount Kenya"], "Mount Everest is the highest mountain in the world."],
  ["Which of these ", "is the longest river in South America", "?", "The Amazon", ["The Nile", "The Danube"], "The Amazon is the longest river in South America."],
  ["Which of these ", "is the largest country in South America", "?", "Brazil", ["Argentina", "Peru"], "Brazil is the largest country in South America."],
  ["Which of these ", "is the biggest island in the world", "?", "Greenland", ["Madagascar", "Zanzibar"], "Greenland is the biggest island in the world."],
  ["Which of these ", "is a football competition between African national teams", "?", "The Africa Cup of Nations", ["The World Cup", "The Champions League"], "The Africa Cup of Nations is for African national teams."],
  ["Which of these ", "countries uses the euro", "?", "Germany", ["Nigeria", "Tanzania"], "Germany uses the euro."],
  ["Which of these ", "is the currency of Kenya", "?", "The Kenyan shilling", ["The euro", "The dollar"], "Kenya uses the Kenyan shilling."],
  ["Which of these ", "is the currency of the United States", "?", "The dollar", ["The shilling", "The franc"], "The United States uses the dollar."],
  ["Which of these ", "is a country in the Caribbean", "?", "Cuba", ["Nepal", "Switzerland"], "Cuba is a country in the Caribbean."],
  ["Which of these ", "is a country of the Middle East", "?", "Saudi Arabia", ["Brazil", "Sweden"], "Saudi Arabia is a country of the Middle East."],
  ["Which of these ", "is a country of Oceania", "?", "Fiji", ["Morocco", "Bolivia"], "Fiji is a country of Oceania."],
  ["Which of these ", "is the language of the Babembe people", "?", "Kibembe", ["Kiswahili", "French"], "The Babembe people speak Kibembe."],
  ["Which of these ", "was the first president of Tanzania", "?", "Julius Nyerere", ["Jakaya Kikwete", "Samia Suluhu Hassan"], "Julius Nyerere was the first president of Tanzania."],
  ["Which of these ", "was the first president of Ghana", "?", "Kwame Nkrumah", ["Robert Mugabe", "Paul Biya"], "Kwame Nkrumah was the first president of Ghana."],
  ["Which of these ", "was the first president of Kenya", "?", "Jomo Kenyatta", ["Sam Nujoma", "Milton Obote"], "Jomo Kenyatta was the first president of Kenya."],
  ["Which of these ", "was the first prime minister of the Democratic Republic of the Congo", "?", "Patrice Lumumba", ["Mobutu Sese Seko", "Joseph Kabila"], "Patrice Lumumba was the first prime minister of the Democratic Republic of the Congo."],
  ["Which of these ", "is a city on the shore of Lake Victoria", "?", "Mwanza", ["Dodoma", "Morogoro"], "Mwanza stands on the shore of Lake Victoria."],
  ["Which of these ", "is a city in the east of the Democratic Republic of the Congo", "?", "Bukavu", ["Accra", "Kigali"], "Bukavu stands in the east of the Democratic Republic of the Congo."],
  ["Which actor ", "played the character John Rambo", "?", "Sylvester Stallone", ["Kevin Hart", "Rowan Atkinson"], "Sylvester Stallone played John Rambo."],
  ["Which of these ", "is a Kenyan writer", "?", "Ngũgĩ wa Thiong’o", ["Ronaldinho", "Novak Djokovic"], "Ngũgĩ wa Thiong’o is a Kenyan writer."],
  ["Which of these ", "is a Nigerian writer", "?", "Chinua Achebe", ["Yao Ming", "Neymar"], "Chinua Achebe was a Nigerian writer."],
  ["Which of these ", "is a South African singer", "?", "Yvonne Chaka Chaka", ["Roger Federer", "Isaac Newton"], "Yvonne Chaka Chaka is a South African singer."],
  ["Which of these ", "was Secretary-General of the United Nations", "?", "Kofi Annan", ["Mike Tyson", "Jack Ma"], "Kofi Annan was Secretary-General of the United Nations."],
  ["Which of these ", "was the first person to travel into space", "?", "Yuri Gagarin", ["Neil Armstrong", "Buzz Aldrin"], "Yuri Gagarin was the first person in space."],
  ["Which of these ", "was the first woman to travel into space", "?", "Valentina Tereshkova", ["Mae Jemison", "Rosalind Franklin"], "Valentina Tereshkova was the first woman in space."],
  ["Which of these ", "discovered penicillin", "?", "Alexander Fleming", ["Louis Pasteur", "Isaac Newton"], "Alexander Fleming discovered penicillin."],
];

/** One fact asked. */
function factQuestion(row, id) {
  const [lead, key, tail, right, wrong, explain] = row;
  return challengeQuestion(`facts:${id}`, "Everyday knowledge", lead, key, tail, right, wrong, explain);
}

/**
 * One episode's paper of the newest kind: nine questions, each of another sort, cut from the records
 * above at a stride of the episode's own — so two papers never ask the same question twice, and a
 * paper carries a person's work and country, the same turned round, a leader, a capital and a fact.
 *
 * The people are walked by twos and the turned lines by their own stride, so a person is never asked
 * about twice in one paper and no question of this bank is handed out again anywhere in the season.
 */
export function bankPaper(index) {
  const at = Math.max(0, Math.floor(Number(index) || 0));
  const people = PEOPLE.length;
  const homes = HOMES.length;
  const paper = [
    roleQuestion(PEOPLE[(2 * at) % people], `${at}a`),
    roleQuestion(PEOPLE[(2 * at + 1) % people], `${at}b`),
    homeQuestion(HOMES[(2 * at + 87) % homes], `${at}a`),
    homeQuestion(HOMES[(2 * at + 88) % homes], `${at}b`),
    workTurnedQuestion(PEOPLE[(2 * at + 45) % people], `${at}`),
    homeTurnedQuestion(HOMES[(2 * at + 137) % homes], `${at}`),
    // the leaders are walked one to a paper, and each one is asked both ways — the country of the
    // office, and the holder of it — so no leader is asked twice and no two papers ask them alike
    at % 2 === 0
      ? officeQuestion(LEADERS[Math.floor(at / 2) % LEADERS.length], `${at}`)
      : whoLedQuestion(LEADERS[Math.floor(at / 2) % LEADERS.length], `${at}`),
    capitalQuestion(CAPITALS[at % CAPITALS.length], `${at}`),
    factQuestion(FACTS[at % FACTS.length], `${at}`),
  ];
  return shuffled(paper.filter(Boolean));
}