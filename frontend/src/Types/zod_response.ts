import { z } from "zod";

export const LibUserSchema = z.object({
  id: z.string(),
  role: z.union([z.literal("admin"), z.literal("user")]),
  name: z.string(),
  img: z.string(),
  createdAt: z.string(),
  likeCnt: z.number(),
  forkCnt: z.number(),
});

export const LibWordSetDisplaySchema = z.object({
  id: z.string(),
  title: z.string(),
  authorID: z.string(),
  wordCnt: z.number(),
  createdAt: z.string(),
  updatedAt: z.number(),
});

export const FeedBackCard_ZOD = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  formattedCreatedAt: z.string(),
});

export const HomePageWordSet_ZOD = z.object({
  id: z.string(),
  title: z.string(),
  authorID: z.string(),
  wordCnt: z.number(),
});

export const Word = z.object({
  id: z.string(),
  order: z.number(),
  vocabulary: z.string(),
  definition: z.string(),
  vocabularySound: z.string(),
  definitionSound: z.string(),
  star: z.boolean(),
});

export const WordSetCard = z.object({
  id: z.string(),
  title: z.string(),
  authorID: z.string(),
  updatedAt: z.number(),
  shouldSwap: z.boolean(),
  wordCnt: z.number(),
  likes: z.number(),
});
