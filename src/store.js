'use strict';

/**
 * Tiny JSON-file datastore. Every Google user who signs in gets a record;
 * their survey answers are stored on that record when they submit.
 *
 * File layout (DATA_DIR/db.json):
 * { "users": { "<googleId>": { id, email, name, picture, firstLoginAt, lastLoginAt,
 *                               response: { answers, submittedAt, updatedAt, edits } | null } } }
 *
 * Writes are serialised and atomic (write temp file, then rename), so a crash
 * mid-write never corrupts the database.
 */
const fs = require('fs');
const path = require('path');

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'db.json');
    fs.mkdirSync(dir, { recursive: true });
    this.data = { users: {} };
    if (fs.existsSync(this.file)) {
      const raw = fs.readFileSync(this.file, 'utf8');
      if (raw.trim()) this.data = JSON.parse(raw);
      if (!this.data.users) this.data.users = {};
    }
    this.queue = Promise.resolve();
  }

  persist() {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.queue = this.queue.then(async () => {
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, snapshot, 'utf8');
      await fs.promises.rename(tmp, this.file);
    });
    return this.queue;
  }

  getUser(id) {
    return this.data.users[id] || null;
  }

  async upsertLogin({ id, email, name, picture }) {
    const now = new Date().toISOString();
    const existing = this.data.users[id];
    this.data.users[id] = {
      id,
      email,
      name: name || email,
      picture: picture || '',
      firstLoginAt: existing ? existing.firstLoginAt : now,
      lastLoginAt: now,
      response: existing ? existing.response : null,
    };
    await this.persist();
    return this.data.users[id];
  }

  async saveResponse(id, answers) {
    const user = this.data.users[id];
    if (!user) throw new Error('Unknown user');
    const now = new Date().toISOString();
    const prev = user.response;
    user.response = {
      answers,
      submittedAt: prev ? prev.submittedAt : now,
      updatedAt: now,
      edits: prev ? (prev.edits || 0) + 1 : 0,
    };
    await this.persist();
    return user.response;
  }

  async deleteResponse(id) {
    const user = this.data.users[id];
    if (!user) return false;
    user.response = null;
    await this.persist();
    return true;
  }

  allUsers() {
    return Object.values(this.data.users);
  }
}

module.exports = { Store };
