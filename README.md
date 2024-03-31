# unicorn
A funny encryption algorithm I made for fun 
(still very buggy and extra padding might show up in result + newlines do not function properly)

# Usage
```js
let unicorn = require('./unicorn');
// encrypting
let s = fs.readFileSync('lorem_ipsum.txt').toString(); // reads a file containing Lorem ipsum filler text
let v = unicorn.encrypt_blocks(s, 'keys'); // encrypts lorem ipsum & saves keys to a folder named 'keys'
fs.writeFileSync('.encrypted', unicorn.export_blocks(v.blocks)); // exports encrypted result to a file named .encrypted
fs.writeFileSync('.sec_key', unicorn.export_sec_key(v.secondary_key)); // exports secondary key to a file named .sec_key
// decrypting, in a scenario where we are in a different script
let decoded_pkey = unicorn.decode_blocks(fs.readFileSync('.encrypted').toString()); // reads encrypted file + decodes it into machine-readable data
let decoded_skey = unicorn.decode_sec_key(fs.readFileSync('.sec_key').toString());  // reads secondary key and decodes

let x = unicorn.decrypt_blocks(decoded_pkey, decoded_skey, 'keys'); // decrypts machine-readable blocks into plain text
console.log(x); // Lorem ipsum dolor sit amet...
```

# Security (in theory)
Unicorn should be somewhat secure, as its design makes bruteforcing virtually impossible even with modern technology. However, since it is not like other algorithms and has a very unique design, it is not very easy to compare well-established algorithms to Unicorn.

Unicorn works by generating a plugboard (array of 8-32 random bits) and a main vector (array of 8-32 random values, 0-256). An encrypted string is split up into "blocks" of 32 or less characters in order to be able to correctly handle large strings and add a layer of security while at it.

The algorithm uses the main vector to determine what numbers to be used for doing a XOR operation on a character and the plugboard to determine which characters get picked for XOR to be used on (both of these use `crypto`'s unpredictable RNG).

When ran, it will loop through each character in the block's string, find the plugboard and continue if the value at the plugboard is a 1, then if it is a 1 it will look for the current value in the main vector then XOR the current character by the current number in the main vector. The opposite will be done during decryption.

There are 63,536 possible combinations for the plugboard and 115 quattuorvigintillion (2^256) possible combinations of main vectors per block, meaning that even a single block (1 min, 32 max characters) is impossible to crack with current technology. Since each block needs its own key pair, it makes it extremely resistant to bruteforce attacks. However, this is not the full amount of combinations for each block.

The secondary key makes the amount of possible combinations go up even farther. Each block has its own UUID generated, and the secondary key stores the order in which each block is read by. Since there are 2^128 possible combinations for the UUID, the amount of possible combinations for each block is:
$\ 2^{256} \times 2^{16} \times 2^{128} = 2^{256 + 16 + 128} = 2^{400} \$

However, this is not meant to be for serious usage; I have still not tested its security outside of bruteforce attacks and it is not bug-proof as it is very early and bugs in padding and newlines are not fixed nor do I know the cause of.
