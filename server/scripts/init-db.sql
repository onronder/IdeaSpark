-- Create additional databases if needed
CREATE DATABASE ideaspark_dev;
CREATE DATABASE ideaspark_test;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE ideaspark_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE ideaspark_test TO postgres;

-- Enable extensions on ideaspark_dev
\c ideaspark_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable extensions on ideaspark_test
\c ideaspark_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";