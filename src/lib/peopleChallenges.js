import { challengeQuestion } from '@/lib/challengeQuestions';
import { PEOPLE_PICTURES } from '@/lib/examImages';
import { shuffled } from '@/lib/examSeries';
import { BANK_PER_PAPER, bankPaper } from '@/lib/peopleBank';

/**
 * The season of people and culture, in two runs.
 *
 * The first three episodes stand on the people whose own photographs the app holds, so the face is
 * learnt with the name. Every episode after them is cut from the bank in peopleBank.js — the people of
 * Tanzania, the Congo and the world with their work and their country, the leaders of the nations, the
 * capital cities and the facts of every day — nine questions an episode, walked so that no question of
 * the season is ever asked twice.
 */

/** How many episodes of the season stand on the people's own photographs. */
export const PHOTO_EPISODES = 3;

/** How many episodes of the season the bank in peopleBank.js fills. */
export const NEW_EPISODES = 95;

/** Every episode of the season: the photographed run, and the run cut from the bank. */
export function peopleEpisodes() {
  return PHOTO_EPISODES + NEW_EPISODES;
}

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

/**
 * One episode's paper: the ten photographed people of the first run, and the nine questions of the bank
 * for every episode after it. The picture puzzle stands at the end of both — written over the tenth
 * place of a photographed paper, and stood at the end of a paper the bank leaves a question short.
 */
export function buildPeoplePaper(episode) {
  const no = Math.max(1, Math.floor(Number(episode) || 1));
  if (no > PHOTO_EPISODES) return bankPaper(no - PHOTO_EPISODES - 1);

  const from = (no - 1) * (BANK_PER_PAPER + 1);
  const photographed = PEOPLE.slice(from, from + BANK_PER_PAPER + 1);
  const paper = photographed.map(([name, role, wrong], at) =>
    challengeQuestion(
      `people:${no}:${at}`,
      'People & culture',
      'What is ',
      name,
      ' best known for?',
      role,
      wrong,
      `${name} is known as ${said(role)}.`,
      PEOPLE_PICTURES[name]?.url ? PEOPLE_PICTURES[name] : null
    )
  );
  // the tenth place of a photographed paper is the picture puzzle's, so the ten people are laid in the
  // order they stand and the place the puzzle takes is left to the examination itself
  return [...shuffled(paper.slice(0, BANK_PER_PAPER)), paper[BANK_PER_PAPER]];
}