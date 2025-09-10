INSERT INTO users (username, email, full_name, auth_id) 
VALUES ('scottring', 'smkaufman@gmail.com', 'Scott Kaufman', 'b852546e-8be7-46e4-b2c2-09b223821d5c')
ON CONFLICT (email) 
DO UPDATE SET 
    username = EXCLUDED.username,
    auth_id = EXCLUDED.auth_id;