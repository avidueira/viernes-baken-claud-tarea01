import * as functions from 'firebase-functions';

interface HelloNameQueryRequest {
  name?: string;
}

export const helloNameHandler = functions.https.onRequest((request, response) => {
  const data = request.query as HelloNameQueryRequest;
  if (!data.name) {
    response.send('No name query parameter provided, can\'t say hello to you :c');
    // Probably we should start responding in JSON format and the correct http error code, as follows:
    // response.status(400).json({
    //   message: 'No name query parameter provided, can\'t say hello to you :c',
    //   code: '01'
    // }).send();
    return;
  }
  // Other validations
  response.send(`Hello ${data.name}!`);
});
