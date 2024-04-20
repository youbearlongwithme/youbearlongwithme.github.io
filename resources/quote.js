(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
; var __browserify_shim_require__=require;(function browserifyShim(module, exports, require, define, browserify_shim__define__module__export__) {
/**
 * Seedable random number generator functions.
 * @version 1.0.0
 * @license Public Domain
 *
 * @example
 * var rng = new RNG('Example');
 * rng.random(40, 50);  // =>  42
 * rng.uniform();       // =>  0.7972798995050903
 * rng.normal();        // => -0.6698504543216376
 * rng.exponential();   // =>  1.0547367609131555
 * rng.poisson(4);      // =>  2
 * rng.gamma(4);        // =>  2.781724687386858
 */

/**
 * @param {String} seed A string to seed the generator.
 * @constructor
 */
function RC4(seed) {
    this.s = new Array(256);
    this.i = 0;
    this.j = 0;
    for (var i = 0; i < 256; i++) {
        this.s[i] = i;
    }
    if (seed) {
        this.mix(seed);
    }
}

/**
 * Get the underlying bytes of a string.
 * @param {string} string
 * @returns {Array} An array of bytes
 */
RC4.getStringBytes = function(string) {
    var output = [];
    for (var i = 0; i < string.length; i++) {
        var c = string.charCodeAt(i);
        var bytes = [];
        do {
            bytes.push(c & 0xFF);
            c = c >> 8;
        } while (c > 0);
        output = output.concat(bytes.reverse());
    }
    return output;
};

RC4.prototype._swap = function(i, j) {
    var tmp = this.s[i];
    this.s[i] = this.s[j];
    this.s[j] = tmp;
};

/**
 * Mix additional entropy into this generator.
 * @param {String} seed
 */
RC4.prototype.mix = function(seed) {
    var input = RC4.getStringBytes(seed);
    var j = 0;
    for (var i = 0; i < this.s.length; i++) {
        j += this.s[i] + input[i % input.length];
        j %= 256;
        this._swap(i, j);
    }
};

/**
 * @returns {number} The next byte of output from the generator.
 */
RC4.prototype.next = function() {
    this.i = (this.i + 1) % 256;
    this.j = (this.j + this.s[this.i]) % 256;
    this._swap(this.i, this.j);
    return this.s[(this.s[this.i] + this.s[this.j]) % 256];
};

/**
 * Create a new random number generator with optional seed. If the
 * provided seed is a function (i.e. Math.random) it will be used as
 * the uniform number generator.
 * @param seed An arbitrary object used to seed the generator.
 * @constructor
 */
function RNG(seed) {
    if (seed == null) {
        seed = (Math.random() + Date.now()).toString();
    } else if (typeof seed === "function") {
        // Use it as a uniform number generator
        this.uniform = seed;
        this.nextByte = function() {
            return ~~(this.uniform() * 256);
        };
        seed = null;
    } else if (Object.prototype.toString.call(seed) !== "[object String]") {
        seed = JSON.stringify(seed);
    }
    this._normal = null;
    if (seed) {
        this._state = new RC4(seed);
    } else {
        this._state = null;
    }
}

/**
 * @returns {number} Uniform random number between 0 and 255.
 */
RNG.prototype.nextByte = function() {
    return this._state.next();
};

/**
 * @returns {number} Uniform random number between 0 and 1.
 */
RNG.prototype.uniform = function() {
    var BYTES = 7; // 56 bits to make a 53-bit double
    var output = 0;
    for (var i = 0; i < BYTES; i++) {
        output *= 256;
        output += this.nextByte();
    }
    return output / (Math.pow(2, BYTES * 8) - 1);
};

/**
 * Produce a random integer within [n, m).
 * @param {number} [n=0]
 * @param {number} m
 *
 */
RNG.prototype.random = function(n, m) {
    if (n == null) {
        return this.uniform();
    } else if (m == null) {
        m = n;
        n = 0;
    }
    return n + Math.floor(this.uniform() * (m - n));
};

/**
 * Generates numbers using this.uniform() with the Box-Muller transform.
 * @returns {number} Normally-distributed random number of mean 0, variance 1.
 */
RNG.prototype.normal = function() {
    if (this._normal !== null) {
        var n = this._normal;
        this._normal = null;
        return n;
    } else {
        var x = this.uniform() || Math.pow(2, -53); // can't be exactly 0
        var y = this.uniform();
        this._normal = Math.sqrt(-2 * Math.log(x)) * Math.sin(2 * Math.PI * y);
        return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * y);
    }
};

/**
 * Generates numbers using this.uniform().
 * @returns {number} Number from the exponential distribution, lambda = 1.
 */
RNG.prototype.exponential = function() {
    return -Math.log(this.uniform() || Math.pow(2, -53));
};

/**
 * Generates numbers using this.uniform() and Knuth's method.
 * @param {number} [mean=1]
 * @returns {number} Number from the Poisson distribution.
 */
RNG.prototype.poisson = function(mean) {
    var L = Math.exp(-(mean || 1));
    var k = 0, p = 1;
    do {
        k++;
        p *= this.uniform();
    } while (p > L);
    return k - 1;
};

/**
 * Generates numbers using this.uniform(), this.normal(),
 * this.exponential(), and the Marsaglia-Tsang method.
 * @param {number} a
 * @returns {number} Number from the gamma distribution.
 */
RNG.prototype.gamma = function(a) {
    var d = (a < 1 ? 1 + a : a) - 1 / 3;
    var c = 1 / Math.sqrt(9 * d);
    do {
        do {
            var x = this.normal();
            var v = Math.pow(c * x + 1, 3);
        } while (v <= 0);
        var u = this.uniform();
        var x2 = Math.pow(x, 2);
    } while (u >= 1 - 0.0331 * x2 * x2 &&
             Math.log(u) >= 0.5 * x2 + d * (1 - v + Math.log(v)));
    if (a < 1) {
        return d * v * Math.exp(this.exponential() / -a);
    } else {
        return d * v;
    }
};

/**
 * Accepts a dice rolling notation string and returns a generator
 * function for that distribution. The parser is quite flexible.
 * @param {string} expr A dice-rolling, expression i.e. '2d6+10'.
 * @param {RNG} rng An optional RNG object.
 * @returns {Function}
 */
RNG.roller = function(expr, rng) {
    var parts = expr.split(/(\d+)?d(\d+)([+-]\d+)?/).slice(1);
    var dice = parseFloat(parts[0]) || 1;
    var sides = parseFloat(parts[1]);
    var mod = parseFloat(parts[2]) || 0;
    rng = rng || new RNG();
    return function() {
        var total = dice + mod;
        for (var i = 0; i < dice; i++) {
            total += rng.random(sides);
        }
        return total;
    };
};

/* Provide a pre-made generator instance. */
RNG.$ = new RNG();

; browserify_shim__define__module__export__(typeof RNG != "undefined" ? RNG : window.RNG);

}).call(global, undefined, undefined, undefined, undefined, function defineExport(ex) { module.exports = ex; });

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
var RNG = require('rng-js');
const quotes = [
    {
        quote: "In the future . . . if by some miracle you ever find yourself in the position to fall in love again . . . fall in love with me",
        source: "—Colleen Hoover - It Ends With Us"
    },
    {
        quote: "Doubt thou the stars do are fire <br/> Doubt thou the sun doth move <br/> Doubt truth to be a liar <br/> But never doubt I love",
        source: "—William Shakespeare - Hamlet",
    },
    {
        quote: "My bounty is as boundless as the sea <br/> My love as deep; the more I give to thee <br/> The more I have, for both are infinite",
        source: "—William Shakespeare - Romeo and Juliet",
    },
    {
        quote: "It is impossible to manufacture or imitate love.",
        source: "—Horace Slughorn, in Harry Potter and the Half-Blood Prince - J.K Rowling",
    },
    {
        quote: "If I said I was madly in love with you, I’d be lying and what’s more, you’d know it.",
        source: "—Magaret Mitchell - Gone With The Wind",
    },
    {
        quote: "It stops here. With me and you. It ends with us.",
        source: "—Colleen Hoover - It Ends With Us",
    },
    {
        quote: "Just because someone hurts you doesn't mean you can simply stop loving them. It's not a person's actions that hurt the most. It's the love. If there was no love attached to the action, the pain would be a little easier to bear.",
        source: "—Colleen Hoover - It Ends With Us",
    },

    {
        quote: "I’ve never had a moment’s doubt. I love you. I believe in you completely. You are my dearest one. My reason for life.",
        source: "-Ian McEvan - Atonement",
    },
    {
        quote: "I belong to my beloved, and my beloved is mine.",
        source: "—Jamie McGuire - Beautiful Disaster",
    },
    {
        quote: "Love has nothing to do with what you are expecting to get–only with what you are expecting to give–which is everything.",
        source: "—Katharine Hepburn",
    },
    {
        quote: "Did my heart love till now? Foreswear it, sight! For I ne'er saw true beauty till this night.",
        source: "—William Shakespeare - Romeo and Juliet",
    },
    {
        quote: "Do I love you? My god, if your love were a grain of sand, mine would be a universe of beaches.",
        source: "—William Goldman - The Princess Bride",
    },
    {
        quote: "It doesn’t matter who you are or what you look like, so long as somebody loves you.",
        source: "—Roald Dahl - The Witches",
    },
    {
        quote: "The one thing we can never get enough of is love. And the one thing we never give enough is love",
        source: "—Henry Miller",
    },
    {
        quote: "Love consists of this: two solitudes that meet, protect and greet each other.",
        source: "—Rainer Maria Rilke",
    },
    {
        quote: "Love is like the wind, you can’t see it but you can feel it.",
        source: "—Nicholas Sparks - A Walk to Remember",
    },
]
var d = new Date('Nov 1, 2024').getTime();
var rng = new RNG(d*Math.random());

const gimmeQuotes = function(){
    n = rng.random(0,15);
    document.getElementById("quote").innerHTML='"'+quotes[n].quote+'"';
    document.getElementById("source").innerHTML=quotes[n].source;
}

window.onload = function() {
    gimmeQuotes();
}
},{"rng-js":1}]},{},[2]);
