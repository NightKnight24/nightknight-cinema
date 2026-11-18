import { handleFetch } from './server.js';

export default {
  async fetch(request) {
    return handleFetch(request);
  }
};
