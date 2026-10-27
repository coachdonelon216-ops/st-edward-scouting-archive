const test = require('node:test');
const assert = require('node:assert/strict');
const {passwordHash,verifyPassword,pool} = require('./auth');

test('password hashing creates a salted non-plaintext value', () => {
  const first=passwordHash('ExampleStrongPassphrase123!');
  const second=passwordHash('ExampleStrongPassphrase123!');
  assert.match(first,/^scrypt:[0-9a-f]+:[0-9a-f]+$/);
  assert.notEqual(first,second);
  assert.equal(first.includes('ExampleStrongPassphrase123!'),false);
});

test('password verifier accepts correct password and rejects incorrect password', () => {
  const stored=passwordHash('ExampleStrongPassphrase123!');
  assert.equal(verifyPassword('ExampleStrongPassphrase123!',stored),true);
  assert.equal(verifyPassword('WrongPassphrase123!',stored),false);
});

test('password verifier rejects invalid stored formats', () => {
  for(const value of ['',null,'plaintext','scrypt:broken:bad','argon2:a:b']){
    assert.equal(verifyPassword('anything',value),false);
  }
});

test.after(async()=>{await pool.end()});
