-- CreateTable
CREATE TABLE "avatar_counter" (
    "id" SERIAL NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 148,
    "total_avatars" INTEGER NOT NULL DEFAULT 250,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avatar_counter_pkey" PRIMARY KEY ("id")
);

-- Инициализируем счетчик (148 аватаров уже использовано)
INSERT INTO "avatar_counter" (id, counter, total_avatars) 
VALUES (1, 148, 250)
ON CONFLICT (id) DO NOTHING;
