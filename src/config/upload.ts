import { resolve } from 'path';

import multer from 'multer';

const tmp = resolve(__dirname, '..', '..', 'tmp');

export default {
  dir: tmp,
  storage: multer.diskStorage({
    destination: tmp,
    filename(request, file, callback) {
      return callback(null, file.originalname);
    },
  }),
};
