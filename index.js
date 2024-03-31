const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Function to generate random binary string of specified length
const generateRandomBinary = (nearestPowerOfTwo) => {
    const byteLength = Math.ceil(nearestPowerOfTwo / 8);
    const randomBytes = crypto.randomBytes(byteLength);
    return randomBytes.readUIntBE(0, byteLength).toString(2).padStart(nearestPowerOfTwo, '0');
};
// Function to pad a string to the nearest power of two
const padToNearestPowerOfTwo = (str) => {
    const originalLength = str.length;
    let nearestPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(originalLength)));
    if (nearestPowerOfTwo < 8) nearestPowerOfTwo = 8;
    const paddingLength = nearestPowerOfTwo - originalLength;
    return str.padEnd(originalLength + paddingLength, '!');
};
// Function to calculate the nearest power of two
const pow = (n) => {
    let r = Math.pow(2, Math.ceil(Math.log2(n)));
    return r < 8 ? 8 : r;
}
// creates keypair
let create_pair = (str) => {
    const exportKey = (n, nearestPower, pad_len) => String.fromCharCode(pad_len) + n.vector.map(x => String.fromCharCode(x)).join('') + plugboardToByte(n.plugboard, nearestPower);

    let nearestPowerOfTwo = pow(str.length);
    let ostrl = str.length;
    return {
        pad_length: nearestPowerOfTwo - ostrl,
        createPlugboard: () => generateRandomBinary(nearestPowerOfTwo).split('').map(x => parseInt(x)),
        generateMainVector: () => Array.from(crypto.randomBytes(nearestPowerOfTwo)),
        export: (mainVec, plugboard) => {
            let xr = exportKey({ vector: mainVec, plugboard }, nearestPowerOfTwo, nearestPowerOfTwo - ostrl);
            return xr.split('').map(x => x.charCodeAt().toString(16)).join(' ');
        },
        decode: (x) => {
            x = x.split(' ').map(x => String.fromCharCode(parseInt(x, 16)));
            return ({ pad_length: x[0].charCodeAt(), vector: x.slice(1, -1).split('').map(x => x.charCodeAt()), plugboard: ascDecode(x.slice(-2), nearestPowerOfTwo).split('').map(x => parseInt(x)) });
        }
    }
};
// decodes keys from file
let decode_keys = (x) => {
    x = x.split(' ').map(x => String.fromCharCode(parseInt(x, 16)));
    let bits = x.slice(1, -1).length // how many bits there are in plugboard
    x = x.join('');
    let r = { pad_length: x[0].charCodeAt(), vector: x.slice(1, -1).split('').map(x => x.charCodeAt()), plugboard: ascDecode(x.slice(-2), bits).split('').map(x => parseInt(x)) }
    return r;
};
// Encryption function
const encrypt = (str, plugboard, mainVec) => {
    str = padToNearestPowerOfTwo(str);
    const newPlugboard = plugboard.map((x, i) => x ? mainVec[i] : 0);
    const encrypted = newPlugboard.map((x, i) => {
        return x ? str[i].charCodeAt() ^ mainVec[i] : str[i].charCodeAt();
    });
    return encrypted.map(x => String.fromCharCode(x)).join('');
};
// Decryption function
const decrypt = (encrypted, key) => {
    return key.plugboard.map((x, i) => x ? key.vector[i] : 0).map((x, i) => {
        let v = x ? encrypted[i].charCodeAt() ^ key.vector[i] : encrypted[i].charCodeAt();
        return String.fromCharCode(v);
    }).join('').slice(0, (key.vector.length - key.pad_length));
};
// Function to convert plugboard to byte
const plugboardToByte = (x, bitsPerChar) => {
    bitsPerChar /= 2;
    x = x.join('');
    let asciiChars = '';
    for (let i = 0; i < x.length; i += bitsPerChar) {
        const binarySubstring = x.substring(i, i + bitsPerChar);
        const asciiCode = parseInt(binarySubstring, 2);
        asciiChars += String.fromCharCode(asciiCode);
    }
    return asciiChars;
};
// Function to convert ASCII characters to binary string with specified number of bits
function ascDecode(asciiChars, bitsPerChar) {
    bitsPerChar /= 2;
    const binaryArray = [];
    for (let i = 0; i < asciiChars.length; i++) {
        const charCode = asciiChars.charCodeAt(i);
        const binaryRepresentation = ('0'.repeat(bitsPerChar) + charCode.toString(2)).slice(-bitsPerChar);
        for (let j = 0; j < binaryRepresentation.length; j++) {
            binaryArray.push(parseInt(binaryRepresentation[j]));
        }
    }
    return binaryArray.join('');
}
// implementation of individual blocks
let block = (str) => {
    if (str.length > 32) throw new Length("Block is over 32 characters long!");
    let pair = create_pair(str);
    let plugboard = pair.createPlugboard();
    let mainVec = pair.generateMainVector();
    let n = encrypt(str, plugboard, mainVec);
    return {
        str,
        encrypted: n,
        key: { vector: mainVec, plugboard, pad_length: pair.pad_length },
        pair
    }
}
// generates blocks from entire string and encrypts them
let encrypt_blocks = (full, folder_name) => {
    if (!fs.existsSync(folder_name)) fs.mkdirSync(folder_name);
    fs.readdirSync(folder_name).filter(x => x.includes('block')).map(x => fs.unlinkSync(path.join(folder_name, x)));
    let blocks = full.match(/.{1,32}/g);
    let enc = [];
    let sec_key = [];
    blocks.forEach((x) => {
        let uid = crypto.randomUUID();
        let b = block(x);
        let e = b.pair.export(b.key.vector, b.key.plugboard);
        fs.writeFileSync(path.join(folder_name, `block-${uid}`), e);
        enc.push(b.encrypted);
        sec_key.push(uid);
    });
    return { blocks: enc, secondary_key: sec_key };
};
let export_sec_key = (s) => s.join('​');
let decode_sec_key = (s) => s.split('​');
// now decrypt here without using past variables
let decrypt_blocks = (enc, sec_key, folder_name) => {
    // let ol = fs.readdirSync(folder_name).filter(x => x.includes('block')).length;
    let ra = [];
    for (let i = 0; i < sec_key.length; i++) {
        // loop here that goes over secondary_key and matches it with block
        let f = fs.readFileSync(path.join(folder_name, `block-${sec_key[i]}`)).toString();
        let r2 = decode_keys(f);
        let r3 = decrypt(enc[i], r2);
        ra.push(r3);
    };
    let res = ra.join('');
    if (res[res.length - 1] == '!') res = res.slice(0, -1);
    return res;
}
let export_blocks = (blocks) => {
    let hex = blocks.map(x => x.split('').map(x => x.charCodeAt().toString(16)).join(' '));
    let v = hex.join('​');
    return v;
};
let decode_blocks = (b) => {
    return b.split('​').map(x => x.split(' ').map(x => parseInt(x, 16)).map(x => String.fromCharCode(x)).join(''));
}

return { export_blocks, export_sec_key, decode_blocks, decode_sec_key, decrypt_blocks, encrypt_blocks }
