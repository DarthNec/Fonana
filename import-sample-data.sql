-- Импорт реальных данных из Supabase в локальную PostgreSQL
-- Выполните: psql "postgresql://fonana_user:fonana_password@localhost:5432/fonana" -f import-sample-data.sql

-- Очищаем таблицы
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE posts CASCADE;
TRUNCATE TABLE users CASCADE;

-- Вставляем пользователей
INSERT INTO users (id, nickname, "fullName", wallet, "createdAt", "updatedAt") VALUES 
('cmbv53b7h0000qoe0vy4qwkap', 'fonanadev', 'Fonana Developer', 'npzAZaN9fDMgLV63b3kv3FF8cLSd8dQSLxyMXASA5T4', '2025-06-13 18:26:59.838', '2025-07-09 02:28:58.444'),
('cmbv5ezor0001qoe08nrb9ie7', 'Dogwater', 'DGWTR', 'DUxkXhMWuo76ofUMtFRZtL8zmVqQnb8twLeB5NcaM4cG', '2025-06-13 18:36:04.78', '2025-06-19 18:25:12.963'),
('cmbvbb1e50004qoso8yvbd4ri', 'CryptoBob', 'CryptoBob', 'Dwguur6T76wFpsXkzD9CxNFMnLQ1QxcyafMGkkDpQKsb', '2025-06-13 21:20:58.061', '2025-06-23 19:34:49.746'),
('cmbvbhqig000dqosofkgoocof', 'ihavecam', 'ihavecam', 'EEqsmopVfTuaiJrh8xL7ZsZbUctckY6S5WyHYR66wjpw', '2025-06-13 21:26:10.553', '2025-06-30 17:12:20.409'),
('cmbvbp1os000hqoso8035109x', 'EasySloth', 'User HfzA...ahp2', 'HfzAHqKK6PYexHqExFNHWnksCojB6AsbFUqYNNouahp2', '2025-06-13 21:31:51.628', '2025-06-19 18:09:56.72'),
('cmbvepbbb0000qoc10tbl0078', 'BettyPoop', 'BettyPoop', 'BqD9rEUyJHgJFhB8tPuuYd9QFQ4GHt8JBJgus41EUjRz', '2025-06-13 22:56:02.951', '2025-06-20 04:01:18.175'),
('cmbvffs2y0000qojofs8mj5u1', 'billyonair', 'BillyOnAir', '4s7hB86Sc2c3xM4eZZtXh3RePF1zUohZ1ALdjKtC6WW2', '2025-06-13 23:16:37.739', '2025-06-19 18:10:07.151'),
('cmbvimbd80002qo1ttm0tc8rl', 'OldMan', 'Oldi', '38iXgzD7hHu7KKkvjrTDLBgCxsaq5tuWt1iJExaRKzFq', '2025-06-14 00:45:41.516', '2025-06-19 18:10:00.161'),
('cmbvpwubh0000qopgm0qygr14', 'it-whore2', 'it-whore2', 'GKocvWuZjSLeukTmBQNpsv8hLERxHzR3UKTajdnk76aq', '2025-06-14 04:09:49.95', '2025-06-19 18:10:25.947'),
('cmbvrce6i0002qowpjh5yhlkm', 'yourdad', 'Abobua', '13Y8KYmEViwkmWyUN3qM2TSw2WbBDuLmsewjapY4pCGz', '2025-06-14 04:49:55.146', '2025-06-19 18:26:15.781');

-- Вставляем посты
INSERT INTO posts (id, title, type, "creatorId", "createdAt", "updatedAt") VALUES
('cmbv6i0to0000real1', '👀 MVP = Mostly Valuable Prototype', 'video', 'cmbv53b7h0000qoe0vy4qwkap', '2025-06-13 18:37:23.033', '2025-06-19 05:07:56.746'),
('cmbv82txa0001qo13gxurkfe1', '🛠️ Hour 1 Report: Only Crashed Twice 🚀', 'image', 'cmbv53b7h0000qoe0vy4qwkap', '2025-06-13 19:50:36.287', '2025-06-17 14:59:23.055'),
('cmbvb8yjl0003qosolrsk9s3c', 'Rug Society', 'image', 'cmbv5ezor0001qoe08nrb9ie7', '2025-06-13 21:19:21.058', '2025-06-22 10:09:53.586'),
('cmbvbg7pu000cqosoufi6ragh', 'Bybit is a scam', 'image', 'cmbvbb1e50004qoso8yvbd4ri', '2025-06-13 21:24:59.538', '2025-06-13 23:23:15.692'),
('cmbvbl01u000gqosoy2ufypdg', 'Oh yaeahh', 'image', 'cmbvbhqig000dqosofkgoocof', '2025-06-13 21:28:42.883', '2025-06-13 23:23:11.324'),
('cmbvbujy0000kqosokw7nheym', 'Traveling ', 'image', 'cmbvbp1os000hqoso8035109x', '2025-06-13 21:36:08.568', '2025-06-13 23:36:11.466'),
('cmbver0e60004qoc1w32eu2hq', 'Sui 80s', 'image', 'cmbvepbbb0000qoc10tbl0078', '2025-06-13 22:57:22.11', '2025-06-13 22:57:22.11'),
('cmbvf729c0008qoc16wgqht3q', 'Sui 80s', 'image', 'cmbvepbbb0000qoc10tbl0078', '2025-06-13 23:09:51.024', '2025-06-13 23:09:51.024'),
('cmbvfnni70004qojodmo250zo', 'PalGirls', 'image', 'cmbvffs2y0000qojofs8mj5u1', '2025-06-13 23:22:45.055', '2025-06-14 00:51:48.955'),
('cmbvfq40d000jqojosbe1zbyv', 'Linda 80s', 'image', 'cmbvepbbb0000qoc10tbl0078', '2025-06-13 23:24:39.757', '2025-06-24 04:48:01.004');

-- Выводим статистику
SELECT 'Импорт завершен!' as status;
SELECT COUNT(*) as users_imported FROM users;
SELECT COUNT(*) as posts_imported FROM posts; 