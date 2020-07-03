import * as functions from 'firebase-functions';

export const helloWorldHandler = functions.https.onRequest((request, response) => {
  response.send("Hello World!");
});
