#!/bin/bash
export DATABASE_URL="postgresql://neondb_owner:npg_35jrENAMfdny@ep-divine-glitter-aoj0xlcg-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
exec node ./node_modules/next/dist/bin/next dev -p 3000 2>&1 | tee /home/z/my-project/dev.log
