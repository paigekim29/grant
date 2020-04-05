
var _consumer = require('../grant')


module.exports = function (args) {
  var consumer = _consumer((args || {}).config ? args : {config: args})
  app.config = consumer.config

  var regex = new RegExp([
    '^',
    app.config.defaults.prefix.replace(/\//g, '\/'),
    /\/([^\\/]+?)/.source, // /:provider
    /(?:\/([^\\/]+?))?/.source, // /:override?
    /\/?(?:\?([^/]+))?$/.source, // querystring
  ].join(''))

  function* app (next) {
    var match = regex.exec(this.request.originalUrl)
    if (!match) {
      return yield next
    }

    if (!this.session) {
      throw new Error('Grant: mount session middleware first')
    }
    if (this.method === 'POST' && !this.request.body) {
      throw new Error('Grant: mount body parser middleware first')
    }

    var params = {
      provider: match[1],
      override: match[2]
    }

    var result = yield consumer({
      method: this.method,
      params: params,
      query: this.request.query,
      body: this.request.body,
      state: this.state.grant,
      session: this.session.grant,
    })

    this.session.grant = result.session
    this.state.grant = result.state
    result.location ? this.response.redirect(result.location) : yield next
  }

  return app
}