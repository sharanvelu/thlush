import {neon} from '@neondatabase/serverless';

export const NeonService = {
  getClient: () => {
    return neon(process.env.DATABASE_URL!);
  },
};
