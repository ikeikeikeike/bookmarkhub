window.Bookmarkhub or= {}
BH = window.Bookmarkhub

BH.EXPIRES = no

BH.trace = (rest...) ->
  console.log rest if no

BH.storage = {
  save: (key, value, expires=BH.EXPIRES) ->
    return no unless localStorage

    if expires
      record =
        value: JSON.stringify(value)
        timestamp: new Date().getTime() + expires
      try
        localStorage.setItem BH.md5Hex(key), JSON.stringify(record)
      catch err
        BH.storage.clear()

    value
  ,
  load: (key) ->
    return no unless localStorage

    try
      record = JSON.parse localStorage.getItem(BH.md5Hex(key))
    catch err
      BH.storage.clear()

    return no unless record

    if new Date().getTime() < record.timestamp
      JSON.parse(record.value)
    else
      BH.storage.clear()
  ,
  all: ->
    return no unless localStorage
    return no unless localStorage.length > 0

    localStorage.getItem(localStorage.key(i)) for i in [0..localStorage.length]
  ,
  clear: ->
    return no unless localStorage

    number = 0

    for i in [0..localStorage.length]
      key = localStorage.key(i)
      record = JSON.parse(localStorage.getItem(key))

      if record?.value and
         record?.timestamp and
         new Date().getTime() > record.timestamp

        localStorage.removeItem key
        number++

    number
}


class BH.URLs

  @twitter: (url) ->
    "http://urls.api.twitter.com/1/urls/count.json?url=#{encodeURIComponent url}"

  @facebook: (url) ->
    "https://graph.facebook.com/?id=#{encodeURIComponent url}"

  @hatena: (url) ->
    "http://api.b.st-hatena.com/entry.count?url=#{encodeURIComponent url}"

  @google: (url) ->
    apiUrl = "https://plus.google.com/_/+1/fastbutton?hl=ja&url=#{url}"
    yql = encodeURIComponent("SELECT content FROM data.headers WHERE url='#{apiUrl}'")
    "http://query.yahooapis.com/v1/public/yql?q=#{yql}&format=json&env=http://datatables.org/alltables.env&diagnostics=false"

  # TODO: YQL(pocket) query bugfux: cleaned url fragment(#).
  @pocket: (url) ->
    apiUrl = "https://widgets.getpocket.com/v1/button?label=pocket&count=vertical&align=left&v=1&title=&url=#{url}&src=#{url}&r=#{Math.floor(Math.random() * 10000000)}"
    yql = encodeURIComponent("SELECT * FROM html WHERE url='#{apiUrl}'")
    "http://query.yahooapis.com/v1/public/yql?q=#{yql}&format=json&diagnostics=false"

  @linkedin: (url) ->
    "http://www.linkedin.com/countserv/count/share?url=#{encodeURIComponent url}"

  @delicious: (url) ->
    "http://feeds.delicious.com/v2/json/urlinfo/data?url=#{encodeURIComponent url}"

  @pinterest: (url) ->
    "http://api.pinterest.com/v1/urls/count.json?url=#{encodeURIComponent url}"

  @stumbleupon: (url) ->
    apiUrl = "http://www.stumbleupon.com/services/1.01/badge.getinfo?url=#{encodeURIComponent url}"
    yql = "SELECT * FROM json WHERE url='#{apiUrl}'"
    "http://query.yahooapis.com/v1/public/yql?q=#{yql}&format=json&diagnostics=true&callback="

  @reddit: (url) ->
    "http://buttons.reddit.com/button_info.json?url=#{encodeURIComponent url}"


class BH.Counter

  constructor: (@url, @expires=BH.EXPIRES) ->

  cacheKey: (key) ->
    "Bookmarkhub.Counter.cacheKey(#{key})"

  cachedRequest: (url, rest...) ->
    callback = rest.pop()
    options = rest.pop() || {}

    result = BH.storage.load @cacheKey(url)
    if result
      BH.trace "cached: #{url}"
      return callback result

    me = @
    @request url, options, (data) ->
      BH.storage.save me.cacheKey(url), data, me.expires
      callback data

  request: (url, rest...) ->
    callback = rest.pop()
    options = $.extend
        url: url
        type: 'get'
        dataType: 'jsonp'
      ,
        rest.pop() || {}

    $.ajax(
      options
    ).done((data) ->
      callback data
    ).fail (rest...) ->
      BH.trace 'ajax fail: ', rest

  twitter: (callback) ->
    @cachedRequest BH.URLs.twitter(@url), (data) ->
      result = data.count or 0
      callback result

  hatena: (callback) ->
    @cachedRequest BH.URLs.hatena(@url), (data) ->
      callback data or 0

  facebook: (callback) ->
    @cachedRequest BH.URLs.facebook(@url), (data) ->
      callback data.shares or 0

  google: (callback) ->

    result = BH.storage.load @cacheKey(@url)
    if result
      BH.trace "cached: #{@url}"
      return callback result

    me = @

    @request BH.URLs.google(@url), dataType: 'json', (data) ->
      result = if data.query?.results
        $(data.query.results.resources.content)
          .find('#aggregateCount').text()
      else
        0

      BH.storage.save me.cacheKey(me.url), result, me.expires
      callback result

  pocket: (callback) ->
    # debugger
    result = BH.storage.load @cacheKey(@url)
    if result
      BH.trace "cached: #{@url}"
      return callback result

    me = @

    @request BH.URLs.pocket(@url), dataType: 'json', (data) ->
      result = if data.query
        data.query.results
          .body.div.a.span.em.content
      else
        0

      BH.storage.save me.cacheKey(me.url), result, me.expires
      callback result

  linkedin: (callback) ->
    @cachedRequest BH.URLs.linkedin(@url), (data) ->
      callback data.count or 0

  delicious: (callback) ->
    @cachedRequest BH.URLs.delicious(@url), (data) ->
      callback data[0]?.total_posts or 0

  pinterest: (callback) ->
    @cachedRequest BH.URLs.pinterest(@url), (data) ->
      callback data.count or 0

  stumbleupon: (callback) ->
    @cachedRequest BH.URLs.stumbleupon(@url), dataType: 'json', (data) ->
      callback data.query?.results
        .json.result?.views or 0

  reddit: (callback) ->
    @cachedRequest BH.URLs.reddit(@url), dataType: 'json', (data) ->
      callback data.data.children[0]?.data.score or 0


class BH.Linker

  constructor: (@url, @expires=BH.EXPIRES) ->
    @counter = new BH.Counter(@url, @expires)

  schemelessUrl: ->
    @url.replace(/^https?:\/\//, '')

  linker: (provider, link, callback) ->
    me = @
    @counter[provider] (count) ->
      callback
        count: count
        link: link if count

  twitter: (callback) -> @linker('twitter', "https://twitter.com/search?q=#{@schemelessUrl()}", callback)
  facebook: (callback) -> @linker('facebook', no, callback)
  hatena: (callback) -> @linker('hatena', "http://b.hatena.ne.jp/entry/#{@schemelessUrl()}", callback)
  google: (callback) -> @linker('google', no, callback)
  pocket: (callback) -> @linker('pocket', no, callback)
  linkedin: (callback) -> @linker('linkedin', no, callback)
  delicious: (callback) -> @linker('delicious', "https://previous.delicious.com/url/#{BH.md5Hex @url}", callback)
  pinterest: (callback) -> @linker('pinterest', no, callback)
  stumbleupon: (callback) -> @linker('stumbleupon', "http://www.stumbleupon.com/url/#{@url}", callback)
  reddit: (callback) -> @linker('reddit', "http://www.reddit.com/submit?url=#{@url}", callback)


class BH.Bookmarker

  constructor: (@url, @expires=BH.EXPIRES) ->
    @linker = new Bookmarkhub.Linker(@url, @expires)

  all: (callback) ->
    me = @

    $.when(
      me.twitter()
      me.facebook()
      me.hatena()
      me.google()
      me.pocket()
      me.linkedin()
      me.delicious()
      me.pinterest()
      me.stumbleupon()
      me.reddit()
    ).done((t, f, h, g, po ,l, d, pi, s, r) ->
      callback
        twitter: t
        facebook: f
        hatena: h
        google: g
        pocket: po
        linkedin: l
        delicious: d
        pinterest: pi
        stumbleupon: s
        reddit: r
    )
    .fail((err) ->
      BH.trace err
    )

  _deferred: (provider) ->
    dfd = $.Deferred()
    @linker[provider]((data) ->
      if data
        dfd.resolve(data)
      else
        dfd.reject()
    )
    dfd.promise()

  twitter: -> @_deferred('twitter')
  facebook: -> @_deferred('facebook')
  hatena: -> @_deferred('hatena')
  google: -> @_deferred('google')
  pocket: -> @_deferred('pocket')
  linkedin: -> @_deferred('linkedin')
  delicious: -> @_deferred('delicious')
  pinterest: -> @_deferred('pinterest')
  stumbleupon: -> @_deferred('stumbleupon')
  reddit: -> @_deferred('reddit')


# XXX:
BH.md5Hex = (->
  MD5_F = (x, y, z) ->
    (x & y) | (~x & z)

  MD5_G = (x, y, z) ->
    (x & z) | (y & ~z)

  MD5_H = (x, y, z) ->
    x ^ y ^ z

  MD5_I = (x, y, z) ->
    y ^ (x | ~z)

  MD5_pack = (n32) ->
    CC(n32 & 0xff) + CC((n32 >>> 8) & 0xff) + CC((n32 >>> 16) & 0xff) + CC((n32 >>> 24) & 0xff)

  MD5_unpack = (s4) ->
    s4.charCodeAt(0) | (s4.charCodeAt(1) << 8) | (s4.charCodeAt(2) << 16) | (s4.charCodeAt(3) << 24)

  MD5_number = (n) ->
    n += 4294967296  while n < 0
    n -= 4294967296  while n > 4294967295
    n

  MD5_apply_round = (x, s, f, abcd, r) ->
    a = undefined
    b = undefined
    c = undefined
    d = undefined
    kk = undefined
    ss = undefined
    ii = undefined
    t = undefined
    u = undefined
    a = abcd[0]
    b = abcd[1]
    c = abcd[2]
    d = abcd[3]
    kk = r[0]
    ss = r[1]
    ii = r[2]
    u = f(s[b], s[c], s[d])
    t = s[a] + u + x[kk] + MD5_T[ii]
    t = MD5_number(t)
    t = ((t << ss) | (t >>> (32 - ss)))
    t += s[b]
    s[a] = MD5_number(t)

  MD5_hash = (data) ->
    abcd = undefined
    x = undefined
    state = undefined
    s = undefined
    len = undefined
    index = undefined
    padLen = undefined
    f = undefined
    r = undefined
    i = undefined
    j = undefined
    k = undefined
    tmp = undefined
    state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]
    len = data.length
    index = len & 0x3f
    padLen = (if (index < 56) then (56 - index) else (120 - index))

    if padLen > 0
      data += ""
      i = 0
      while i < padLen - 1
        data += "\u0000"
        i++

    data += MD5_pack(len * 8)
    data += MD5_pack(0)
    len += padLen + 8
    abcd = [0, 1, 2, 3]
    x = new Array(16)
    s = new Array(4)
    k = 0

    while k < len
      i = 0
      j = k

      while i < 16
        x[i] = data.charCodeAt(j) | (data.charCodeAt(j + 1) << 8) | (data.charCodeAt(j + 2) << 16) | (data.charCodeAt(j + 3) << 24)
        i++
        j += 4
      i = 0

      while i < 4
        s[i] = state[i]
        i++
      i = 0

      while i < 4
        f = MD5_round[i][0]
        r = MD5_round[i][1]
        j = 0

        while j < 16
          MD5_apply_round x, s, f, abcd, r[j]
          tmp = abcd[0]
          abcd[0] = abcd[3]
          abcd[3] = abcd[2]
          abcd[2] = abcd[1]
          abcd[1] = tmp
          j++
        i++

      i = 0
      while i < 4
        state[i] += s[i]
        state[i] = MD5_number(state[i])
        i++
      k += 64

    MD5_pack(state[0]) + MD5_pack(state[1]) + MD5_pack(state[2]) + MD5_pack(state[3])

  MD5_hexhash = (data) ->
    i = undefined
    out = undefined
    c = undefined
    bit128 = MD5_hash(data)
    out = ""
    i = 0

    while i < 16
      c = bit128.charCodeAt(i)
      out += "0123456789abcdef".charAt((c >> 4) & 0xf)
      out += "0123456789abcdef".charAt(c & 0xf)
      i++

    out

  MD5_T = [
    0x00000000, 0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8
    0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193
    0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51
    0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905
    0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681
    0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60
    0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244
    0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314
    0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ]

  MD5_round1 = [
    [0, 7, 1], [1, 12, 2], [2, 17, 3], [3, 22, 4]
    [4, 7, 5], [5, 12, 6], [6, 17, 7], [7, 22, 8]
    [8, 7, 9], [9, 12, 10], [10, 17, 11], [11, 22, 12]
    [12, 7, 13], [13, 12, 14], [14, 17, 15], [15, 22, 16]
  ]

  MD5_round2 = [
    [1, 5, 17], [6, 9, 18], [11, 14, 19], [0, 20, 20]
    [5, 5, 21], [10, 9, 22], [15, 14, 23], [4, 20, 24]
    [9, 5, 25], [14, 9, 26], [3, 14, 27], [8, 20, 28]
    [13, 5, 29], [2, 9, 30], [7, 14, 31], [12, 20, 32]
  ]

  MD5_round3 = [
    [5, 4, 33], [8, 11, 34], [11, 16, 35], [14, 23, 36]
    [1, 4, 37], [4, 11, 38], [7, 16, 39], [10, 23, 40]
    [13, 4, 41], [0, 11, 42], [3, 16, 43], [6, 23, 44]
    [9, 4, 45], [12, 11, 46], [15, 16, 47], [2, 23, 48]
  ]

  MD5_round4 = [
    [0, 6, 49], [7, 10, 50], [14, 15, 51], [5, 21, 52]
    [12, 6, 53], [3, 10, 54], [10, 15, 55], [1, 21, 56]
    [8, 6, 57], [15, 10, 58], [6, 15, 59], [13, 21, 60]
    [4, 6, 61], [11, 10, 62], [2, 15, 63], [9, 21, 64]
  ]

  MD5_round = [
    [MD5_F, MD5_round1]
    [MD5_G, MD5_round2]
    [MD5_H, MD5_round3]
    [MD5_I, MD5_round4]
  ]

  CC = String.fromCharCode

  MD5_hexhash
)()
