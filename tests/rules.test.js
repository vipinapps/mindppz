// Firestore security rules tests. Run with `npm test` (starts the Firestore emulator).
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, Timestamp,
} from 'firebase/firestore';
import { survey, validateAnswers } from '../public/js/survey-data.js';

const PROJECT = 'demo-research-voices';
let env;

const google = (uid, email) => ({
  email, email_verified: true, firebase: { sign_in_provider: 'google.com' },
});

// A complete, valid set of answers.
const raw = {};
for (const q of survey.questions) {
  if (q.type === 'text') raw[q.id] = { text: 'A single place for funding and deadlines' };
  else raw[q.id] = { selected: [q.options[0].id] };
}
const answers = validateAnswers(raw).answers;

function response(email, extra = {}) {
  return {
    email, name: 'Anu', picture: '', answers,
    submittedAt: serverTimestamp(), updatedAt: serverTimestamp(), edits: 0, ...extra,
  };
}

const alice = () => env.authenticatedContext('alice', google('alice', 'alice@gmail.com')).firestore();
const bob = () => env.authenticatedContext('bob', google('bob', 'bob@gmail.com')).firestore();
const admin = () => env.authenticatedContext('admin1', {
  email: 'chinnu@researchvoices.example.com', email_verified: false, firebase: { sign_in_provider: 'password' },
}).firestore();
const nonAdminPassword = () => env.authenticatedContext('mallory', {
  email: 'mallory@example.com', email_verified: false, firebase: { sign_in_provider: 'password' },
}).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins/admin1'), { role: 'admin' });
  });
});

describe('responses', () => {
  test('a Google user can submit and read their own answers', async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, 'responses/alice'), response('alice@gmail.com')));
    await assertSucceeds(getDoc(doc(db, 'responses/alice')));
  });

  test('signed-out visitors cannot read or write', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'responses/alice'), response('alice@gmail.com')));
    await assertFails(getDoc(doc(db, 'responses/alice')));
  });

  test('users cannot write or read someone else\'s answers', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'responses/alice'), response('alice@gmail.com')));
    await assertFails(getDoc(doc(bob(), 'responses/alice')));
    await assertFails(setDoc(doc(bob(), 'responses/alice'), response('bob@gmail.com')));
    await assertFails(getDocs(collection(bob(), 'responses')));
  });

  test('email must match the signed-in Google account', async () => {
    await assertFails(setDoc(doc(alice(), 'responses/alice'), response('someone@gmail.com')));
  });

  test('password (non-Google) accounts cannot submit', async () => {
    await assertFails(setDoc(doc(nonAdminPassword(), 'responses/mallory'), response('mallory@example.com')));
  });

  test('client cannot fake timestamps or edit counts', async () => {
    await assertFails(setDoc(doc(alice(), 'responses/alice'),
      response('alice@gmail.com', { submittedAt: Timestamp.fromMillis(0) })));
    await assertFails(setDoc(doc(alice(), 'responses/alice'), response('alice@gmail.com', { edits: 5 })));
  });

  test('answers must follow the survey rules', async () => {
    const bad = (patch) => response('alice@gmail.com', { answers: { ...answers, ...patch } });
    const db = alice();
    // more than 3 on an "up to 3" question
    await assertFails(setDoc(doc(db, 'responses/alice'), bad({ q2: { selected: ['scattered', 'outdated', 'funding', 'supervisors'] } })));
    // two answers on a single-choice question
    await assertFails(setDoc(doc(db, 'responses/alice'), bad({ q4: { selected: ['yes', 'some'] } })));
    // unknown option id
    await assertFails(setDoc(doc(db, 'responses/alice'), bad({ q3: { selected: ['hacked'] } })));
    // duplicate selections
    await assertFails(setDoc(doc(db, 'responses/alice'), bad({ q2: { selected: ['scattered', 'scattered'] } })));
    // "Other" without specifying
    await assertFails(setDoc(doc(db, 'responses/alice'), bad({ q1: { selected: ['other'] } })));
    // "other" text without choosing Other
    await assertFails(setDoc(doc(db, 'responses/alice'), bad({ q1: { selected: ['linkedin'], other: 'x' } })));
    // empty open-ended answer
    await assertFails(setDoc(doc(db, 'responses/alice'), bad({ q10: { text: '' } })));
    // missing question
    const { q9, ...missing } = answers;
    await assertFails(setDoc(doc(db, 'responses/alice'), response('alice@gmail.com', { answers: missing })));
    // extra field
    await assertFails(setDoc(doc(db, 'responses/alice'), response('alice@gmail.com', { isAdmin: true })));
    // "Other" with text is fine
    await assertSucceeds(setDoc(doc(db, 'responses/alice'), bad({ q1: { selected: ['findaphd', 'other'], other: 'Twitter' } })));
  });

  test('updating keeps submittedAt and increments edits', async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, 'responses/alice'), response('alice@gmail.com')));
    const first = (await getDoc(doc(db, 'responses/alice'))).data();
    await assertFails(setDoc(doc(db, 'responses/alice'), response('alice@gmail.com', { submittedAt: first.submittedAt, edits: 0 })));
    await assertFails(setDoc(doc(db, 'responses/alice'), response('alice@gmail.com', { edits: 1 })));
    await assertSucceeds(setDoc(doc(db, 'responses/alice'), response('alice@gmail.com', { submittedAt: first.submittedAt, edits: 1 })));
  });

  test('only an admin can list and delete responses', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'responses/alice'), response('alice@gmail.com')));
    await assertSucceeds(getDocs(collection(admin(), 'responses')));
    await assertSucceeds(getDoc(doc(admin(), 'responses/alice')));
    await assertFails(getDocs(collection(nonAdminPassword(), 'responses')));
    await assertFails(deleteDoc(doc(alice(), 'responses/alice')));
    await assertSucceeds(deleteDoc(doc(admin(), 'responses/alice')));
  });

  test('an admin cannot submit or change answers', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'responses/alice'), response('alice@gmail.com')));
    await assertFails(setDoc(doc(admin(), 'responses/alice'), response('alice@gmail.com', { edits: 1 })));
  });
});

describe('users', () => {
  const profile = (email, extra = {}) => ({
    email, name: 'Alice', picture: '', firstLoginAt: serverTimestamp(), lastLoginAt: serverTimestamp(), ...extra,
  });

  test('a Google user can create and update their profile', async () => {
    const db = alice();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile('alice@gmail.com')));
    const first = (await getDoc(doc(db, 'users/alice'))).data();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), profile('alice@gmail.com', { firstLoginAt: first.firstLoginAt })));
    await assertFails(setDoc(doc(db, 'users/alice'), profile('alice@gmail.com')));
  });

  test('profiles are private except to the admin', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), profile('alice@gmail.com')));
    await assertFails(getDoc(doc(bob(), 'users/alice')));
    await assertFails(getDocs(collection(bob(), 'users')));
    await assertSucceeds(getDocs(collection(admin(), 'users')));
  });
});

describe('admins', () => {
  test('nobody can make themselves admin', async () => {
    await assertFails(setDoc(doc(nonAdminPassword(), 'admins/mallory'), { role: 'admin' }));
    await assertFails(setDoc(doc(alice(), 'admins/alice'), { role: 'admin' }));
    await assertFails(setDoc(doc(admin(), 'admins/mallory'), { role: 'admin' }));
  });

  test('an account can check only its own admin flag', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'admins/admin1')));
    await assertSucceeds(getDoc(doc(nonAdminPassword(), 'admins/mallory')));
    await assertFails(getDoc(doc(nonAdminPassword(), 'admins/admin1')));
    await assertFails(getDocs(collection(admin(), 'admins')));
  });
});

describe('everything else', () => {
  test('other collections are closed', async () => {
    await assertFails(setDoc(doc(alice(), 'other/x'), { a: 1 }));
    await assertFails(getDoc(doc(admin(), 'other/x')));
  });
});
