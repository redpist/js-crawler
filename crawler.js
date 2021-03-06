var request = require('request');
var _ = require('underscore');
var url = require('url');

var DEFAULT_DEPTH = 2;
var DEFAULT_MAX_REQUESTS_PER_SECOND = 100;
var DEFAULT_USERAGENT = 'crawler/js-crawler';

/*
 * Executor that handles throttling and task processing rate.
 */
function Executor(opts) {
  this.maxRatePerSecond = opts.maxRatePerSecond;
  this.onFinished = opts.finished || function() {};
  this.queue = [];
  this.isStopped = false;
  this.timeoutMs = (1 / this.maxRatePerSecond) * 1000;
}

Executor.prototype.submit = function(func, context, args) {
  this.queue.push({
    func: func,
    context: context,
    args: args
  });
};

Executor.prototype.start = function() {
  this._processQueueItem();
};

Executor.prototype.stop = function() {
  this.isStopped = true;
};

Executor.prototype._processQueueItem = function() {
  var self = this;

  if (this.queue.length !== 0) {
    var nextExecution = this.queue.shift();

    nextExecution.func.apply(nextExecution.context, nextExecution.args);
  }
  if (this.isStopped) {
    return;
  }
  setTimeout(function() {
    self._processQueueItem();
  }, this.timeoutMs);
};

/*
 * Main crawler functionality.
 */
function Crawler() {
  this.crawledUrls = {};
  this.depth = DEFAULT_DEPTH;
  this.ignoreRelative = false;
  this.userAgent = DEFAULT_USERAGENT;
  this.maxRequestsPerSecond = DEFAULT_MAX_REQUESTS_PER_SECOND;
  this._beingCrawled = [];
  this.shouldCrawl = function() {
    return true;
  };
}

Crawler.prototype.configure = function(options) {
  this.depth = (options && options.depth) || this.depth;
  this.depth = Math.max(this.depth, 0);
  this.ignoreRelative = (options && options.ignoreRelative) || this.ignoreRelative;
  this.userAgent = (options && options.userAgent) || this.userAgent;
  this.maxRequestsPerSecond = (options && options.maxRequestsPerSecond) || this.maxRequestsPerSecond;
  this.shouldCrawl = (options && options.shouldCrawl) || this.shouldCrawl;
  return this;
};

Crawler.prototype.crawl = function(url, onSuccess, onFailure, onAllFinished) {
  this.workExecutor = new Executor({
    maxRatePerSecond: this.maxRequestsPerSecond
  });
  this.workExecutor.start();
  if (!(typeof url === 'string')) {
    var options = url;

    this._crawlUrl(options.url, this.depth, options.success, options.failure, options.finished);
  } else {
    this._crawlUrl(url, this.depth, onSuccess, onFailure, onAllFinished);
  }
  return this;
};

Crawler.prototype._startedCrawling = function(url) {
  this._beingCrawled.push(url);
};

Crawler.prototype.forgetCrawled = function() {
  this.crawledUrls = {};
  return this;
};

Crawler.prototype._finishedCrawling = function(url, onAllFinished) {
  var indexOfUrl = this._beingCrawled.indexOf(url);

  this._beingCrawled.splice(indexOfUrl, 1);
  if (this._beingCrawled.length === 0) {
    onAllFinished && onAllFinished(_.keys(this.crawledUrls));
    this.workExecutor && this.workExecutor.stop();
  }
}

Crawler.prototype._requestUrl = function(options, callback) {
  this.workExecutor.submit(request, null, [options, callback]);
};

Crawler.prototype._crawlUrl = function(url, depth, onSuccess, onFailure, onAllFinished) {
  if ((depth === 0) || this.crawledUrls[url]) {
    return;
  }
  var self = this;

  this._startedCrawling(url);
  this._requestUrl({
    url: url,
    headers: {
      'User-Agent': this.userAgent
    }
  }, function(error, response, body) {
    self.crawledUrls[url] = true;
    if (!error && (response.statusCode === 200)) {
      onSuccess({
        url: url,
        status: response.statusCode,
        content: body,
        error: error,
        response: response,
        body: body
      });
      self._crawlUrls(self._getAllUrls(url, body), depth - 1, onSuccess, onFailure, onAllFinished);
    } else if (onFailure) {
      onFailure({
        url: url,
        status: response ? response.statusCode : undefined,
        error: error,
        response: response,
        body: body
      });
    }
    self._finishedCrawling(url, onAllFinished);
  });
};

Crawler.prototype._getAllUrls = function(baseUrl, body) {
  var self = this;
  var linksRegex = self.ignoreRelative ? /<a[^>]+?href=".*?:\/\/.*?"/gmi : /<a[^>]+?href=".*?"/gmi;
  var links = body.match(linksRegex) || [];

  links = _.map(links, function(link) {
    var match = /href=\"(.*?)[#\"]/i.exec(link);

    link = match[1];
    link = url.resolve(baseUrl, link);
    return link;
  });
  return _.chain(links)
    .uniq()
    .filter(this.shouldCrawl)
    .value();
};

Crawler.prototype._crawlUrls = function(urls, depth, onSuccess, onFailure, onAllFinished) {
  var self = this;

  _.each(urls, function(url) {
    self._crawlUrl(url, depth, onSuccess, onFailure, onAllFinished);
  });
};

module.exports = Crawler;