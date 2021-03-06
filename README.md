js-crawler
==========

Web crawler for Node.JS, both HTTP and HTTPS are supported.

## Installation

```
npm install js-crawler
```

## Usage

The crawler provides intuitive interface to crawl links on web sites. Example:

```javascript
var Crawler = require("js-crawler");

new Crawler().configure({depth: 3})
  .crawl("http://www.google.com", function onSuccess(page) {
    console.log(page.url);
  });
```

The call to `configure` is optional, if it is omitted the default option values will be used.

`onSuccess` callback will be called for each page that the crawler has crawled. `page` value passed to the callback will contain the following fields:

* `url` - URL of the page
* `content` - body of the page (usually HTML)
* `status` - the HTTP status code

Extra information can be retrieved from the rest of the `page` fields: `error`, `response`, `body` which are identical to the ones passed to the callback of `request` invocation of the [Request](https://github.com/mikeal/request) module.

#### Options-based API

Alternative APIs for passing callbacks to the `crawl` function.

```javascript
var Crawler = require("js-crawler");

var crawler = new Crawler().configure({ignoreRelative: false, depth: 2});

crawler.crawl({
  url: "https://github.com",
  success: function(page) {
    console.log(page.url);
  },
  failure: function(page) {
    console.log(page.status);
  },
  finished: function(crawledUrls) {
    console.log(crawledUrls);
  }
});
```

#### Handling errors

It is possible to pass an extra callback to handle errors, consider the modified example above:

```javascript
var Crawler = require("js-crawler");

new Crawler().configure({depth: 3})
  .crawl("http://www.google.com", function(page) {
    console.log(page.url);
  }, function(response) {
    console.log("ERROR occurred:");
    console.log(response.status);
    console.log(response.url);
  });
```

Here the second callback will be called for each page that could not be accessed (maybe because the corresponding site is down). `status` may be not defined.

#### Knowing when all crawling is finished

Extra callback can be passed that will be called when all the urls have been crawled and crawling has finished.
All crawled urls will be passed to that callback as an argument.

```javascript
var Crawler = require("js-crawler");

new Crawler().configure({depth: 2})
  .crawl("http://www.google.com", function onSuccess(page) {
    console.log(page.url);
  }, null, function onAllFinished(crawledUrls) {
    console.log('All crawling finished');
    console.log(crawledUrls);
  });
```

#### Limiting the rate at which requests are made

By default the maximum number of HTTP requests made per second is 100, but this can be adjusted by using the option `maxRequestsPerSecond` if one wishes not to use too much of network or, opposite, wishes for yet faster crawling.

```javascript
var Crawler = require("js-crawler");

var crawler = new Crawler().configure({maxRequestsPerSecond: 2});

crawler.crawl({
  url: "https://github.com",
  success: function(page) {
    console.log(page.url);
  },
  failure: function(page) {
    console.log(page.status);
  }
});
```

With this configuration only at most 2 requests per second will be issued. The actual request rate depends on the network speed as well, `maxRequestsPerSecond` configures just the upper boundary.

`maxRequestsPerSecond` can also be fractional, the value `0.1`, for example, would mean maximum one request per 10 seconds.

#### Forgetting crawled urls

By default a crawler instance will remember all the urls it ever crawled and will not crawl them again. In order to make it forget all the crawled urls the method `forgetCrawled` can be used. There is another way to solve the same problem: create a new instance of a crawler.

#### Supported options

* `depth` - the depth to which the links from the original page will be crawled.
Example: if `site1.com` contains a link to `site2.com` which contains a link to `site3.com`, `depth` is 2 and we crawl from `site1.com` then we will crawl `site2.com` but will not crawl `site3.com` as it will be too deep. 

The default value is `2`.

* `ignoreRelative` - ignore the relative URLs, the relative URLs on the same page will be ignored when crawling, so `/wiki/Quick-Start` will not be crawled and `https://github.com/explore` will be crawled. This option can be useful when we are mainly interested in sites to which the current sites refers and not just different sections of the original site.

The default value is `false`.

* `userAgent` - User agent to send with crawler requests.

The default value is `crawler/js-crawler`

* `shouldCrawl` - function that specifies whether an url should be crawled, returns `true` or `false`.

* `maxRequestsPerSecond` - the maximum number of HTTP requests per second that can be made by the crawler

Example:

```javascript
var Crawler = require("js-crawler");

var crawler = new Crawler().configure({
  shouldCrawl: function(url) {
    return url.indexOf("reddit.com") < 0;
  }
});

crawler.crawl("http://www.reddit.com/r/javascript", function(page) {
  console.log(page.url);
});
```

Default value is a function that always returns `true`.

## License

MIT License
(c) [Anton Ivanov](http://smthngsmwhr.wordpress.com/)

Credits
---------------

The crawler depends on the following Node.JS modules:

* [Underscore.js]
* [Request]

[Underscore.js]: http://underscorejs.org/
[Request]: https://github.com/mikeal/request