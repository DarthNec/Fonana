-- Импорт постов с полным содержимым
-- psql "postgresql://fonana_user:fonana_password@localhost:5432/fonana" -f import-posts-fixed.sql

-- Вставляем посты с содержимым
INSERT INTO posts (id, title, content, type, "creatorId", "createdAt", "updatedAt") VALUES
('cmbv6i0to0000real1', '👀 MVP = Mostly Valuable Prototype', 'Hi, I''m the dev.\nFonana just dropped — like a newborn giraffe. It''s standing. It''s wobbly. But damn, it''s alive.\n\nRight now, it''s like OnlyFans met Craigslist in a dark alley and they decided to vibe.\nEverything kinda works. Some stuff breaks. That''s showbiz, baby.\n\n✅ Your link is your power — every visitor who comes through your profile gets tied to you for 7 days.\n🤝 Bring the weirdos, the lurkers, the masked legends.\n📸 Post anything. Even cursed images. Especially cursed images.\n\nIt''s early. It''s raw. It''s fun.\nAnd if you find bugs? That''s called feature exploration mode.\n\nWelcome to Fonana.\n#NoShame #JustTaste #BetaAndProud #FonanaDev', 'video', 'cmbv53b7h0000qoe0vy4qwkap', '2025-06-13 18:37:23.033', '2025-06-19 05:07:56.746'),

('cmbv82txa0001qo13gxurkfe1', '🛠️ Hour 1 Report: Only Crashed Twice 🚀', 'We''ve been live for a whole hour now.\nFonana has already broken two times — which, honestly, is better than expected.\n\nBut don''t worry, captain''s still on deck.\nI''m hotpatching faster than a crypto dev during a rugpull.\nIf it breaks again… it builds character.\n\nStay weird, keep posting, and if you see a bug — name it and shame it.\nI''m watching everything like a raccoon in a server room.', 'image', 'cmbv53b7h0000qoe0vy4qwkap', '2025-06-13 19:50:36.287', '2025-06-17 14:59:23.055'),

('cmbvb8yjl0003qosolrsk9s3c', 'Rug Society', 'We live in a rug society', 'image', 'cmbv5ezor0001qoe08nrb9ie7', '2025-06-13 21:19:21.058', '2025-06-22 10:09:53.586'),

('cmbvbg7pu000cqosoufi6ragh', 'Bybit is a scam', 'We know it isnt it?', 'image', 'cmbvbb1e50004qoso8yvbd4ri', '2025-06-13 21:24:59.538', '2025-06-13 23:23:15.692'),

('cmbvbl01u000gqosoy2ufypdg', 'Oh yaeahh', 'Yummi!!!', 'image', 'cmbvbhqig000dqosofkgoocof', '2025-06-13 21:28:42.883', '2025-06-13 23:23:11.324');

-- Проверяем результат
SELECT COUNT(*) as posts_imported FROM posts;
SELECT nickname, COUNT(p.id) as post_count 
FROM users u 
LEFT JOIN posts p ON u.id = p."creatorId" 
GROUP BY u.id, u.nickname 
ORDER BY post_count DESC;

SELECT 'Посты успешно импортированы!' as status; 