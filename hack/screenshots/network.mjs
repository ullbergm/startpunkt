// A stand-in for the network the demo services would be on, so that the
// availability probes have something to talk to. Startpunkt reaches it as
// its HTTPS proxy:
//
//   - a host under example.com is answered by a local TLS server with a
//     self-signed certificate, which a probe counts as available, unless
//     it is listed in DOWN, which is refused and so unavailable;
//   - any other host (the icon API) is passed through to the real one.
//
//   node network.mjs <proxy port> <cert.pem> <key.pem>
import { readFileSync } from 'node:fs';
import { createServer as createHttp } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { connect } from 'node:net';

const [port, cert, key] = process.argv.slice(2);
const DOWN = new Set(['backup.example.com', 'prometheus.staging.example.com']);

const services = createHttps({ cert: readFileSync(cert), key: readFileSync(key) }, (_, res) => res.end('ok\n'));
services.listen(0, '127.0.0.1');

const proxy = createHttp((_, res) => res.writeHead(405).end());
proxy.on('connect', (req, client, head) => {
  const [host, target] = req.url.split(':');
  if (DOWN.has(host)) return client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
  const local = host === 'example.com' || host.endsWith('.example.com');
  const upstream = connect(local ? services.address().port : Number(target), local ? '127.0.0.1' : host, () => {
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    upstream.write(head);
    upstream.pipe(client).on('error', () => {});
    client.pipe(upstream).on('error', () => {});
  });
  upstream.on('error', () => client.destroy());
  client.on('error', () => upstream.destroy());
});
proxy.listen(Number(port), '127.0.0.1');
