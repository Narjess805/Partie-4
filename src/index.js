import { createApp } from "./app.js";
import { createPgContactRepository } from "./repositories/contactRepository.js";

const port = process.env.PORT || 4000;
createApp({ contactRepository: createPgContactRepository() }).listen(port, () =>
  console.log(`API sur :${port}`)
);
