import { bootstrap } from '../dist/main';

let server;

export default async function handler(req, res) {
  if (!server) {
    server = await bootstrap();
  }
  return server(req, res);
}
