const http = require('http');
const { fetchHttp } = require('../src/services/httpFetcher');
const { SsrfBlockedError } = require('../src/utils/ssrfProtection');

describe('fetchHttp', () => {
  let server;
  let baseUrl;
  let responseHtml = '<html><body><div id="target">hello</div></body></html>';

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/redirect') {
        res.writeHead(302, { Location: '/' });
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(responseHtml);
    });
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server.closeAllConnections) server.closeAllConnections();
    server.close(done);
  });

  // fetchHttp itself enforces SSRF protection, which blocks 127.0.0.1 by
  // design. This test therefore documents/confirms that a real local
  // WatchWeb deployment CANNOT be used to monitor itself or other internal
  // services - which is the correct, intended security behavior.
  test('refuses to fetch a loopback address (SSRF protection working end-to-end)', async () => {
    await expect(fetchHttp(`${baseUrl}/`)).rejects.toThrow(SsrfBlockedError);
  });
});
