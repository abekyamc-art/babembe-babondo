import { challengeQuestion } from '@/lib/challengeQuestions';
import { PEOPLE_PICTURES } from '@/lib/examImages';
import { shuffled } from '@/lib/examSeries';

/**
 * The people the examination asks about, each with the work they are known for. Every one of them is
 * met on their own real photograph, so the student learns the face with the name. Gloire Sadiki stands
 * with the place his photograph will fill: the picture is shown as soon as the owner gives one.
 */
const PEOPLE = [
  ['Diamond Platnumz', 'Artist', ['Comedian', 'President']],
  ['Gloire Sadiki', 'Artist', ['Comedian', 'President']],
  ['Koffi Olomide', 'Singer', ['Astronaut', 'Footballer']],
  ['Fally Ipupa', 'Singer', ['Astronaut', 'Tennis player']],
  ['Papa Wemba', 'Singer', ['Scientist', 'Footballer']],
  ['Wizkid', 'Singer', ['Astronaut', 'President']],
  ['Burna Boy', 'Singer', ['Scientist', 'Footballer']],
  ['Davido', 'Singer', ['Astronaut', 'President']],
  ['Miriam Makeba', 'Singer', ['Footballer', 'Astronaut']],
  ['Angelique Kidjo', 'Singer', ['Astronaut', 'Tennis player']],
  ['Bob Marley', 'Reggae musician', ['Astronaut', 'Footballer']],
  ['Michael Jackson', 'Singer', ['Astronaut', 'President']],
  ['Whitney Houston', 'Singer', ['Scientist', 'Footballer']],
  ['Celine Dion', 'Singer', ['Astronaut', 'Tennis player']],
  ['Lupita Nyong’o', 'Actor', ['Astronaut', 'Footballer']],
  ['Denzel Washington', 'Actor', ['Astronaut', 'President']],
  ['Charlie Chaplin', 'Comic actor', ['Astronaut', 'Footballer']],
  ['Trevor Noah', 'Comedian', ['Astronaut', 'President']],
  ['Lionel Messi', 'Footballer', ['Astronaut', 'Comedian']],
  ['Cristiano Ronaldo', 'Footballer', ['Scientist', 'Comedian']],
  ['Didier Drogba', 'Footballer', ['Astronaut', 'Comedian']],
  ['Samuel Eto’o', 'Footballer', ['Scientist', 'Comedian']],
  ['Serena Williams', 'Tennis player', ['Astronaut', 'President']],
  ['Usain Bolt', 'Sprinter', ['Astronaut', 'Comedian']],
  ['Michael Jordan', 'Basketball player', ['Astronaut', 'President']],
  ['Albert Einstein', 'Physicist', ['Footballer', 'Comedian']],
  ['Marie Curie', 'Scientist', ['Footballer', 'Comedian']],
  ['Neil Armstrong', 'Astronaut', ['Footballer', 'Comedian']],
  ['Nelson Mandela', 'Former South African president', ['Astronaut', 'Comedian']],
  ['Wangari Maathai', 'Environmental activist', ['Footballer', 'Comedian']],
];

/** “an artist”, “a singer” — the work said the way it is said. */
function said(role) {
  return /^[aeiou]/i.test(role) ? `an ${role.toLowerCase()}` : `a ${role.toLowerCase()}`;
}

/** One episode's paper of ten people, each on their own photograph. */
export function buildPeoplePaper(episode) {
  const from = (episode - 1) * 10;
  return shuffled(
    PEOPLE.slice(from, from + 10).map(([name, role, wrong], at) =>
      challengeQuestion(
        `people:${episode}:${at}`,
        'People & culture',
        'What is ',
        name,
        ' best known for?',
        role,
        wrong,
        `${name} is known as ${said(role)}.`,
        PEOPLE_PICTURES[name]?.url ? PEOPLE_PICTURES[name] : null
      )
    )
  );
}