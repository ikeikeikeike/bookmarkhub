(function() {
  var BH,
    __slice = [].slice;

  window.Bookmarkhub || (window.Bookmarkhub = {});

  BH = window.Bookmarkhub;

  BH.expires = false;

  BH.trace = function() {
    var rest;
    rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (false) {
      return console.log(rest);
    }
  };

  BH.storage = {
    save: function(key, value, expires) {
      var err, record;
      if (expires == null) {
        expires = BH.expires;
      }
      if (!localStorage) {
        return false;
      }
      if (expires) {
        record = {
          value: JSON.stringify(value),
          timestamp: new Date().getTime() + expires
        };
        try {
          localStorage.setItem(BH.md5Hex(key), JSON.stringify(record));
        } catch (_error) {
          err = _error;
          BH.storage.clear();
        }
      }
      return value;
    },
    load: function(key) {
      var err, record;
      if (!localStorage) {
        return false;
      }
      try {
        record = JSON.parse(localStorage.getItem(BH.md5Hex(key)));
      } catch (_error) {
        err = _error;
        BH.storage.clear();
      }
      if (!record) {
        return false;
      }
      if (new Date().getTime() < record.timestamp) {
        return JSON.parse(record.value);
      } else {
        return BH.storage.clear();
      }
    },
    all: function() {
      var i, _i, _ref, _results;
      if (!localStorage) {
        return false;
      }
      if (!(localStorage.length > 0)) {
        return false;
      }
      _results = [];
      for (i = _i = 0, _ref = localStorage.length; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push(localStorage.getItem(localStorage.key(i)));
      }
      return _results;
    },
    clear: function() {
      var i, key, number, record, _i, _ref;
      if (!localStorage) {
        return false;
      }
      number = 0;
      for (i = _i = 0, _ref = localStorage.length; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        key = localStorage.key(i);
        record = JSON.parse(localStorage.getItem(key));
        if ((record != null ? record.timestamp : void 0) && new Date().getTime() > record.timestamp) {
          localStorage.removeItem(key);
          number++;
        }
      }
      return number;
    }
  };

  BH.URLs = (function() {
    function URLs() {}

    URLs.twitter = function(url) {
      return "http://urls.api.twitter.com/1/urls/count.json?url=" + (encodeURIComponent(url));
    };

    URLs.facebook = function(url) {
      return "https://graph.facebook.com/?id=" + (encodeURIComponent(url));
    };

    URLs.hatena = function(url) {
      return "http://api.b.st-hatena.com/entry.count?url=" + (encodeURIComponent(url));
    };

    URLs.google = function(url) {
      var apiUrl, yql;
      apiUrl = "https://plus.google.com/_/+1/fastbutton?hl=ja&url=" + url;
      yql = encodeURIComponent("SELECT content FROM data.headers WHERE url='" + apiUrl + "'");
      return "http://query.yahooapis.com/v1/public/yql?q=" + yql + "&format=json&env=http://datatables.org/alltables.env&diagnostics=false";
    };

    URLs.pocket = function(url) {
      var apiUrl, yql;
      apiUrl = "https://widgets.getpocket.com/v1/button?label=pocket&count=vertical&align=left&v=1&title=&url=" + url + "&src=" + url + "&r=" + (Math.floor(Math.random() * 10000000));
      yql = encodeURIComponent("SELECT * FROM html WHERE url='" + apiUrl + "'");
      return "http://query.yahooapis.com/v1/public/yql?q=" + yql + "&format=json&diagnostics=false";
    };

    URLs.linkedin = function(url) {
      return "http://www.linkedin.com/countserv/count/share?url=" + (encodeURIComponent(url));
    };

    URLs.delicious = function(url) {
      return "http://feeds.delicious.com/v2/json/urlinfo/data?url=" + (encodeURIComponent(url));
    };

    URLs.pinterest = function(url) {
      return "http://api.pinterest.com/v1/urls/count.json?url=" + (encodeURIComponent(url));
    };

    URLs.stumbleupon = function(url) {
      var apiUrl, yql;
      apiUrl = "http://www.stumbleupon.com/services/1.01/badge.getinfo?url=" + (encodeURIComponent(url));
      yql = "SELECT * FROM json WHERE url='" + apiUrl + "'";
      return "http://query.yahooapis.com/v1/public/yql?q=" + yql + "&format=json&diagnostics=true&callback=";
    };

    return URLs;

  })();

  BH.Counter = (function() {
    function Counter(url, expires) {
      this.url = url;
      this.expires = expires != null ? expires : BH.expires;
    }

    Counter.prototype.cacheKey = function(key) {
      return "Bookmarkhub.Counter.cacheKey(" + key + ")";
    };

    Counter.prototype.cachedRequest = function() {
      var callback, me, options, rest, result, url;
      url = arguments[0], rest = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      callback = rest.pop();
      options = rest.pop() || {};
      result = BH.storage.load(this.cacheKey(url));
      if (result) {
        BH.trace("cached: " + url);
        return callback(result);
      }
      me = this;
      return this.request(url, options, function(data) {
        BH.storage.save(me.cacheKey(url), data, me.expires);
        return callback(data);
      });
    };

    Counter.prototype.request = function() {
      var callback, options, rest, url;
      url = arguments[0], rest = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      callback = rest.pop();
      options = $.extend({
        url: url,
        type: 'get',
        dataType: 'jsonp'
      }, rest.pop() || {});
      return $.ajax(options).done(function(data) {
        return callback(data);
      }).fail(function() {
        var rest;
        rest = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return BH.trace('ajax fail: ', rest);
      });
    };

    Counter.prototype.twitter = function(callback) {
      return this.cachedRequest(BH.URLs.twitter(this.url), function(data) {
        var result;
        result = data.count || 0;
        return callback(result);
      });
    };

    Counter.prototype.hatena = function(callback) {
      return this.cachedRequest(BH.URLs.hatena(this.url), function(data) {
        return callback(data || 0);
      });
    };

    Counter.prototype.facebook = function(callback) {
      return this.cachedRequest(BH.URLs.facebook(this.url), function(data) {
        return callback(data.shares || 0);
      });
    };

    Counter.prototype.google = function(callback) {
      var me, result;
      result = BH.storage.load(this.cacheKey(this.url));
      if (result) {
        BH.trace("cached: " + this.url);
        return callback(result);
      }
      me = this;
      return this.request(BH.URLs.google(this.url), {
        dataType: 'json'
      }, function(data) {
        var _ref;
        result = ((_ref = data.query) != null ? _ref.results : void 0) ? $(data.query.results.resources.content).find('#aggregateCount').text() : 0;
        BH.storage.save(me.cacheKey(me.url), result, me.expires);
        return callback(result);
      });
    };

    Counter.prototype.pocket = function(callback) {
      var me, result;
      result = BH.storage.load(this.cacheKey(this.url));
      if (result) {
        BH.trace("cached: " + this.url);
        return callback(result);
      }
      me = this;
      return this.request(BH.URLs.pocket(this.url), {
        dataType: 'json'
      }, function(data) {
        result = data.query ? data.query.results.body.div.a.span.em.content : 0;
        BH.storage.save(me.cacheKey(me.url), result, me.expires);
        return callback(result);
      });
    };

    Counter.prototype.linkedin = function(callback) {
      return this.cachedRequest(BH.URLs.linkedin(this.url), function(data) {
        return callback(data.count || 0);
      });
    };

    Counter.prototype.delicious = function(callback) {
      return this.cachedRequest(BH.URLs.delicious(this.url), function(data) {
        var _ref;
        return callback(((_ref = data[0]) != null ? _ref.total_posts : void 0) || 0);
      });
    };

    Counter.prototype.pinterest = function(callback) {
      return this.cachedRequest(BH.URLs.pinterest(this.url), function(data) {
        return callback(data.count || 0);
      });
    };

    Counter.prototype.stumbleupon = function(callback) {
      return this.cachedRequest(BH.URLs.stumbleupon(this.url), {
        dataType: 'json'
      }, function(data) {
        var _ref, _ref1;
        return callback(((_ref = data.query) != null ? (_ref1 = _ref.results.json.result) != null ? _ref1.views : void 0 : void 0) || 0);
      });
    };

    return Counter;

  })();

  BH.Linker = (function() {
    function Linker(url, expires) {
      this.url = url;
      this.expires = expires != null ? expires : BH.expires;
      this.counter = new BH.Counter(this.url, this.expires);
    }

    Linker.prototype.schemelessUrl = function() {
      return this.url.replace(/^https?:\/\//, '');
    };

    Linker.prototype.linker = function(provider, link, callback) {
      var me;
      me = this;
      return this.counter[provider](function(count) {
        return callback({
          count: count,
          link: count ? link : void 0
        });
      });
    };

    Linker.prototype.twitter = function(callback) {
      return this.linker('twitter', "https://twitter.com/search?q=" + (this.schemelessUrl()), callback);
    };

    Linker.prototype.facebook = function(callback) {
      return this.linker('facebook', false, callback);
    };

    Linker.prototype.hatena = function(callback) {
      return this.linker('hatena', "http://b.hatena.ne.jp/entry/" + (this.schemelessUrl()), callback);
    };

    Linker.prototype.google = function(callback) {
      return this.linker('google', false, callback);
    };

    Linker.prototype.pocket = function(callback) {
      return this.linker('pocket', false, callback);
    };

    Linker.prototype.linkedin = function(callback) {
      return this.linker('linkedin', false, callback);
    };

    Linker.prototype.delicious = function(callback) {
      return this.linker('delicious', "https://previous.delicious.com/url/" + (BH.md5Hex(this.url)), callback);
    };

    Linker.prototype.pinterest = function(callback) {
      return this.linker('pinterest', false, callback);
    };

    Linker.prototype.stumbleupon = function(callback) {
      return this.linker('stumbleupon', "http://www.stumbleupon.com/url/" + this.url, callback);
    };

    return Linker;

  })();

  BH.Bookmarker = (function() {
    function Bookmarker(url, expires) {
      this.url = url;
      this.expires = expires != null ? expires : BH.expires;
      this.linker = new Bookmarkhub.Linker(this.url, this.expires);
    }

    Bookmarker.prototype.all = function(callback) {
      var me;
      me = this;
      return $.when(me.twitter(), me.facebook(), me.hatena(), me.google(), me.pocket(), me.linkedin(), me.delicious(), me.pinterest(), me.stumbleupon()).done(function(t, f, h, g, po, l, d, pi, s) {
        return callback({
          twitter: t,
          facebook: f,
          hatena: h,
          google: g,
          pocket: po,
          linkedin: l,
          delicious: d,
          pinterest: pi,
          stumbleupon: s
        });
      }).fail(function(err) {
        return BH.trace(err);
      });
    };

    Bookmarker.prototype.deferred = function(provider) {
      var dfd;
      dfd = $.Deferred();
      this.linker[provider](function(data) {
        if (data) {
          return dfd.resolve(data);
        } else {
          return dfd.reject();
        }
      });
      return dfd.promise();
    };

    Bookmarker.prototype.twitter = function() {
      return this.deferred('twitter');
    };

    Bookmarker.prototype.facebook = function() {
      return this.deferred('facebook');
    };

    Bookmarker.prototype.hatena = function() {
      return this.deferred('hatena');
    };

    Bookmarker.prototype.google = function() {
      return this.deferred('google');
    };

    Bookmarker.prototype.pocket = function() {
      return this.deferred('pocket');
    };

    Bookmarker.prototype.linkedin = function() {
      return this.deferred('linkedin');
    };

    Bookmarker.prototype.delicious = function() {
      return this.deferred('delicious');
    };

    Bookmarker.prototype.pinterest = function() {
      return this.deferred('pinterest');
    };

    Bookmarker.prototype.stumbleupon = function() {
      return this.deferred('stumbleupon');
    };

    return Bookmarker;

  })();

  BH.md5Hex = (function() {
    var CC, MD5_F, MD5_G, MD5_H, MD5_I, MD5_T, MD5_apply_round, MD5_hash, MD5_hexhash, MD5_number, MD5_pack, MD5_round, MD5_round1, MD5_round2, MD5_round3, MD5_round4, MD5_unpack;
    MD5_F = function(x, y, z) {
      return (x & y) | (~x & z);
    };
    MD5_G = function(x, y, z) {
      return (x & z) | (y & ~z);
    };
    MD5_H = function(x, y, z) {
      return x ^ y ^ z;
    };
    MD5_I = function(x, y, z) {
      return y ^ (x | ~z);
    };
    MD5_pack = function(n32) {
      return CC(n32 & 0xff) + CC((n32 >>> 8) & 0xff) + CC((n32 >>> 16) & 0xff) + CC((n32 >>> 24) & 0xff);
    };
    MD5_unpack = function(s4) {
      return s4.charCodeAt(0) | (s4.charCodeAt(1) << 8) | (s4.charCodeAt(2) << 16) | (s4.charCodeAt(3) << 24);
    };
    MD5_number = function(n) {
      while (n < 0) {
        n += 4294967296;
      }
      while (n > 4294967295) {
        n -= 4294967296;
      }
      return n;
    };
    MD5_apply_round = function(x, s, f, abcd, r) {
      var a, b, c, d, ii, kk, ss, t, u;
      a = void 0;
      b = void 0;
      c = void 0;
      d = void 0;
      kk = void 0;
      ss = void 0;
      ii = void 0;
      t = void 0;
      u = void 0;
      a = abcd[0];
      b = abcd[1];
      c = abcd[2];
      d = abcd[3];
      kk = r[0];
      ss = r[1];
      ii = r[2];
      u = f(s[b], s[c], s[d]);
      t = s[a] + u + x[kk] + MD5_T[ii];
      t = MD5_number(t);
      t = (t << ss) | (t >>> (32 - ss));
      t += s[b];
      return s[a] = MD5_number(t);
    };
    MD5_hash = function(data) {
      var abcd, f, i, index, j, k, len, padLen, r, s, state, tmp, x;
      abcd = void 0;
      x = void 0;
      state = void 0;
      s = void 0;
      len = void 0;
      index = void 0;
      padLen = void 0;
      f = void 0;
      r = void 0;
      i = void 0;
      j = void 0;
      k = void 0;
      tmp = void 0;
      state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
      len = data.length;
      index = len & 0x3f;
      padLen = (index < 56 ? 56 - index : 120 - index);
      if (padLen > 0) {
        data += "";
        i = 0;
        while (i < padLen - 1) {
          data += "\u0000";
          i++;
        }
      }
      data += MD5_pack(len * 8);
      data += MD5_pack(0);
      len += padLen + 8;
      abcd = [0, 1, 2, 3];
      x = new Array(16);
      s = new Array(4);
      k = 0;
      while (k < len) {
        i = 0;
        j = k;
        while (i < 16) {
          x[i] = data.charCodeAt(j) | (data.charCodeAt(j + 1) << 8) | (data.charCodeAt(j + 2) << 16) | (data.charCodeAt(j + 3) << 24);
          i++;
          j += 4;
        }
        i = 0;
        while (i < 4) {
          s[i] = state[i];
          i++;
        }
        i = 0;
        while (i < 4) {
          f = MD5_round[i][0];
          r = MD5_round[i][1];
          j = 0;
          while (j < 16) {
            MD5_apply_round(x, s, f, abcd, r[j]);
            tmp = abcd[0];
            abcd[0] = abcd[3];
            abcd[3] = abcd[2];
            abcd[2] = abcd[1];
            abcd[1] = tmp;
            j++;
          }
          i++;
        }
        i = 0;
        while (i < 4) {
          state[i] += s[i];
          state[i] = MD5_number(state[i]);
          i++;
        }
        k += 64;
      }
      return MD5_pack(state[0]) + MD5_pack(state[1]) + MD5_pack(state[2]) + MD5_pack(state[3]);
    };
    MD5_hexhash = function(data) {
      var bit128, c, i, out;
      i = void 0;
      out = void 0;
      c = void 0;
      bit128 = MD5_hash(data);
      out = "";
      i = 0;
      while (i < 16) {
        c = bit128.charCodeAt(i);
        out += "0123456789abcdef".charAt((c >> 4) & 0xf);
        out += "0123456789abcdef".charAt(c & 0xf);
        i++;
      }
      return out;
    };
    MD5_T = [0x00000000, 0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391];
    MD5_round1 = [[0, 7, 1], [1, 12, 2], [2, 17, 3], [3, 22, 4], [4, 7, 5], [5, 12, 6], [6, 17, 7], [7, 22, 8], [8, 7, 9], [9, 12, 10], [10, 17, 11], [11, 22, 12], [12, 7, 13], [13, 12, 14], [14, 17, 15], [15, 22, 16]];
    MD5_round2 = [[1, 5, 17], [6, 9, 18], [11, 14, 19], [0, 20, 20], [5, 5, 21], [10, 9, 22], [15, 14, 23], [4, 20, 24], [9, 5, 25], [14, 9, 26], [3, 14, 27], [8, 20, 28], [13, 5, 29], [2, 9, 30], [7, 14, 31], [12, 20, 32]];
    MD5_round3 = [[5, 4, 33], [8, 11, 34], [11, 16, 35], [14, 23, 36], [1, 4, 37], [4, 11, 38], [7, 16, 39], [10, 23, 40], [13, 4, 41], [0, 11, 42], [3, 16, 43], [6, 23, 44], [9, 4, 45], [12, 11, 46], [15, 16, 47], [2, 23, 48]];
    MD5_round4 = [[0, 6, 49], [7, 10, 50], [14, 15, 51], [5, 21, 52], [12, 6, 53], [3, 10, 54], [10, 15, 55], [1, 21, 56], [8, 6, 57], [15, 10, 58], [6, 15, 59], [13, 21, 60], [4, 6, 61], [11, 10, 62], [2, 15, 63], [9, 21, 64]];
    MD5_round = [[MD5_F, MD5_round1], [MD5_G, MD5_round2], [MD5_H, MD5_round3], [MD5_I, MD5_round4]];
    CC = String.fromCharCode;
    return MD5_hexhash;
  })();

}).call(this);
